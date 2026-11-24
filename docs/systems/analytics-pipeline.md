# Generic Analytics Pipeline Retirement

> **Status:** Retired by ADR-0005
> **Owner:** Speedy Site
> **Last updated:** 2026-11-24

The former generic Analytics pipeline mirrored `rum_metrics` aggregates into
Cloudflare D1 through `analytics-cron` and `traffic-source-cron`. It served
Trace, generic Analytics, and Global UX dashboards that did not support the
focused WordPress performance optimization product.

## Retired Topology

The following components no longer have repository source or application
callers:

- `src/app/(dashboard)/dashboard/rum/analytics/**`
- `src/app/(dashboard)/dashboard/rum/trace/**`
- `src/app/(dashboard)/dashboard/rum/ux/**`
- `src/app/api/rum/analytics/**`
- `src/app/api/network-and-server/**`
- `cloudflare-workers/analytics/**`
- `src/lib/analytics/workers.ts`
- `recent_requests`, `traffic_source`, `get_daily_web_metrics`,
  `user_happiness_dist`, and `ux_map_data` SQL readers

Cloudflare Enhancements cache-rule UI and exclusive APIs were also retired.
Cloudflare account connection APIs remain because Settings uses them for token
status, validation, and revocation.

## Current Topology

Retained RUM readers query Supabase directly. Canonical version 2 rows use
typed facts and bounded `diagnostic_evidence`; historical rows retain a
temporary legacy event fallback. New v2 rows no longer produce the legacy
`events` projection. The retained product surfaces are Web Vitals, Page Groups,
Images, and Fonts.

## Verification

- `pnpm run build` confirms retired routes are absent from the Next.js route
  manifest.
- `pnpm test` verifies retired readers have no application callers.
- `docs/reports/rum-events-reader-inventory.md` records retained and retired
  reader classifications.
- Production verification on 2026-11-24 executed all 12 retained reader RPCs
  successfully, confirmed all 5 retired RPCs were absent, and compared 60
  typed-versus-legacy metric values across 17 v2 rows with zero mismatches.
- The physical `rum_metrics.events` column drop remains a separately approved
  destructive migration after a full traffic-cycle comparison.
