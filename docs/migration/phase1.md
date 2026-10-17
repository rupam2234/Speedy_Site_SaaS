## Migration Phase 1: Database (Week 1)

### ✅ Completed Tasks
1. **Create migration SQL file**
2. **Run migration on the staging Supabase instance**
3. **Verify data integrity** – 11 services migrated, 6 subscriptions ➜ 11 `user_services`
4. **Update types** – hand‑patched `src/lib/db/database.types.ts` to include `user_services`; full `supabase gen types` regeneration pending
5. **TypeScript build** – all type errors fixed, build passed
6. **Snapshot** – tag `migration-db-v1`
7. **Free‑tier migrations** (`20261011000001–4`) applied to staging (2026‑10‑11)
8. **Production deployment** (2026‑10‑17) – all 8 migrations verified as already applied to production (data inspection confirmed: `user_services` present with 16 rows, enum `free` added, constraints/triggers/views in place); migration history reconciled via `supabase migration repair --status applied`
9. **Regenerate types** – `database.types.ts` regenerated from production via `supabase gen types`; `OneTimeOrders` type removed from `src/app/api/helpers/dataTypes.ts`; `next build` passes
10. **Snapshot for production** – tag `migration-db-prod-v1` created on commit `727cf6f` (production migration reconciliation + regenerated types) and pushed to origin (2026-10-17)

### Pending Tasks
- ~~(Optional) Run existing tests on staging against the migrated schema~~ **Done (2026-10-17)** — see Notes below.

### Notes
- Types are now fully generated from the production database; dropped tables (`subscriptions`, `plan_metadata`, `one_time_orders`) no longer appear in the type definitions.
- **Staging schema verification (2026-10-17)**: REST probe against staging (`tmpvygehhshrgsqxzaty`) confirmed `user_services` returns 16 rows, views `cloudflare_kv_tracking` (2 rows) and `v_cf_zone_per_site` exist, and RPC `get_daily_web_metrics` returns live data. No migration regressions found.
- **Existing worker tests**: both Cloudflare worker suites (`analytics-cron`, `traffic-source-cron`) fail 2 snapshot tests each — stale `wrangler init` "Hello World!" scaffold tests that predate the workers' API-secret auth (workers now correctly return `Unauthorized`). Pre-existing, unrelated to the migration; the Next.js app itself has no test suite. Fixing these scaffold tests is out of Phase 1 scope.
