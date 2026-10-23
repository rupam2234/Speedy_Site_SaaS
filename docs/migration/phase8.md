## Migration Phase 8: GitHub Actions & Background Jobs

### 🟨 Completed & Partial Tasks
1. **Retire `usage_update.yml`** (Completed)
   - Removed obsolete recurring GitHub Action workflow `.github/workflows/usage_update.yml`.
   - Deleted dead background endpoint that previously computed usage metrics against the deprecated `subscriptions` schema.
2. **Modernize CI workflow** (Completed)
   - `.github/workflows/ci.yml` retained and maintained for build/test verification.

### ⬜ Pending Tasks
1. **Cloudflare Worker usage metering cron**
   - Re-enable periodic telemetry sync and aggregate usage computation via Cloudflare Worker scheduled triggers (`site-metadata` / `event-buffer` alarms) rather than external GitHub Actions curls.
2. **Scheduled Admin SLA checks**
   - Add background cron for expert order assignment timeouts (unassigned orders alerting) once Phase 6 admin UI goes live.

### Notes
* Shifting background tasks from external GitHub Actions cron jobs to native Cloudflare scheduled triggers / Supabase Edge Functions provides tighter transaction consistency and eliminates external secret leakage risks.
