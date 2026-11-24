# Focused RUM Dashboard and Data Retirement

> **Status:** 🟡 **IN PROGRESS**  
> **Created:** 2026-11-24 05:44:36 UTC  
> **Updated:** 2026-11-24 05:44:36 UTC  
> **Owner:** Speedy Site  
> **Related ADR:** [ADR-0005](../adr/0005-focused-rum-dashboard-and-data-retirement.md)  
> **Goal:** Preserve focused WordPress performance telemetry, migrate retained readers to compact RUM v2, and retire generic monitoring surfaces without losing historical data.

---

## 1. Scope

### Retain

- Web Vitals overview, distributions, and LCP, CLS, INP, TTFB, and FCP drilldowns.
- Page Groups.
- Images enhancement.
- Fonts enhancement.
- Issue detection and reporting that uses the same canonical evidence.

### Retire after retained reader parity

- Trace.
- Generic Analytics.
- Global UX.
- Cloudflare Enhancements.

Historical data is preserved unless a separate retention decision is approved. The physical `rum_metrics.events` column is dropped only in a final destructive migration.

## 2. Evidence Contracts

### LCP

Required retained fields: target, URL, resource delay and duration, render delay, candidate TTFB, transfer and decoded bytes, image width and height, lazy state, fetch priority, and font family, weight, size, URL, and transfer size when the LCP element is text.

### CLS

Required retained fields: target, bounded involved elements, shift value, viewport ratio, time, load state, area delta, distance moved, dx, dy, and previous and current rectangles.

## 3. Execution Checklist

### Phase 1: Architecture and tracking documentation

- [x] Create ADR-0005 for the focused dashboard and data retirement decision.
- [x] Create this timestamped execution plan with phase gates and progress notes.
- [x] Synchronize the ADR and plan master indexes.
- [x] Update the RUM reader inventory with retained, removal-only, and unused classifications.
- [x] Update the beacon protocol and RUM system dossier.
- [x] Record the architectural impact in `docs/IMPACT-LOG.md`.

**Verification:** ADR and plan agree on retained and retired surfaces, evidence fields, migration order, and destructive-change boundary. The five prior `rum_flow` commits were pushed through `8895749`. The documented plan manager was unavailable on this Windows host, so the plan and master index were synchronized directly.

**Gate:** ADR and plan agree on retained and retired surfaces, evidence fields, migration order, and destructive-change boundary.

### Phase 2: Expand bounded LCP and CLS evidence

- [x] Add image lazy state, fetch priority, dimensions, and candidate TTFB to the collector evidence.
- [x] Add font family, weight, size, URL, and transfer size to the collector evidence.
- [x] Preserve CLS movement, timing, load state, and bounded involved elements.
- [x] Normalize the expanded LCP and CLS shapes in `src/lib/rum/contract.js`.
- [x] Bound the expanded shapes in `src/lib/rum/storage.js` without exceeding 3.8 KB.
- [x] Add contract, size, privacy, and malformed-input tests.
- [x] Rebuild `public/rum.js` and `cloudflare-workers/rum/src/rum.txt` reproducibly.

**Gate:** representative passive, interactive, image, font, and CLS payloads pass contract and size tests, with no forbidden fields.

### Phase 3: Evidence database contract

- [x] Create a monotonic timestamped migration for evidence shape and bounds.
- [x] Preserve the PostgreSQL 4 KiB diagnostic evidence limit.
- [x] Preserve service-role-only execution of the batch upsert RPC.
- [x] Add migration tests for evidence validation and continuation merge behavior.
- [x] Regenerate database types through the repository workflow, never by editing generated types directly.

**Gate:** the migration applies cleanly and rejects malformed or oversized evidence without weakening existing RPC grants.

### Phase 4: Migrate retained aggregate and filter readers

- [x] Migrate `get_rum_web_vitals_metrics` to typed facts.
- [x] Migrate `get_web_vital_counts_by_url` to typed facts and one-row-per-pageview counts.
- [x] Migrate `cwv_dist_by_connection` to typed facts and network dimensions.
- [x] Migrate `analyze_fcp_by_device` to typed facts.
- [x] Review and migrate `analyze_web_vitals_by_page` only if it has a retained caller.
- [x] Add fixture parity, null behavior, row-count, and latency tests.

**Gate:** retained aggregate outputs are materially equivalent to the legacy path on representative fixtures and production samples.

### Phase 5: Migrate retained element and enhancement readers

- [x] Migrate `analyze_lcp_by_device` to canonical LCP evidence.
- [x] Migrate `get_lcp_image_metrics` to canonical LCP evidence.
- [x] Migrate `font_analysis` to canonical LCP font evidence.
- [ ] Migrate `cls_elements` to canonical CLS evidence.
- [ ] Migrate `inp_elements` to canonical INP evidence.
- [ ] Migrate `ttfb_contributors` to typed navigation, geography, and network facts.
- [ ] Migrate `page_performance_analysis` to typed facts and canonical evidence.
- [ ] Add fixture parity and UI response-shape tests.

**Gate:** Web Vitals drilldowns, Page Groups, Images, and Fonts remain stable for canonical rows and preserve legacy fallback for historical rows.

### Phase 6: Remove retired product surfaces

- [ ] Remove Trace UI and exclusive APIs.
- [ ] Remove Generic Analytics UI, proxy APIs, D1 mirror Workers, and cron schedules.
- [ ] Remove Global UX UI and exclusive API.
- [ ] Remove Cloudflare Enhancements UI and exclusive APIs and email flows after caller audit.
- [ ] Remove retired navigation entries.
- [ ] Remove removal-only SQL readers after confirming no application callers.
- [ ] Update generated database types through the repository workflow.
- [ ] Verify removed routes are unavailable and retired infrastructure is no longer deployed.

**Gate:** only retained product surfaces and their shared dependencies remain.

### Phase 7: Stop dual-writing and retire the projection

- [ ] Stop producing legacy `events` for new v2 rows.
- [ ] Keep historical `events` values unchanged.
- [ ] Verify retained readers do not read `events` for v2 rows.
- [ ] Compare v1 and v2 traffic, row counts, stored size, and RPC latency for a full traffic cycle.
- [ ] Update the beacon protocol, system dossier, reader inventory, and impact log.

**Gate:** new v2 rows use canonical data only, retained dashboards are stable, and historical rows remain readable.

### Phase 8: Final destructive events migration

- [ ] Confirm all retained readers and dashboards pass production parity.
- [ ] Confirm no source, SQL, Worker, or scheduled job depends on `events`.
- [ ] Create a separate monotonic timestamped migration that drops `rum_metrics.events`.
- [ ] Test the migration against representative historical rows.
- [ ] Regenerate database types and run the full quality gate.
- [ ] Document rollback and production deployment steps.

**Gate:** the duplicated projection is physically removed only after every dependency and parity requirement is satisfied.

## 4. Required Verification Commands

- `make check`
- `pnpm run typecheck`
- `pnpm test`
- `pnpm run build:extended-vitals`
- `pnpm run build`

Additional database, fixture, production parity, privacy, size, and latency checks are recorded in the phase notes as they are completed.

## 5. Rollout Rules

- Complete phases in order.
- Keep changes reversible until the final destructive migration.
- Apply additive schema changes before canonical reader cutover.
- Do not delete historical rows as part of surface removal.
- Do not drop `events` in the same migration that changes retained readers.
- Push the existing verified `rum_flow` commits before adding new implementation commits.

## 6. Progress Log

### 2026-11-24 05:44:36 UTC

- Confirmed retained surfaces: Web Vitals, Page Groups, Images, and Fonts.
- Confirmed retired surfaces: Trace, generic Analytics, Global UX, and Cloudflare Enhancements.
- Confirmed Trace depends on `recent_requests` and network-and-server routes.
- Confirmed generic Analytics depends on the analytics cron, traffic-source cron, D1 mirror, and proxy routes.
- Confirmed Global UX depends on `ux_map_data`.
- Confirmed the current v2 contract drops LCP candidate TTFB, image dimensions, lazy state, fetch priority, and font details, and reduces CLS evidence to target, value, and viewport ratio.
- Created ADR-0005 and this execution plan.
- Phase 2 completed: expanded LCP and CLS evidence, nested payload validation, deterministic storage bounds, 19 focused contract tests, rebuilt collector artifacts, 44/44 repository tests, and typecheck passed. `pnpm run lint` completed with only pre-existing React hook warnings.
- Phase 3 completed: added monotonic migration `20261124055952_focused_rum_evidence_contract.sql` with a `NOT VALID` future-write evidence constraint, 4 KiB limit, shape validation, and restricted helper grants. Static migration tests passed. Local SQL lint was blocked because Docker Desktop is not running.
- Phase 4 completed: added monotonic migration `20261124060651_canonical_retained_aggregate_readers.sql` for the four retained aggregate and filter RPC families. A restricted normalized helper uses typed v2 facts and a deduplicated historical event fallback. Both `get_web_vital_counts_by_url` overloads are migrated. Static migration tests and the full 52-test repository suite passed. Runtime SQL validation and production parity remain pending because Docker Desktop is unavailable and migrations were not applied to production.
- Phase 5A completed: added monotonic migration `20261124062156_canonical_retained_lcp_readers.sql` with one normalized LCP candidate per pageview, canonical image and font evidence, and historical fallback. The LCP device, image, and font reader response contracts and thresholds are preserved. Static migration tests and the full 56-test repository suite passed.
