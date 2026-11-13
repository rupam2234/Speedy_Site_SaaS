## Migration Phase 1: Database (Week 1)

### 📋 Overview & Objectives
Transition the data storage layer from recurring Stripe `subscriptions` to one-time entitlement-based `user_services`. Drop obsolete schema artifacts, backfill user profiles, introduce the free service tier, establish admin/expert pool structures, and regenerate TypeScript types.

---

### ✅ Completed Tasks & Execution Logs

1. **Schema Migration & Data Transition**
   - Created core migration SQL replacing `subscriptions`, `plan_metadata`, and `one_time_orders` with `user_services`.
   - Verified data integrity on staging: 11 services migrated, 6 subscriptions successfully transitioned into 11 `user_services` records.
   - Dropped obsolete tables (`subscriptions`, `plan_metadata`, `one_time_orders`).

2. **Free-Tier Migrations Applied to Staging (2026-10-11)**
   - Applied via direct SQL execution (`scripts/apply-pending-migrations.js`):
     | File | Changes Introduced |
     |---|---|
     | `20261011000001_free_service_tier_schema.sql` | Added enum value `free` to `service_type_enum`; made `user_services.website_name` nullable. |
     | `20261011000002_free_service_tier_backfill.sql` | Backfilled missing user profiles; granted free services for existing service-less accounts (5 free services, 11/11 profiles). |
     | `20261011000003_free_service_tier_constraints.sql` | Added unique free-service index per user; created `handle_new_user()` trigger for automated signup provisioning. |
     | `20261011000004_free_site_hard_limit.sql` | Added partial unique index on `orders` enforcing hard cap of 1 free site per user account. |

3. **Production Deployment & History Reconciliation (2026-10-17)**
   - Verified all 8 migrations already active on production database (16 rows in `user_services`, enum `free`, views and constraints active).
   - Reconciled migration history on Supabase CLI:
     ```bash
     supabase migration repair --status applied 20250101000000 20250101000001 20250101000002 20261011000001 20261011000002 20261011000003 20261011000004
     ```
   - Created and pushed production snapshot tag: `migration-db-prod-v1` on commit `727cf6f`.

4. **Admin Console & Expert Management Groundwork (2026-10-22 / 2026-10-23)**
   - Added role `expert`, tables `experts_pool` and `order_assignments`, RLS policies, and capacity-aware round-robin routing function `pick_next_expert()` via `20261022000001_admin_expert_management.sql`.
   - **Repair applied 2026-10-23**: Initial function call failed with `42703 column e.active_load does not exist`. Fixed via follow-up migration `20261023000001_fix_pick_next_expert.sql` (never edited applied migrations in place).
   - Functional verification: Empty pool returned `null`; available expert advanced round-robin position (`0` → `1` → `2`); test expert cleanly cascade-deleted.
   - Reference: `docs/DESIGN-admin-expert-management.md`.

5. **Type Generation & TypeScript Build Validation**
   - Regenerated `src/lib/db/database.types.ts` directly from production schema (`supabase gen types typescript`).
   - Removed legacy `OneTimeOrders` from `src/app/api/helpers/dataTypes.ts`.
   - Deleted obsolete root `db.types.ts`.
   - TypeScript build passed with zero errors (`next build`).

---

### 🔍 Verification & Audit Queries

Run against staging / production to audit table parity and counts:
```sql
-- 1. Verify counts and service types
SELECT service_type, COUNT(*) 
FROM user_services 
GROUP BY service_type;

-- 2. Verify views and RPC functions
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('cloudflare_kv_tracking', 'v_cf_zone_per_site', 'services_with_domains');

-- 3. Verify pick_next_expert routing
SELECT * FROM pick_next_expert('managed_wp');
```

---

### 🏷️ Snapshot Tags
* `migration-db-v1`: Initial staging database migration snapshot.
* `migration-db-prod-v1`: Production migration reconciliation snapshot (`727cf6f`).
