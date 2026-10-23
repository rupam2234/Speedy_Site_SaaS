# DESIGN: Admin Console & Service Expert Management

> **Status:** Draft v1 · **Owner:** Speedy Site · **Last updated:** 2026-10-22
> **Scope:** Admin-side console at `/admin` for inviting and managing service experts; experts authenticate via existing login flow with `userRole: expert`. Read with `docs/GOALS.md`, `docs/RESTRUCTURE-PLAN.md`, and `docs/DESIGN-managed-wp-order-assignment.md`.

---

## Problem

The managed-WP service channel needs a dedicated admin workspace where admins can:
- Invite service experts by email (creates Supabase auth user + `profiles.role = 'expert'`)
- Manage expert pool (capacity, availability, round-robin cursor)
- View all managed-WP orders with assignment status
- Reassign, force-assign, skip, or close orders
- Experts log in through the **existing** `/sign-in` flow; their `profiles.role = 'expert'` gates what they see (only their assigned orders)

Today the `profiles` table already uses `role ∈ { "user", "admin" }` (tickets module). We extend it to `"expert"` and build the admin console on top of the assignment foundation in `docs/DESIGN-managed-wp-order-assignment.md`.

---

## Current Architecture (reuse)

| Asset | Location | Reusable? |
|---|---|---|
| `profiles` table | `id, email, role` | ✅ extend role values, add CHECK constraint |
| `orders` table | `order_id, user_id, website_name, order_status, …` | ✅ assignment target |
| `order_assignments` / `experts_pool` | per `DESIGN-managed-wp-order-assignment.md` | ✅ Phase 1 tables |
| Supabase Auth | `auth.users` + `profiles` trigger | ✅ expert onboarding = create user + profile row |
| Ticket system role gating | `/api/tickets/*` server-side `profiles.role` check | ✅ copy pattern for `/api/admin/*` |
| Next.js App Router + dashboard layout | `/(dashboard)/dashboard/**` | ✅ new `/admin/**` routes under same layout |

---

## Role Model (extends existing)

```text
role ∈ { "user" | "admin" | "expert" }
```

| Role | Capabilities |
|---|---|
| `admin` | Full `/admin` console: all orders, expert pool CRUD, unassigned queue, reassign/force-assign/skip/close |
| `expert` | Sees **only** orders assigned to them (`expert_id = auth.uid()`); can accept/start/complete/reassign-request |
| `user` | Unchanged — customer dashboard only |

**Enforcement**
- Server-side: every `/api/admin/*` route fetches `profiles.role` for the session user and rejects non-admins (same as `/api/tickets/*`).
- Database: RLS policies. Experts `select`/`update` only `order_assignments` where `expert_id = auth.uid()`. Admins via `profiles.role = 'admin'`. Customers have no access to assignment tables.
- Add `CHECK (role IN ('user','admin','expert'))` on `profiles.role`.

**Expert onboarding flow (admin action)**
1. Admin enters email in `/admin/experts` → `POST /api/admin/experts/invite`
2. Server calls `supabase.auth.admin.createUser({ email, email_confirm: true })`
3. Trigger inserts `profiles` row with `role = 'expert'`
4. Server inserts `experts_pool` row (default capacity 10, `is_available = true`, `rr_position = 0`)
5. Expert receives magic-link / password-set email from Supabase; signs in at `/sign-in`
6. Middleware (existing) reads `profiles.role` → expert lands on `/dashboard/expert/orders` (new route)

---

## Data Model (from `DESIGN-managed-wp-order-assignment.md`, summarized)

### `order_assignments`
```sql
id uuid PK
order_id uuid FK → orders.order_id
expert_id uuid FK → profiles.id (role = 'expert')
status text -- pending | accepted | in_progress | completed | skipped | reassigned
assigned_at timestamptz
accepted_at timestamptz NULL
completed_at timestamptz NULL
assigned_by uuid FK → profiles.id (admin) or 'system' sentinel
skip_reason text NULL
is_active bool -- exactly one active row per order (partial unique index)
```

### `experts_pool`
```sql
expert_id uuid PK FK → profiles.id
capacity int DEFAULT 10
active_load int -- derived count of active assignments
is_available bool DEFAULT true
rr_position bigint -- monotonically increasing cursor
last_assigned_at timestamptz NULL
-- future: skills text[]
```

---

## Admin Console Routes (under `/(dashboard)/dashboard/`)

| Route | Purpose |
|---|---|
| `/admin/orders` | Table of all managed-WP orders: site, customer, plan, assigned expert, status, age. Filters: unassigned / overdue / by expert. |
| `/admin/orders/:id` (drawer) | Assignment history timeline + actions: **Reassign**, **Force assign**, **Skip**, **Close**. |
| `/admin/experts` | Expert pool: availability toggle, capacity, active-load bars, reset RR cursor. **Invite expert** button → modal with email input. |
| `/admin/queue` | Unassigned orders needing attention. Poll or Supabase Realtime. |
| `/expert/orders` | Expert view: same table filtered to `expert_id = me` (mirrors tickets admin/user pattern). |

All routes guarded by middleware → server-side role check → 403 if mismatch.

---

## API Routes (all verify `profiles.role` server-side)

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/experts/invite` | POST | Create auth user + profile(role=expert) + pool row; send invite email |
| `/api/admin/experts` | GET | List pool with capacity/load/cursor |
| `/api/admin/experts/:id` | PATCH | Toggle `is_available`, update `capacity`, reset `rr_position` |
| `/api/admin/orders` | GET | Paginated, filterable list for admin table |
| `/api/admin/orders/:id/assign` | POST | Auto round-robin (or manual `expert_id` for force-assign) |
| `/api/admin/orders/:id/reassign` | POST | Deactivate current, append new assignment |
| `/api/admin/orders/:id/skip` | POST | Mark skipped with mandatory `skip_reason` |
| `/api/admin/orders/:id/status` | PATCH | Expert/admin status transitions |
| `/api/admin/queue` | GET | Unassigned orders list |
| `/api/expert/orders` | GET | Expert's assigned orders (role=expert only) |
| `/api/expert/orders/:id/status` | PATCH | Expert transitions (accept, start, complete, request-reassign) |

---

## Round-Robin Assignment (capacity-aware, from assignment design)

> Pick eligible expert with **lowest `rr_position`** where `is_available = true AND active_load < capacity`; increment that expert's `rr_position`.

- Atomic pick via Postgres function using `SELECT … FOR UPDATE SKIP LOCKED` inside a transaction.
- No eligible expert → order enters **Unassigned Queue**; admin notified (email + Realtime badge on `/admin/queue`).
- Reassignment = insert new `order_assignments` row, set `is_active=false` on prior row (audit trail preserved).

---

## Phased Implementation Plan

| Phase | Deliverables | Notes |
|---|---|---|
| **1** | SQL migration: `order_assignments`, `experts_pool`, role CHECK, RLS policies; RR Postgres function; hook auto-assign into `managed/add` success path | Foundation (see assignment design) |
| **2** | Admin console UI (`/admin/orders`, detail drawer, `/admin/experts` with invite modal) + admin API routes | Visible control |
| **3** | Expert view (`/expert/orders`) + expert API routes | Expert workflow |
| **4** | Unassigned queue + Realtime alerts + SLA auto-reassign cron | Reliability |
| **5** | Skills-based routing, workload dashboards, assignment analytics | Nice-to-have |

### Acceptance Criteria (Phase 2)
- Admin can invite an expert by email; expert receives invite, signs in, lands on `/expert/orders`.
- Admin sees all orders in `/admin/orders` with correct assignment status.
- Admin can reassign/force-assign/skip/close from order drawer; history preserved.
- Non-admin users get 403 on all `/api/admin/*` and `/admin/*` routes.
- Expert sees only their orders; cannot access other experts' orders or admin routes.

---

## Secrets & Config

| Secret | Where | Purpose |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + Wrangler (already rotated) | Admin API calls `auth.admin.createUser` |
| `ADMIN_INVITE_REDIRECT_URL` | Vercel | Where the magic link lands (e.g. `/sign-in?invite=1`) |

No new worker secrets; all admin/expert logic runs in Next.js API routes.

---

## Rollout Order (no disruption)

1. Run SQL migration (Phase 1 tables, RLS, RR function).
2. Deploy admin API routes + expert API routes (behind feature flag if desired).
3. Deploy `/admin/**` and `/expert/**` UI routes.
4. Invite first expert → verify end-to-end sign-in + order visibility.
5. Enable auto-assign hook in `managed/add` success path.
6. Monitor unassigned queue; add SLA cron in Phase 4.

---

## Open Decisions

1. **Invite expiration**: Supabase magic links expire in 24h by default; configurable?
2. **Password vs magic link**: Current login flow uses email/password; should expert invite use magic link or password-set flow?
3. **Notification channel**: Email only, or also in-app Realtime badge on `/admin/queue`?
4. **SLA timeout**: 24h default for expert accept before auto-reassign? Configurable per expert?
5. **Skill-based routing**: Add `skills text[]` to `experts_pool` now or later (Phase 5)?

---

## Related Docs

- `docs/DESIGN-managed-wp-order-assignment.md` — assignment data model, RR algorithm, Phase 1 SQL
- `docs/GOALS.md` — product loop, principles
- `docs/RESTRUCTURE-PLAN.md` — Phase 5 service channel integration