# Production RUM Storage Optimization

> **Achievement date:** 2026-11-25
> **System:** Speedy Site real-user monitoring (RUM)
> **Stack:** Next.js, TypeScript, Supabase PostgreSQL, Cloudflare Workers
> **Impact:** Reduced the production `rum_metrics` footprint from approximately 111 MB to 10.2 MB

## Achievement summary

I audited the production RUM storage model and found that a small live dataset
was consuming 111 MB, primarily because an obsolete GIN index on the legacy
`events` JSON column had accumulated approximately 101 MB of bloat.

I verified that the supported dashboard and diagnostic readers no longer
depended on JSONB containment searches, removed the unused index through a
reviewed migration, and confirmed that the production table footprint fell to
approximately 10.2 MB without deleting telemetry or breaking supported readers.

## Quantified result

| Metric | Before | After | Improvement |
| --- | ---: | ---: | ---: |
| Total `rum_metrics` storage | ~111 MB | ~10.2 MB | ~100.8 MB reclaimed |
| Index storage | ~109 MB | ~7.5 MB | ~101.5 MB reclaimed |
| Table storage | ~2.6 MB | ~2.6 MB | No material change |
| Obsolete `events` GIN index | ~101 MB | 0 | Removed |
| Live RUM rows | Preserved | Preserved | No telemetry loss |

The result represents approximately a **91% reduction** in the total production
storage footprint for the table. The most important finding was not the number
of rows, but the mismatch between current query patterns and retained legacy
indexes.

## Technical investigation

### 1. Established the production baseline

I used Supabase's production database inspection tooling to measure the actual
table and index sizes. The baseline showed:

- `rum_metrics` table data: approximately 2.6 MB
- `rum_metrics` indexes: approximately 109 MB
- Total footprint: approximately 111 MB
- Live rows: approximately 60

This ruled out ordinary table growth as the main problem.

### 2. Identified the bloat source

The database bloat inspection attributed approximately 101 MB of wasted space
to `idx_rum_resource_summary`, a GIN index on the legacy `events` JSON column.
A second index on `domain_name, session_id, created_at` accounted for roughly
5.2 MB of bloat.

The largest index had only 18 recorded scans, while the active
`domain_name, created_at` index had no recorded scans during the inspection
window. The storage cost was therefore disproportionate to the current query
workload.

### 3. Verified dependency safety before removal

I did not remove the index based on its name or size alone. I traced every
JSONB containment predicate and confirmed that:

- Canonical RUM readers use typed fact columns such as `fcp_ms`, `lcp_ms`,
  `cls_value`, `inp_ms`, and `ttfb_ms`.
- Canonical diagnostic readers use bounded `diagnostic_evidence` with JSONPath.
- Historical fallback readers use JSONPath operations rather than the GIN
  containment operator.
- The supported `inp_elements` RPC had already been migrated to the canonical
  reader path.
- No supported application query required the obsolete containment index.


### 4. Removed the obsolete index safely

I added the monotonic migration:

[`supabase/migrations/20261125022142_drop_bloated_legacy_events_index.sql`](../../supabase/migrations/20261125022142_drop_bloated_legacy_events_index.sql)

```sql
DROP INDEX IF EXISTS public.idx_rum_resource_summary;
```

The migration was applied to the linked production database. Dropping the index
released allocated index pages without deleting table rows or telemetry facts.

### 5. Validated behavior after the change

The following production readers were called after the migration:

| Reader | HTTP status | Rows returned |
| --- | ---: | ---: |
| `get_rum_history` | 200 | 3 |
| `inp_elements` | 200 | 22 |
| `get_lcp_image_metrics` | 200 | 4 |

The live row count remained intact during the verification. The repository test
suite, TypeScript typecheck, lint, and production build also passed.

## Engineering decisions

### Preserve data before optimizing storage

The optimization did not depend on deleting telemetry. That distinction is
important because the RUM dataset is the evidence source used to diagnose
WordPress performance problems. The result came from removing redundant
database overhead, not reducing product capability.

### Verify the reader path, not just the index

Removing an index is only safe when the query contract is understood. I
validated the complete supported reader set and added a regression test that
requires the cleanup migration to remain in the repository.

### Separate immediate cleanup from future retention design

The audit also revealed that the legacy materialized history table was stale
and that the old raw cleanup function was insecurely exposed. I addressed the
security issue immediately and disabled raw deletion until a verified cold
snapshot layer exists.

The long-term design is documented in:

- [ADR-0006: Hot and Cold RUM History Retention](../adr/0006-hot-cold-rum-history-retention.md)
- [RUM Hot and Cold History Retention Plan](../plans/2026-11-25_022436_rum_hot_cold_history_retention.md)

This separates proven optimization work from a future retention policy instead
of combining them into a risky migration.

## Related security improvement

During the same production audit, I found that the legacy
`delete_old_rum_metrics()` function retained default public execution grants.
The anonymous PostgREST role could invoke the raw-row cleanup function.

I remediated the exposure through monotonic migrations that:

1. Revoked execution from `PUBLIC`, `anon`, and `authenticated`.
2. Restricted execution to `service_role`.
3. Batched deletion operations.
4. Disabled deletion entirely until every deleted day has a verified cold
   snapshot.

The related migrations are:

- [`20261125021531_secure_and_batch_rum_retention.sql`](../../supabase/migrations/20261125021531_secure_and_batch_rum_retention.sql)
- [`20261125023115_disable_raw_cleanup_until_cold_snapshots.sql`](../../supabase/migrations/20261125023115_disable_raw_cleanup_until_cold_snapshots.sql)

Anonymous invocation now returns HTTP 401, and service-role invocation is
blocked until the snapshot safety gate is implemented.


## Resume-ready bullets

### Concise

- Reduced production RUM database storage from **111 MB to 10.2 MB**, reclaiming
  approximately **101 MB** by auditing PostgreSQL index bloat and safely
  retiring an obsolete GIN index while preserving all telemetry and dashboard
  behavior.

### Technical

- Diagnosed and achieved a **91% production storage reduction** in a Next.js
  and Supabase RUM platform, traced the waste to a stale 101 MB JSONB GIN
  index, verified that canonical readers no longer depended on it, and
  validated the migration with production RPC probes, 73 automated tests,
  typechecking, linting, and a full build.

### Security and reliability

- Hardened a production RUM retention pipeline by closing an anonymously
  callable database cleanup function, adding service-role-only execution,
  introducing batched deletion, and blocking raw deletion until verified cold
  snapshots exist.

### Interview summary

> I audited a production RUM table where only about 60 live rows consumed 111
> MB. The source was not data growth but 101 MB of obsolete index bloat. I
> traced every legacy JSON query, confirmed that the supported canonical reader
> path did not need the index, removed it through a reviewed migration, and
> reduced the footprint to 10.2 MB with no telemetry loss or reader regressions.
> The same audit uncovered and closed an anonymously callable cleanup function.

## Repository links

- [Analytics pipeline architecture](../systems/analytics-pipeline.md)
- [Impact log](../IMPACT-LOG.md)
- [RUM traffic-cycle baseline](rum-traffic-cycle-baseline-2026-11-24.json)
- [Live RUM dashboard reader tests](../../tests/rum-dashboard-live-reader.test.mjs)
- [Focused RUM dashboard retirement ADR](../adr/0005-focused-rum-dashboard-and-data-retirement.md)

## Git history

The implementation is recorded in the local commit:

```text
7623a8d fix(rum): secure retention and reclaim index bloat
```

The commit contains the production migrations, regression coverage, retention
architecture, and implementation plan. The GitHub permalink can be added after
this branch is pushed and the commit is available from the remote repository.

## Verification evidence

- `pnpm test`: 73 tests passed, 0 failed
- `pnpm run typecheck`: passed
- `pnpm run lint`: passed with pre-existing React hook warnings
- `pnpm run build`: passed
- `git diff --check`: passed
- Production history, INP elements, and LCP image readers: HTTP 200
- Production `rum_metrics` footprint after optimization: approximately 10.2 MB
