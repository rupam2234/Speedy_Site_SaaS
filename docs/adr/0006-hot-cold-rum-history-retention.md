# ADR-0006: Hot and Cold RUM History Retention

> **Status:** Accepted
> **Date:** 2026-11-25
> **Decision-Makers:** Core Engineering Team
> **Supersedes:** None
> **Superseded By:** None

---

## 1. Context

The RUM dashboard currently reads live canonical pageviews for its history
chart. Keeping every raw pageview indefinitely would grow storage and query
cost without improving the daily performance track record. The legacy
`rum_history_new` table is not a valid cold tier because it has no current
writer and its production contents diverge from live canonical facts.

A two-tier design must preserve detailed diagnostics for recent performance
work while keeping long-term history compact. It must also avoid deriving
percentiles from previously summarized percentiles, which is mathematically
invalid.

## 2. Decision Drivers

- Preserve the daily Web Vitals track record with minimal long-term storage.
- Preserve raw pageview facts and bounded evidence for a recent diagnostic window.
- Keep history reads fast and index-aware.
- Support late-arriving observations without double counting.
- Keep raw cleanup service-role-only and bounded.
- Make retention semantics explicit for customers and operators.

## 3. Considered Alternatives

### Alternative A: Retain Raw Rows Indefinitely

**Pros:** Full historical drill-down at every granularity.
**Cons:** Unbounded storage, larger indexes, and slower aggregate reads.
**Rejected because:** it does not align storage cost with the focused product.

### Alternative B: Keep Only the Existing `rum_history_new` Projection

**Pros:** Very small storage.
**Cons:** The table is stale, has no current writer, and is not reproducible from
its summarized contents.
**Rejected because:** it cannot be trusted as a source of truth.

### Alternative C: Keep Raw Rows and Read Them for All History

**Pros:** One source of truth and no snapshot consistency problem.
**Cons:** Query and storage costs grow with the full retention period.
**Rejected because:** it does not provide the intended storage optimization.

### Alternative D: Recent Raw Rows Plus Correct Daily Cold Snapshots (Chosen)

**Pros:** Recent data remains fully diagnosable, old performance history remains
compact, and the reader has a predictable hot/cold boundary.
**Cons:** A snapshot contract and refresh process are required. Historical
element-level drill-down is unavailable after the raw window unless derived
issue evidence is retained separately.
**Chosen because:** it matches the focused WordPress performance workflow and
minimizes long-term storage without sacrificing recent diagnostics.

## 4. Decision Outcome

**Chosen Option: retain raw canonical pageviews for 7 complete UTC days and
maintain cold daily metric snapshots for older track-record history.**

### 4.1 Hot Tier

- Keep raw `rum_metrics` rows for the most recent 7 complete UTC days.
- Serve detailed dashboard and diagnostic readers from this tier.
- Snapshot a UTC day only after its late-arrival grace period closes.
- Never delete a raw day until its corresponding cold snapshot is complete and
  verified.

### 4.2 Cold Tier

- Store one daily snapshot per domain, UTC day, device, and metric.
- Store sample counts and the percentile set required by the dashboard.
- Build snapshots from raw metric facts, not from existing percentile summaries.
- Upsert snapshots idempotently so retries cannot create duplicates.
- Treat snapshots as immutable after finalization except for an explicit
  correction process.

### 4.3 Reader Contract

- Read raw facts for days inside the 7-day hot window.
- Read cold snapshots for older days.
- Use a half-open boundary so no day is read from both tiers.
- Preserve the existing dashboard response shape and lowercase metric keys.
- Return explicit unavailable states when a requested historical granularity
  is no longer retained.

### 4.4 Diagnostic Retention

- Raw pageview evidence remains available for 7 complete UTC days.
- Long-lived customer issue records must persist their own bounded derived
  evidence when the diagnostic finding is created.
- Aggregate history must not be presented as a replacement for old element-level
  evidence.

## 5. Privacy and Cardinality Rules

- Cold snapshots contain no URLs, session identifiers, user agents, or raw events.
- Device categories remain coarse.
- Metric values and sample counts remain bounded numeric facts.
- Snapshot keys are domain, UTC day, device category, and metric name.

## 6. Consequences

### Positive

- Long-term storage becomes predictable and compact.
- Recent work retains complete diagnostic evidence.
- Dashboard reads have a stable hot/cold boundary.
- Late arrivals can be handled before finalization.
- Raw cleanup cannot be invoked anonymously.

### Negative and Mitigations

- **Historical drill-down loss:** mitigated by retaining derived evidence on
  customer issue records and documenting the 7-day raw window.
- **Snapshot drift:** mitigated by idempotent upserts, finalization markers,
  parity checks, and a correction process.
- **Boundary complexity:** mitigated by one reader function and integration
  tests covering dates on both sides.
- **Percentile reconstruction errors:** mitigated by computing cold snapshots
  only from raw facts.

## 7. Implementation and Verification Boundaries

The implementation sequence, phase gates, and progress log belong in:

`docs/plans/2026-11-25_022436_rum_hot_cold_history_retention.md`

## 8. References

- Product goals: `docs/GOALS.md`
- Focused RUM retirement: `docs/adr/0005-focused-rum-dashboard-and-data-retirement.md`
- Compact telemetry: `docs/adr/0004-compact-rum-telemetry-and-rag-knowledge-model.md`
- Analytics pipeline: `docs/systems/analytics-pipeline.md`
