# RUM Hot and Cold History Retention

> **Status:** 🔴 INCOMPLETE / PLANNED
> **Created:** 2026-11-25 02:24:36 UTC
> **Updated:** 2026-11-25 02:24:36 UTC
> **Related ADR:** [ADR-0006](../adr/0006-hot-cold-rum-history-retention.md)
> **Prerequisite:** ADR-0005 focused RUM dashboard and data retirement

## 1. Objective

Implement a two-tier RUM history model with 7 complete UTC days of raw
pageview facts and correctly generated daily cold snapshots for older
performance history. Preserve the current dashboard response shape, prevent
double counting, and make raw cleanup safe and service-role-only.

## 2. Architecture

```text
Collector
  -> canonical rum_metrics hot tier (7 complete UTC days)
       -> daily snapshot builder
            -> cold daily metric snapshots
       -> detailed hot readers

Dashboard history reader
  -> raw aggregation for hot dates
  -> cold snapshots for older dates
```

The raw and cold readers use a half-open date boundary. Snapshot creation is
idempotent and runs only after the UTC day and its late-arrival grace period
have closed. Raw deletion is blocked until snapshot parity succeeds.

## 3. Implementation Phases

### Phase 1: Secure Existing Retention

- [x] Revoke anonymous, authenticated, and public execution of raw cleanup.
- [x] Restrict cleanup execution to `service_role`.
- [x] Batch deletions in groups of 5,000 rows.
- [x] Remove the obsolete bloated GIN index on `events`.
- [x] Disable raw deletion until verified cold snapshots exist.
- [x] Verify supported readers after the index removal.

### Phase 2: Define Cold Snapshot Schema

- [ ] Add a daily snapshot table keyed by domain, UTC day, device, and metric.
- [ ] Store sample counts and required percentiles as numeric columns.
- [ ] Add finalization and correction metadata.
- [ ] Add foreign keys, indexes, constraints, and restricted grants.
- [ ] Regenerate generated database types through `make types`.

### Phase 3: Build Snapshot Function

- [ ] Aggregate canonical and historical facts from raw rows only.
- [ ] Compute percentiles from raw metric observations.
- [ ] Upsert snapshots idempotently by snapshot key.
- [ ] Exclude incomplete days until the grace period closes.
- [ ] Restrict execution to service-role-only callers.

### Phase 4: Implement Hot and Cold Reader

- [ ] Define one UTC-day ownership boundary.
- [ ] Read raw facts for hot days.
- [ ] Read finalized snapshots for cold days.
- [ ] Preserve the existing response shape and lowercase metric keys.
- [ ] Add explicit unavailable handling for unsupported historical detail.
- [ ] Test boundary dates in both UTC directions.

### Phase 5: Safe Retention Execution

- [ ] Add a scheduled snapshot process.
- [ ] Add snapshot parity verification before raw deletion.
- [ ] Delete only raw days with verified finalized snapshots.
- [ ] Keep cleanup service-role-only and batched.
- [ ] Record operational metrics and structured errors.

### Phase 6: Migration and Verification

- [ ] Backfill or explicitly archive existing historical days.
- [ ] Compare hot and cold responses across representative days and devices.
- [ ] Verify no URL, session, user agent, or raw event enters the cold tier.
- [ ] Run `make check`, `pnpm run typecheck`, `pnpm test`, and `pnpm run build`.
- [ ] Document rollback and production deployment steps.

## 4. Verification Gate

- No historical day is returned by both hot and cold readers.
- Every deleted raw day has a verified cold snapshot.
- Snapshot percentiles match direct raw aggregation within the documented
  rounding contract.
- Retries are idempotent and do not change snapshot counts.
- Anonymous and authenticated clients cannot execute cleanup or snapshot
  functions.
- Recent raw diagnostics remain available for 7 complete UTC days.
- Long-lived issue evidence remains available after raw deletion.

## 5. Production Rollout Rules

- Add the schema before adding snapshot writers.
- Backfill and verify snapshots before enabling raw deletion.
- Enable cleanup only after a complete UTC traffic cycle passes parity.
- Do not modify the raw retention window without a superseding ADR.
- Keep the physical `rum_metrics.events` removal blocked pending separate
  approval.

## 6. Progress Log

### 2026-11-25 02:24:36 UTC

- Audited `feedingnature.com` production data in read-only mode.
- Confirmed `rum_history_new` is stale: 7 missing device/metric groups, 1 extra
  group, and 17 value mismatches against live canonical aggregation.
- Confirmed `rum_metrics` had 60 live rows and about 111 MB total storage, with
  about 101 MB wasted in `idx_rum_resource_summary`.
- Applied `20261125021531_secure_and_batch_rum_retention.sql` and verified
  anonymous cleanup invocation now returns HTTP 401.
- Applied `20261125022142_drop_bloated_legacy_events_index.sql`, reducing total
  `rum_metrics` storage to about 10.2 MB.
- Verified history, INP elements, and LCP image readers return HTTP 200 with
  production rows after the index removal.
- Authored ADR-0006 for the hot and cold history model.
