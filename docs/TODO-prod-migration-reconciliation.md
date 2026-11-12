# TODO: Production Database Migration Reconciliation

> **Status:** Pending Decision / Action before Production Push
> **Branch:** `feature/admin-wiring`
> **Created:** 2026-11-11

---

## 1. Context

To make fresh local Supabase bootstrapping (`npx supabase start` / `supabase db reset`) and Docker Compose setups work cleanly from an empty database, the following changes were introduced:

- Added `supabase/migrations/20240101000000_base_schema.sql` (creates pre-2025 base tables with `IF NOT EXISTS`, plus legacy `plan_metadata`, `subscriptions`, `one_time_orders`, and `subscription_with_limit` gated behind `user_services` not existing).
- Added `supabase/migrations/20261111000001_system_settings.sql` (creates `public.system_settings` and seeds `auto_assignment_enabled`).
- Added `supabase/migrations/20261111000002_utilization_pick_next_expert.sql` (updates `public.pick_next_expert()` to rank by utilization ratio).
- Enabled `[db.seed]` in `supabase/config.toml` and updated `supabase/seed.sql` with local test users, orders, experts, and notifications.

---

## 2. Production Impact Analysis

Running `supabase/migrations/20240101000000_base_schema.sql` will **not** drop or overwrite existing production tables or rows, and `supabase/seed.sql` only runs locally (unless `--include-seed` is explicitly passed to `supabase db push`). However, keeping `20240101000000_base_schema.sql` in `supabase/migrations/` as-is introduces two migration tooling issues on production:

1. **Out-of-order migration error (`supabase db push`)**
   - `20240101000000` has a timestamp earlier than migrations already applied on production (`20250101000000+`).
   - `supabase db push` rejects out-of-order local files by default unless `--include-all` is passed or the version is repaired in remote migration history.

2. **Re-creates an intentionally dropped index (`idx_orders_user_id`)**
   - Line 26 of `supabase/migrations/20240101000000_base_schema.sql` executes `CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);`.
   - `supabase/migrations/20261024000002_drop_redundant_indexes.sql` (line 10) intentionally dropped `idx_orders_user_id`.
   - Executing `20240101000000_base_schema.sql` against production (via `supabase db push --include-all` or `scripts/run-migration.js`) would re-create that redundant index.

---

## 3. Action Checklist (Choose Option 1 or Option 2)

### Option 1 (Recommended): Keep local bootstrap automatic and repair prod history
- [x] Update `supabase/migrations/20240101000000_base_schema.sql` to remove `CREATE INDEX IF NOT EXISTS idx_orders_user_id ...` (or move it inside the `IF NOT EXISTS (... table_name = 'user_services')` fresh-DB guard).
- [x] Mark the baseline migration as applied on the linked production database without executing it:
  ```bash
  npx supabase migration repair --status applied 20240101000000
  ```
- [x] Preview pending remote migrations:
  ```bash
  npx supabase db push --dry-run --linked
  ```
- [ ] Apply new feature migrations (`20261111000001_system_settings.sql`, `20261111000002_utilization_pick_next_expert.sql`) to production:
  ```bash
  npx supabase db push --linked
  ```

### Option 2: Keep `supabase/migrations/` strictly incremental for production
- [ ] Move `supabase/migrations/20240101000000_base_schema.sql` outside `supabase/migrations/` (for example `supabase/local_base_schema.sql`).
- [ ] Update local setup/reset workflow (for example `Makefile` / `docker-compose.yml`) to apply `local_base_schema.sql` before running `supabase/migrations/*.sql` on fresh local databases.
- [ ] Preview and apply `20261111000001_system_settings.sql` to production via `npx supabase db push --linked`.

---

## 4. Post-Deploy Verification on Production

- [ ] Confirm `public.system_settings` exists and contains `key = 'auto_assignment_enabled'`.
- [ ] Confirm `idx_orders_user_id` was **not** re-created on `public.orders`:
  ```sql
  SELECT indexname FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'idx_orders_user_id';
  ```
- [ ] Confirm `npx supabase migration list --linked` shows local and remote migration histories aligned.
