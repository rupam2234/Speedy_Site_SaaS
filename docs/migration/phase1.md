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

### Pending Tasks
- Snapshot for production – tag `migration-db-prod-v1`
- (Optional) Run existing tests on staging against the migrated schema

### Notes
- Types are now fully generated from the production database; dropped tables (`subscriptions`, `plan_metadata`, `one_time_orders`) no longer appear in the type definitions.
