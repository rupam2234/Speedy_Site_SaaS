## Migration Phase 6: Dashboard Data Layer

### ⬜ In Progress & Pending Tasks
1. **Refactor dashboard data queries**
   - Repoint dashboard metrics, active site lists, and statistics queries away from legacy assumptions to `user_services` and consolidated views (`services_with_domains`, `v_cf_zone_per_site`).
2. **Entitlement-aware domain filtering**
   - Ensure domain views enforce the free tier cap (1 site) vs managed WP tier (multi-site entitlement).
3. **Admin dashboard integration**
   - Connect admin order assignments and queue views (`src/app/api/admin/**`) with expert pool metrics.
4. **Data layer smoke test**
   - Verify performance and zero-regression loading states across customer dashboards with mixed service tiers.

### Notes
* Read path optimizations from `docs/systems/analytics-pipeline.md` should be respected when binding telemetry cards.
* The Supabase database view `cloudflare_kv_tracking` and RPC `get_daily_web_metrics` provide verified data interfaces.
