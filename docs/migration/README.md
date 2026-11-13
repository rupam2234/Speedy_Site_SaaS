# Migration Tracker: Subscription → Service Model

Master tracker, progress dashboard, and engineering runbook for transitioning Speedy Site from recurring Stripe subscriptions to a one-time service model ($299 Managed WordPress) with an automated free tier.

---

## 📊 Executive Progress Dashboard

| Phase | Component | Status | Key Deliverables & Tags | Phase Docs |
|---|---|---|---|---|
| **Phase 1** | Database Foundation | ✅ **Complete** | Dropped legacy tables, added `user_services`, enum `free`, DB repair. Tags: `migration-db-v1`, `migration-db-prod-v1` | [phase1.md](./phase1.md) |
| **Phase 2** | Cloudflare Workers | ✅ **Complete** | Retired `sub-kv-metadata`, deployed `site-metadata`, KV rebound, `event-buffer` validated. Tags: `migration-workers-subkv-deleted`, `migration-event-buffer-refactored` | [phase2.md](./phase2.md) |
| **Phase 3** | API Routes & Auth | ✅ **Complete** | `/api/checkout` (Stripe one-time), `/api/webhook/stripe`, cookie auth gate, IDOR fixes, 410s on old routes. | [phase3.md](./phase3.md) |
| **Phase 4** | Email Templates | ✅ **Complete** | Retired `subscriptionCreated`, updated `renewalSuccess`, added `newManagedOrder`. | [phase4.md](./phase4.md) |
| **Phase 5** | UI & Billing | 🟨 **In Progress** | Deleted `/account/subscription`, direct RLS `validatePlan()`. Replacement billing UI pending. | [phase5.md](./phase5.md) |
| **Phase 6** | Dashboard Data Layer | ⬜ **Pending** | Repoint telemetry & site lists from subscription models to `user_services` views. | [phase6.md](./phase6.md) |
| **Phase 7** | Types Cleanup | ✅ **Complete** | `database.types.ts` regenerated from live schema; dead root `db.types.ts` & `OneTimeOrders` deleted. | [phase7.md](./phase7.md) |
| **Phase 8** | Automation & Cron | 🟨 **Partial** | Retired `.github/workflows/usage_update.yml`. Cloudflare native cron integration pending. | [phase8.md](./phase8.md) |
| **FT** | Free Tier & Limits | ✅ **Complete** | Auto-provisioning trigger `handle_new_user()`, 1-site limit enforced at DB & API levels. | [phase1.md](./phase1.md) / [phase3.md](./phase3.md) |
| **Admin** | Expert Console | ✅ **Complete** (DB/API) | Schema, RLS, capacity-aware round-robin `pick_next_expert()`, admin routes live. | [phase1.md](./phase1.md) |

---

## 📋 High-Level Master Checklist

- [x] **1. Database Foundation** ([phase1.md](./phase1.md))
  - [x] Schema migration applied on staging & production (`user_services`, `free` enum, dropped `subscriptions`)
  - [x] Free-tier schema, triggers, backfill, and 1-site hard caps applied
  - [x] Admin console & expert pool tables and round-robin function deployed & repaired
  - [x] Migration history reconciled on Supabase CLI (`supabase migration repair --status applied`)

- [x] **2. Cloudflare Workers** ([phase2.md](./phase2.md))
  - [x] Code deleted for `sub-kv-metadata` worker; live CF worker retired
  - [x] KV namespace preserved and rebound to `SITE_METADATA`
  - [x] `site-metadata` worker deployed and seeded (9 active Managed WP domains)
  - [x] `event-buffer` domain validation updated to read `SITE_METADATA`; live ingestion verified (202 / 403)

- [x] **3. API Routes & Security** ([phase3.md](./phase3.md))
  - [x] Unified checkout route `POST /api/checkout` (Stripe payment mode, $299 one-time)
  - [x] Idempotent Stripe webhook `POST /api/webhook/stripe` provisioning `managed_wp` (1 year, site limit 1)
  - [x] Legacy subscription routes deleted / returning HTTP 410 Gone
  - [x] Cookie-based auth gate (`/api/account/auth`) replacing legacy JWT (`jose`) subscription check
  - [x] Entitlement quotas & IDOR fix on `/api/orders/*` routes

- [x] **4. Email Templates** ([phase4.md](./phase4.md))
  - [x] Deprecated `subscriptionCreated` transactional email
  - [x] Updated `renewalSuccess` copy for yearly managed service renewals
  - [x] Configured `newManagedOrder` notification on one-time checkout

- [ ] **5. UI & Billing** ([phase5.md](./phase5.md))
  - [x] Deleted obsolete `/account/subscription` pages and recurring billing controls
  - [x] Implemented client-side plan display via RLS `validatePlan()`
  - [ ] Build replacement billing history & license expiry UI

- [ ] **6. Dashboard Data Layer** ([phase6.md](./phase6.md))
  - [ ] Repoint dashboard charts and metrics to `user_services` and `cloudflare_kv_tracking`
  - [ ] Connect admin queue views to live expert assignments

- [x] **7. Types Cleanup** ([phase7.md](./phase7.md))
  - [x] Regenerated `src/lib/db/database.types.ts` from live schema (including expert tables)
  - [x] Deleted dead root `db.types.ts` and legacy subscription helper types
  - [x] TypeScript build verified passing (`next build`)

- [ ] **8. Automation & Cron** ([phase8.md](./phase8.md))
  - [x] Retired obsolete `.github/workflows/usage_update.yml`
  - [ ] Migrate usage metering to native Cloudflare Worker scheduled alarms

---

## 🔄 Safe De-integration Pattern (Per Component)

```
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH COMPONENT TO REMOVE:                              │
├─────────────────────────────────────────────────────────────┤
│  1. CREATE replacement (new code) alongside old             │
│  2. DEPLOY replacement to STAGING                           │
│  3. TEST replacement thoroughly                             │
│  4. SWITCH traffic (feature flag or route change)           │
│  5. VERIFY production works with new code                   │
│  6. DELETE old code                                         │
│  7. COMMIT with message: "remove X — replaced by Y"         │
│  8. TAG: git tag migration-<component>-removed              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Safety Rules

| Rule | Why |
|---|---|
| **Never delete before replacement works on staging** | Rollback is instant |
| **One component per PR** | Easy bisect if something breaks |
| **Tag after each major step** | Rapid rollback of specific components via Git tags |
| **Keep old API routes returning 410 with message** | External callers get clear error, not 500 crashes |
| **Feature flag new checkout** | `NEXT_PUBLIC_NEW_CHECKOUT=true` allows instant UI toggling |
| **Run full test suite after each tag** | Catch regressions immediately |

---

## 🌿 Git Branching Strategy

```
main
  ├── migration/db-foundation          (Phase 1)
  │     ├── migration/db-foundation-staging-test
  │     └── migration/db-foundation-prod
  ├── migration/workers-refactor       (Phase 2)
  ├── migration/api-checkout-webhook   (Phase 3)
  ├── migration/ui-billing             (Phase 4-5)
  └── migration/cleanup                (Phase 6-8)
```

**Merge order**: `db-foundation` → `workers-refactor` → `api-checkout-webhook` → `ui-billing` → `cleanup`

---

## 🚨 Emergency Rollback Procedures

### 1. Database Rollback
```bash
# Revert Supabase migration
supabase migration revert --project-id <prod-project-id>

# Revert database types
git checkout migration-db-v1 -- src/lib/db/database.types.ts

# Redeploy workers / APIs that depend on previous schema
git checkout migration-db-v1 -- cloudflare-workers/event-buffer/src/index.js
vercel --prod
```

### 2. Cloudflare Worker Rollback
```bash
wrangler deploy --env production cloudflare-workers/event-buffer --tag migration-event-buffer-refactored
```

### 3. API Rollback (Vercel)
```bash
vercel rollback <deployment-url> --token $VERCEL_TOKEN
```

---

## 📑 Detailed Phase Documentation Index

For deep-dive technical logs, SQL tables, verification outputs, and commit histories, refer to the individual phase documents:
* [Phase 1: Database Foundation & Admin Tables](./phase1.md)
* [Phase 2: Cloudflare Workers & KV Binding](./phase2.md)
* [Phase 3: API Routes, Auth Gate & Free Tier Security](./phase3.md)
* [Phase 4: Email Notifications & Order Alerts](./phase4.md)
* [Phase 5: UI & Billing Interface](./phase5.md)
* [Phase 6: Dashboard Data Layer](./phase6.md)
* [Phase 7: TypeScript Types Reconciliation](./phase7.md)
* [Phase 8: Automation & Background Jobs](./phase8.md)
