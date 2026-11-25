# Generic Analytics Pipeline Retirement

> **Status:** Retired by ADR-0005
> **Owner:** Speedy Site
> **Last updated:** 2026-11-25
> **Planned successor:** [ADR-0007 evidence-first issue diagnosis](../adr/0007-evidence-first-issue-diagnosis-and-grounded-remediation.md)

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
`events` projection. The Web Vitals history reader aggregates the normalized
canonical and historical metric facts directly, so the dashboard does not wait
for a materialized history refresh before showing newly collected traffic. The
retained product surfaces are Web Vitals, Page Groups, Images, and Fonts.

Raw cleanup is service-role-only and disabled until every deleted day has a
verified cold snapshot. The obsolete GIN index on `rum_metrics.events` was
removed because retained readers use typed canonical facts and historical
JSONPath fallbacks, not JSONB containment searches. Production storage for
`rum_metrics` fell from about 111 MB to 10.2 MB.

The legacy `rum_history_new` projection is not a current source of truth. A
production comparison found 7 missing device/metric groups, 1 extra group,
and 17 value mismatches against the live canonical aggregation. The current
reader therefore bypasses it. Any future cold-history tier must be rebuilt
from raw canonical facts with an explicit snapshot contract.

The Web Vitals distributions reader also bypasses the legacy
`rum_daily_distributions` projection. It reads the same canonical and
historical raw metric facts as the history reader, using an explicit UTC
date range. This prevents canonical rows with an empty `events` array from
being omitted from distribution counts.

Repository-defined legacy readers with no supported application caller are
retired by `20261125025407_retire_unused_rum_readers.sql`. The stale
`rum_history_new`, `rum_daily_distributions`, and `rum_origin_hits_agg`
tables remain intact for now. Their physical removal requires a separate
dependency and data-retention audit. Production-only RPCs whose definitions
are absent from the repository are also outside this cleanup migration.

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
- The initial traffic-cycle baseline is recorded in
  `docs/reports/rum-traffic-cycle-baseline-2026-11-24.json`. The dataset covers
  only two calendar dates and has no retained canonical-only row after the
  cutover. Phase 7 therefore remains open pending at least seven complete UTC
  days of representative production traffic.
- The live collection path was revalidated end to end on 2026-11-24. The served
  collector matches the current Worker artifact byte for byte, the entitlement
  gate accepts the active managed domain and rejects an unknown domain, and a
  controlled v2 beacon persisted canonical facts with `events = []`. The
  synthetic verification row was deleted and confirmed absent.
- The Web Vitals history reader was migrated to normalized canonical facts on
  2026-11-25. Production and local API probes now return newly collected data
  through November 25 across desktop, mobile, and tablet, including the current
  LCP, FCP, TTFB, CLS, and INP samples. URL-provided managed sites also take
  precedence over stale session state on the dashboard.

## Implemented Issue Diagnosis Topology

ADR-0007 defines the successor to the retired generic analytics topology. The
first production slice keeps canonical telemetry and issue state in Supabase:

```text
Canonical RUM facts and bounded evidence
              |
              v
Service-role-only LCP v1 detector
              |
              v
Supabase issue documents and bounded evidence
              |
              +------> Customer Web Vitals panel
              |             |
              |             v
              |        Grounded customer assistance
              |             |
              v             v
Approved issue documents and curated fix playbooks
              |
              v
Cloudflare Worker and Vectorize
```

Detection is asynchronous and idempotent. Supabase issue documents are the
authoritative diagnosis and workflow record. Vectorize is an auxiliary
retrieval index over approved issue knowledge, never the source of truth. Raw
pageviews and contributor rows are not embedded.

The user-facing issue assistant runs in the Next.js application server. It
authorizes the canonical site, verifies the site's live `managed_wp`
entitlement, loads the published issue from Supabase, and then calls the
`issue-knowledge` Worker. The Worker embeds the question with Workers AI and
queries a 384-dimension cosine Vectorize index. Customer documents use the
tenant UUID as namespace and are filtered by `siteId`. Curated remediation
playbooks use a separate global namespace. Retrieved text is treated as
untrusted background and cannot override authoritative issue facts.


The implemented slice includes `rum_issue_documents`, `rum_issue_evidence`,
`wp_backend_tests`, and `rum_issue_history`. The `detect_lcp_issues_v1` RPC is
restricted to `service_role`, runs in shadow mode by default, and requires at
least five pageviews and three sessions for a recurring template, asset, target,
and device cohort. Existing RUM readers require an authenticated user and
resolve the submitted domain to an authoritative order before querying
privileged RPCs. Customer-owned sites, admin access, and actively assigned
expert sites are supported.

The implementation plan is
`docs/plans/2026-11-25_041449_evidence_first_issue_diagnosis_and_grounded_remediation.md`.