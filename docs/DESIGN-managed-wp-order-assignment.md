# Design Doc — Managed WordPress Orders: Admin Console & Round-Robin Expert Assignment

> **Status:** Draft v1 · **Owner:** Speedy Site · **Last updated:** 2026-09-15
> **Scope:** Admin-side planning & system design for assigning Managed WordPress orders to experts via round-robin. No implementation code — architecture, data model, flows, and phase plan.

---

## 1. Current System Status

Stack: **Next.js (App Router) + Supabase (Postgres) + Cloudflare Workers (cron/analytics)**.

### 1.1 What exists today

| Asset | Details | Reusable? |
|---|---|---|
| `profiles` table | `id, email, role` — role values currently `"user"` / `"admin"`, used by tickets module (`/api/tickets/*`, `/api/account/profile`) to branch UI server-side | ✅ **Yes — extend role values; no new auth table needed** |
| `orders` table | `order_id, user_id, website_name, website_address, order_status, order_date, report_email, usage_by_site, …` — one row per site/order, owned by a customer | ✅ The entity we attach assignments to |
| Managed WP flow | `POST /api/orders/managed/add` creates the order after one-time payment; `GET /api/orders/managed/validate` validates; `/(dashboard)/dashboard/managed-wp/status` shows status to the customer | ✅ Assignment hook plugs in right after validation |
| Ticket system | `sender_role`, admin vs user filtered views | ✅ Copy this proven pattern (server-side role fetch → filtered views) |
| Supabase Auth | Users in `auth.users`; admin identified via `profiles.role` | ✅ RLS can gate admin routes |

### 1.2 Gaps (what this design adds)

- No **assignment table** (who is working on which order, with history).
- No **expert role / expert pool** (capacity, availability, round-robin cursor).
- No **admin orders console** (all orders, reassign, force-assign, skip, unassigned queue).

---

## 2. Role Model

Reuse the existing `profiles.role` string column — do **not** add WP-style roles or a separate auth table.

```
role ∈ { "user" | "admin" | "expert" }
```

| Role | Capabilities |
|---|---|
| `admin` | Full orders console: view **all** managed WP orders, reassign, force-assign, skip, close orders; manage expert pool (capacity, availability); view unassigned queue |
| `expert` | Sees **only** orders assigned to them; can accept, start, complete, or request reassignment |
| `user` | Unchanged — customer dashboard as today |

**Enforcement rules**

- Server-side (API routes): every `/api/admin/*` route fetches `profiles.role` for the session user and rejects non-admins — same pattern already used in `/api/tickets/*`.
- Database-side: Supabase RLS policies. Experts may `select`/`update` only assignment rows where `expert_id = auth.uid()`; admins via a policy on `profiles.role = 'admin'`. Customers have no access to assignment tables at all.
- Add a CHECK constraint on `profiles.role` to protect against typos.

**Onboarding an expert:** create Supabase auth user → insert `profiles` row with `role='expert'` → insert `experts_pool` row.

---

## 3. Proposed Data Model

Only **2 new tables**; everything else is reused.

### 3.1 `order_assignments` — the heart of the feature

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `order_id` | uuid FK → `orders.order_id` | indexed |
| `expert_id` | uuid FK → `profiles.id` (role must be `expert`) | |
| `status` | enum/text | `pending` → `accepted` → `in_progress` → `completed`; plus `skipped`, `reassigned` |
| `assigned_at` | timestamptz | |
| `accepted_at` | timestamptz null | |
| `completed_at` | timestamptz null | |
| `assigned_by` | uuid FK → `profiles.id` | admin id, or `system` sentinel for auto-RR |
| `skip_reason` | text null | required when status = `skipped` |
| `is_active` | bool | exactly **one** active row per order (partial unique index) |

**Design principle — append, never mutate:** a reassignment inserts a *new* row and sets `is_active=false` on the previous one. This preserves a complete audit trail ("who touched this order, when, why") and enables fairness/workload reporting.

### 3.2 `experts_pool` — round-robin state

| Column | Type | Notes |
|---|---|---|
| `expert_id` | uuid PK FK → `profiles.id` | |
| `capacity` | int, default 10 | max concurrent active orders |
| `active_load` | int | derived count of active assignments (maintain via trigger or count query) |
| `is_available` | bool, default true | admin toggle: vacation / offboarding |
| `rr_position` | bigint | monotonically increasing cursor; RR = lowest position among eligible |
| `last_assigned_at` | timestamptz null | for reporting / tie-breaking |

Optional future column: `skills text[]` to route by expertise (e.g., server tuning vs plugin audits — pairs with `plan_metadata.wp_plugin_audits`).

### 3.3 ER snapshot

```
profiles (id, email, role) ─┬─< experts_pool (expert_id, capacity, is_available, rr_position)
                            ├─< order_assignments (expert_id, assigned_by)
orders (order_id, user_id, ─┴─< order_assignments (order_id, status, is_active)
        website_name, order_status)
one_time_orders / plan_metadata  ──(unchanged, feeds order creation)
```

### 3.4 Round-robin rule (capacity-aware)

> Pick the eligible expert with the **lowest `rr_position`**, where
> `is_available = true AND active_load < capacity`; then increment that expert's `rr_position`.

- Weighted variant (optional): `capacity` acts as the weight — higher-capacity experts stay under the cap longer and get picked relatively more often.
- **No eligible expert** → order goes to the **Unassigned Queue**; admin is notified. Never silently fail.
- **Concurrency:** wrap the pick in a Postgres function using `SELECT … FOR UPDATE SKIP LOCKED` inside a transaction, so two simultaneous orders can never be assigned the same "next" expert or double-increment the cursor.


---

## 4. Data Flow Diagrams

### 4.1 Level 0 (Context)

```
                  ┌──────────────┐
   order payload  │   Customer   │  status, site data
  ───────────────>│  (browser)   │<─────────────────
                  └──────┬───────┘
                         │ checkout / status poll
                         v
              ┌─────────────────────┐   assignment queue,
              │   Admin Console     │<── unassigned alerts,
              │  (Admin / Expert)   │──> reassign / skip actions
              └─────────┬───────────┘        ▲
                        │                    │ assigned orders,
        create order,   │  validate,         │ workload view
        payment         │  assign            │
                        v                    │
              ┌─────────────────────┐────────┘
              │  Round-Robin Engine │  (API route / PG function)
              └─────────┬───────────┘
                        │ read/write
                        v
              ┌─────────────────────┐
              │  Supabase Postgres  │  orders, profiles,
              │   (data stores)     │  order_assignments, experts_pool
              └─────────────────────┘
```

### 4.2 Level 1 (Assignment process)

```
[Customer] ──order payload──> P1: Create/Validate Order ──orders row──> (D1: orders)
                                          │ order_status = paid & validated
                                          v
                              P2: Auto-Assign (round robin)
                               │ reads (D2: experts_pool) — eligible & capacity ok
                               │ picks lowest rr_position
                               └──writes──> (D3: order_assignments, is_active=true)
                                            └──updates──> (D2: rr_position / active_load)
                                          │
                        ┌─────────────────┴──────────────────┐
                        v none free                          v assigned
              P3: Unassigned Queue ──alert──> [Admin]      P4: Notify Expert
                        │                                        │
                        v manual assign (admin)                  v
              P5: Reassign / Skip (admin override) ──writes──> (D3: history row)
                                                               [Expert] works order
                                                                         │
                                                                         v
                                              P6: Update Status (accepted → completed)
```

---

## 5. Order Lifecycle / Flow Diagram

```
Payment success (one_time_orders)
        │
        v
POST /api/orders/managed/add  →  orders row created (order_status = true)
        │
        v
GET /api/orders/managed/validate  OK
        │
        v
┌─ AUTO ROUND-ROBIN ─────────────────────────────────────┐
│ eligible = experts where available && load < capacity  │
│ pick lowest rr_position  →  increment cursor           │
└───────┬───────────────────────────┬────────────────────┘
        │ expert found              │ none available
        v                           v
 assignment(pending)          UNASSIGNED QUEUE ──admin assigns manually──┐
        │                                                              │
        v                                                              v
 expert ACCEPTS ──► IN_PROGRESS ──► COMPLETED ──► order closed (audit kept)
        │
        └── declines / SLA timeout (e.g. 24h) ──► AUTO-REASSIGN
                                                   next expert in RR
                                                   old row is_active = false
Admin overrides at any point:
  • Force assign (pick any expert, bypass RR)
  • Reassign (append new row, deactivate old)
  • Skip (requires skip_reason)
  • Close / cancel order
```

**State machine (assignment.status):**

```
pending ──accept──> accepted ──start──> in_progress ──complete──> completed
   │  │                                                  │
   │  └── decline/timeout ──> reassigned (new row)       └── admin close ──> skipped/closed
   └────── admin skip ──> skipped
```

---

## 6. Admin-Side UI (routes follow existing dashboard patterns)

All under `/(dashboard)/dashboard/`, role-guarded the same way as the tickets module.

| Route | Purpose |
|---|---|
| `/admin/orders` | Table of all managed WP orders: site, customer, plan, assigned expert, status, age. Filters: unassigned / overdue / by expert. |
| Order detail drawer | Assignment history timeline (from `order_assignments`) + actions: **Reassign**, **Force assign**, **Skip**, **Close**. |
| `/admin/experts` | Expert pool: availability toggle, capacity, active-load bars, reset RR cursor. Onboard expert (create user + `profiles.role='expert'` + pool row). |
| `/admin/queue` | Unassigned orders needing attention. Poll or Supabase Realtime. |
| Expert view | Same orders list filtered to `expert_id = me` — mirrors the existing tickets admin/user pattern. |

### API routes (all verify `profiles.role` server-side)

| Route | Purpose |
|---|---|
| `POST /api/admin/orders/assign` | Auto round-robin assignment (or manual `expert_id` for force-assign) |
| `POST /api/admin/orders/reassign` | Deactivate current assignment, append new one |
| `POST /api/admin/orders/skip` | Mark skipped with mandatory reason |
| `PATCH /api/admin/orders/:id/status` | Expert/admin status transitions |
| `GET/POST/PATCH /api/admin/experts` | Pool CRUD, availability, capacity |
| `GET /api/admin/queue` | Unassigned orders list |

---

## 7. Key Decisions & Edge Cases

1. **Reuse `profiles` for roles** — confirmed feasible; it already drives admin/user branching in tickets. Only change: allow `"expert"` values + CHECK constraint.
2. **Assignment = history, not mutation** — enables auditing and fairness reporting.
3. **RR fairness vs. skill** — start pure RR; add optional `skills` filter on the pool before applying RR later.
4. **SLA fallback** — expert doesn't accept within N hours → auto-reassign to next RR expert + notify admin. Implement via a scheduled job (Supabase cron / the existing Cloudflare analytics-cron worker pattern).
5. **Concurrency safety** — RR pick must be atomic (Postgres function + `FOR UPDATE SKIP LOCKED`).
6. **Expert offboarding** — set `is_available=false`; existing active assignments stay until completed or reassigned by admin.
7. **Notification** — reuse the email/report infrastructure (`report_email` pattern) and/or in-app Realtime badge on `/admin/queue`.
8. **Customers never see assignments** — RLS blocks the tables; customer status page keeps its current flow.

---

## 8. Phased Implementation Plan

| Phase | Deliverables | Notes |
|---|---|---|
| **1** | SQL migration: `order_assignments`, `experts_pool`, role CHECK, RLS policies; RR Postgres function; hook auto-assign into `managed/add` success path | Foundation |
| **2** | Admin console UI (`/admin/orders`, detail drawer, `/admin/experts`) + admin API routes | Visible control |
| **3** | Unassigned queue + Realtime alerts + SLA auto-reassign cron | Reliability |
| **4** | Skills-based routing, workload dashboards, assignment analytics | Nice-to-have |

### Acceptance criteria (Phase 1)
- New paid managed-WP order automatically receives an assignment to the eligible expert with lowest `rr_position`.
- Two concurrent order creations never receive the same "next" assignment atomically.
- Reassignment preserves prior rows with `is_active=false`.
- Non-admin/expert users get 403 on all assignment APIs.

Payment success (one_time_orders)
        │
        v
POST /api/orders/managed/add  →  orders row created (order_status = true)
        │
        v
GET /api/orders/managed/validate  OK
        │
        v
┌─ AUTO ROUND-ROBIN ─────────────────────────────────────┐
│ eligible = experts where available && load < capacity  │
│ pick lowest rr_position  →  increment cursor           │
└───────┬───────────────────────────┬────────────────────┘
        │ expert found              │ none available
        v                           v
 assignment(pending)          UNASSIGNED QUEUE ──admin assigns manually──┐
        │                                                              │
        v                                                              v
 expert ACCEPTS ──► IN_PROGRESS ──► COMPLETED ──► order closed (audit kept)
        │
        └── declines / SLA timeout (e.g. 24h) ──► AUTO-REASSIGN
                                                   next expert in RR
                                                   old row is_active = false
Admin overrides at any point:
  • Force assign (pick any expert, bypass RR)
  • Reassign (append new row, deactivate old)
  • Skip (requires skip_reason)
  • Close / cancel order
```

**State machine (assignment.status):**

```
pending ──accept──> accepted ──start──> in_progress ──complete──> completed
   │  │                                                  │
   │  └── decline/timeout ──> reassigned (new row)       └── admin close ──> skipped/closed
   └────── admin skip ──> skipped
```

