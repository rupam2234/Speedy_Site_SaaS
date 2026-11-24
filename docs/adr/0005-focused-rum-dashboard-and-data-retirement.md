# ADR-0005: Focused RUM Dashboard and Data Retirement

> **Status:** Accepted  
> **Date:** 2026-11-24  
> **Decision-Makers:** Core Engineering Team  
> **Supersedes:** None  
> **Superseded By:** None

---

## 1. Context

Speedy Site is a WordPress performance optimization service. Real user monitoring is evidence for diagnosing and fixing WordPress performance issues, not a general-purpose observability platform.

The current RUM dashboard still exposes Trace, generic Analytics, Global UX, and Cloudflare Enhancements. These surfaces require readers, APIs, analytics Workers, D1 mirrors, and legacy event parsing that are not necessary for the retained product loop. Keeping them active prevents the compact RUM v2 data flow from reaching a clean cutover and preserves duplicated telemetry paths.

The retained product surfaces are Web Vitals, Page Groups, Images, and Fonts. These surfaces must use canonical pageview facts and bounded diagnostic evidence before new v2 rows stop dual-writing the legacy `events` projection.

## 2. Decision Drivers

- Keep the dashboard aligned with the WordPress performance optimization mission.
- Preserve Web Vitals, Page Groups, Images, and Fonts without losing useful evidence.
- Retire generic monitoring surfaces and their recurring infrastructure cost.
- Keep historical RUM rows readable during migration.
- Avoid destructive database changes until retained readers pass parity checks.
- Keep canonical facts, bounded evidence, and issue documents clearly separated.

## 3. Considered Alternatives

### Alternative A: Retain Every Existing Dashboard Surface

- **Pros:** No customer-facing routes or SQL functions are removed.
- **Cons:** Generic analytics remains on the critical path, the legacy event dependency persists, and recurring Worker and D1 costs continue.
- **Rejected because:** it conflicts with the focused product goal and the compact RUM v2 architecture.

### Alternative B: Remove Surfaces Before Migrating Retained Readers

- **Pros:** Reduces code and infrastructure quickly.
- **Cons:** Web Vitals, Page Groups, Images, and Fonts would temporarily depend on a projection scheduled for removal.
- **Rejected because:** it creates an avoidable customer-facing data regression.

### Alternative C: Migrate Retained Readers, Then Retire Surfaces and Legacy Projection (Chosen)

- **Pros:** Preserves retained product behavior, enables measured parity checks, removes generic infrastructure, and leaves destructive schema work as a separate final step.
- **Cons:** Requires a staged rollout and temporary legacy fallback logic.
- **Chosen because:** it delivers the focused product boundary without sacrificing retained telemetry or historical data.

## 4. Decision Outcome

**Chosen Option: migrate retained readers first, then retire unneeded surfaces and stop dual-writing.**

### 4.1 Retained Product Surfaces

- Web Vitals overview, distributions, and metric drilldowns.
- Page Groups.
- Images enhancement.
- Fonts enhancement.
- Backend issue detection and reporting that consumes the same canonical evidence.

### 4.2 Retired Product Surfaces

- Trace.
- Generic Analytics.
- Global UX.
- Cloudflare Enhancements.

Retirement includes navigation, routes, UI, exclusive APIs, exclusive SQL readers, and exclusive infrastructure. Historical rows are not automatically deleted. Removing the physical `rum_metrics.events` column requires a separate destructive migration after all retained readers and production checks pass.

### 4.3 Reader Migration Rules

- Aggregate and filter queries use typed canonical columns.
- Element and asset explanations use bounded `diagnostic_evidence` JSON.
- Retained readers preserve their public response shapes where practical.
- Legacy v1 fallback remains only where historical rows require it.
- One pageview must count once, regardless of how many events it contains.
- Null means unavailable or unobserved, never zero.

### 4.4 Retirement Order

1. Expand and bound LCP and CLS evidence.
2. Migrate retained readers in reviewable batches.
3. Pass fixture and production parity checks.
4. Remove retired product surfaces and exclusive infrastructure.
5. Stop producing legacy `events` for new v2 rows.
6. Preserve historical rows and verify no retained reader requires the projection.
7. Plan a separate final migration to drop `rum_metrics.events`.


## 5. Privacy and Cardinality Rules

- Keep exact raw ISP organization strings out of canonical storage.
- Keep only the coarse `provider` label and normalized geography fields.
- Keep evidence URLs normalized, truncated, and free of credentials and fragments.
- Keep CLS involved-element lists and LCP font resource lists bounded.
- Keep the PostgreSQL evidence limit at 4 KiB and the Worker limit below it.
- Do not add separate child tables for LCP or CLS evidence in this migration.

## 6. Consequences

### Positive

- The dashboard directly supports the WordPress optimization service.
- Generic analytics Worker, D1, and cron costs can be removed.
- Retained readers use indexed facts and bounded evidence.
- Legacy event projection can be retired without retaining duplicated sources of truth.

### Negative and Mitigations

- **Temporary dual-read complexity:** mitigated by schema-version branches and parity tests.
- **Historical dashboard loss:** mitigated by preserving historical rows even when their retired UI is removed.
- **Evidence size pressure:** mitigated by deterministic per-section bounds and prioritization.
- **SQL migration risk:** mitigated by separate batched migrations and a final destructive migration.

## 7. Implementation and Verification Boundaries

The implementation sequence, phase gates, and progress log belong in:

`docs/plans/2026-11-24_054436_focused_rum_dashboard_and_data_retirement.md`

## 8. References

- Product goals: `docs/GOALS.md`
- Compact telemetry ADR: `docs/adr/0004-compact-rum-telemetry-and-rag-knowledge-model.md`
- Beacon protocol: `docs/protocols/rum-beacon-transport.md`
- Existing execution plan: `docs/plans/2026-11-23_223431_compact_rum_telemetry_and_rag_readiness.md`
