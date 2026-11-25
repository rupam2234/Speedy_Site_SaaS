# Focused RUM Dashboard and Data Retirement

> **Status:** 🟡 **IN PROGRESS**  
> **Created:** 2026-11-24 05:44:36 UTC  
> **Updated:** 2026-11-24 13:20:00 UTC
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
- [x] Migrate `cls_elements` to canonical CLS evidence.
- [x] Migrate `inp_elements` to canonical INP evidence.
- [x] Migrate `ttfb_contributors` to typed navigation, geography, and network facts.
- [x] Migrate `page_performance_analysis` to typed facts and canonical evidence.
- [x] Add fixture parity and UI response-shape tests.

**Gate:** Web Vitals drilldowns, Page Groups, Images, and Fonts remain stable for canonical rows and preserve legacy fallback for historical rows.

### Phase 6: Remove retired product surfaces

- [x] Remove Trace UI and exclusive APIs.
- [x] Remove Generic Analytics UI, proxy APIs, D1 mirror Workers, and cron schedules.
- [x] Remove Global UX UI and exclusive API.
- [x] Remove Cloudflare Enhancements UI and exclusive APIs and email flows after caller audit.
- [x] Remove retired navigation entries.
- [x] Remove removal-only SQL readers after confirming no application callers.
- [x] Update generated database types through the repository workflow.
- [x] Verify removed routes are unavailable and retired infrastructure is no longer deployed.

**Gate:** only retained product surfaces and their shared dependencies remain.

### Phase 7: Stop dual-writing and retire the projection

- [x] Stop producing legacy `events` for new v2 rows.
- [x] Keep historical `events` values unchanged.
- [x] Verify retained readers do not read `events` for v2 rows.
- [ ] Compare v1 and v2 traffic, row counts, stored size, and RPC latency for a full traffic cycle.
- [x] Update the beacon protocol, system dossier, reader inventory, and impact log.

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
- Phase 5B completed: added monotonic migration `20261124062734_canonical_retained_diagnostic_readers.sql` for CLS, INP, TTFB, and page-performance readers. Canonical v2 rows use diagnostic evidence and typed facts, while historical rows retain event fallback. Response fields, thresholds, and performance classifications are preserved. Static migration tests and the full 60-test repository suite passed.
- Phase 6 repository removal completed: removed Trace, generic Analytics, Global UX, Cloudflare Enhancements UI, exclusive APIs, analytics proxy code, both analytics Worker source trees, cache-rule email flow, and five removal-only SQL readers. Cloudflare account connection APIs remain for Settings. The deployed `analytics-cron` and `traffic-source-cron` Workers were deleted, removing their cron schedules; both health URLs now return 404. Production build and route manifest passed. Generated database types were regenerated from the linked production schema.
- Phase 7 implementation completed: new v2 rows now persist an empty `events` array while canonical typed facts and bounded evidence remain unchanged. Historical `events` values remain intact, and canonical v2 branches of retained readers do not read the legacy projection.
- Production parity completed on 2026-11-24: all 12 retained reader RPC probes succeeded, all 5 retired RPCs were absent with PostgREST `PGRST202`, and 60 typed-versus-legacy metric comparisons across 17 v2 production rows had zero value or normalized-rating mismatches. Production initially exposed PL/pgSQL output-name conflicts and malformed historical JSON/numeric shapes; corrective migrations `20261124123405_fix_retained_reader_production_errors.sql` and `20261124125351_fix_remaining_retained_reader_errors.sql` resolved them.
- Phase 8 remains intentionally pending: physically dropping `rum_metrics.events` requires separate approval and a full traffic-cycle comparison after this branch is deployed.
- Canonical-only v2 production cutover completed on 2026-11-24: deployed event-buffer Worker version `c9fad319-df44-41ab-9e3b-63c8aec63e0c`. Three controlled v2 beacons were accepted by the live Worker, and the flushed row contained canonical device and LCP facts with `events = []`. The synthetic row was deleted and confirmed absent.
- Phase 7 traffic-cycle baseline captured on 2026-11-24: production contained 4 v1 rows and 17 v2 rows across only two calendar dates, with no retained v2 row after the canonical cutover. All 12 retained RPC readers succeeded across 7 samples each, and the existing 60-value typed-versus-legacy comparison retained zero mismatches. The comparison gate remains pending until at least seven complete UTC days of representative canonical-only traffic have accumulated. See `docs/reports/rum-traffic-cycle-baseline-2026-11-24.json`.
- Phase 8 remains pending after the Phase 7 gate: physical removal of `rum_metrics.events` requires a separate destructive migration and explicit approval.
- Production ingestion verification completed on 2026-11-24 after deploying the current collector Worker version `52839b51-0816-4edf-a7cc-3a7e90fc181c` and the current site-metadata Worker version `56995b98-9029-43de-979d-84bb7df43a04`. The served collector now matches the committed Worker artifact byte for byte. The entitlement KV was reconciled for the one active managed domain, and the edge gate was verified to accept that domain while rejecting an unknown domain.
- The controlled end-to-end beacon exposed production-only diagnostic-evidence validator defects that repository contract tests had not exercised against PostgreSQL. Monotonic migrations `20261124162516_fix_rum_diagnostic_evidence_null_handling.sql`, `20261124163711_fix_rum_diagnostic_evidence_geometry_key_conflict.sql`, `20261124163958_fix_rum_diagnostic_evidence_text_array_comparison.sql`, and `20261124164732_replace_rum_diagnostic_evidence_validator.sql` corrected JSON-null handling, geometric key type resolution, array comparison typing, and PL/pgSQL record-field ambiguity. A final live beacon returned `202 Data buffered`, persisted a schema 2 row with canonical device, LCP, and CLS facts plus `events = []`, and the synthetic row was deleted and confirmed absent.
- Live dashboard retrieval verification completed on 2026-11-25. The Web Vitals history RPC still read the lagging `rum_history_new` materialized table, so newly collected canonical rows were absent from the chart and UX score. Monotonic migrations `20261125015224_migrate_canonical_rum_history_reader.sql` and `20261125015847_fix_canonical_rum_history_metric_keys.sql` move history to normalized canonical and historical facts with lowercase dashboard keys. Production and local API probes now return November 25 desktop and mobile metrics, plus November 23 and 24 tablet metrics, for `feedingnature.com`. URL-provided managed sites now take precedence over stale session state.
