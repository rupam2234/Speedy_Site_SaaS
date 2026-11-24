# Plan: Compact RUM Telemetry and RAG Readiness

> **Status:** 🟡 IN PROGRESS  
> **Created:** 2026-11-23 22:34:31 UTC  
> **Updated:** 2026-11-23 23:30:00 UTC  
> **Related ADR:** [ADR-0004: Compact RUM Telemetry and RAG Knowledge Model](../adr/0004-compact-rum-telemetry-and-rag-knowledge-model.md)  
> **Prerequisite:** Production passive RUM delivery is working and `pageview_id` continuation merging is verified.  
> **Target:** Optimize the RUM backend for high-quality WordPress insights and prepare a safe Cloudflare RAG knowledge pipeline.

---

## 1. Objective

Reduce RUM payload and storage cost while preserving the evidence needed to diagnose WordPress performance problems by site, page, region, device, and network. Establish a clean path from raw pageview facts to pre-diagnosed issue documents and, in a later phase, Cloudflare Vectorize retrieval.

The implementation must not create a generic monitoring platform. Every retained field must support at least one of these outcomes:

1. site or page performance comparison,
2. regional or device cohort analysis,
3. Core Web Vital trend reporting,
4. WordPress issue detection with a baked reason,
5. customer-visible evidence of an optimization,
6. RAG retrieval grounded in a diagnosed issue.

## 2. Current-State Findings

### 2.1 Payload and duplication

The current pageview sends a JSON array containing:

- `geo-info`, including a raw Cloudflare organization string,
- `client-info`, including a full user-agent,
- FCP, TTFB, CLS, and LCP events,
- a navigation timing object with overlapping derived and raw timing values,
- an array of up to 5 render blockers,
- a `resource-summary` containing type aggregates and every resource slower than 100 ms,
- optional INP and error data.

The same domain and metric information is repeated in multiple places. `siteDomain` is repeated inside most events even though the Worker already derives the domain from Origin/Referer. Navigation timings overlap with TTFB attribution. LCP resource information overlaps with the resource summary.

### 2.2 Backend query cost

The main SQL functions repeatedly use `jsonb_array_elements(rum_metrics.events)`. This prevents efficient filtering and indexing of common dimensions such as country, device, network, and metric value. Functions also contain inconsistent assumptions about event shape, for example `client-info` fields are sometimes read at the top level and sometimes under `client` or `device` objects.

### 2.3 Data-quality issues

- Device type is inferred from viewport width only. A desktop browser at a narrow viewport can be reported as mobile.
- The edge organization string can contain a street, sector, and postal code. It is too precise for the product requirement.
- Full resource lists and verbose CLS geometry add noise to analytics and future retrieval.
- Some existing SQL readers depend on historical event fields that the current collector does not actually send, including `sessionId` inside events and `origin-info`.

### 2.4 RAG constraint

Cloudflare Vectorize supports metadata filtering with indexed string, number, and boolean fields. A Vectorize index supports up to 10 metadata indexes, 64 bytes of indexed string metadata per property, and 10 KiB of total metadata per vector. This supports low-cardinality filters, but raw pageviews remain poor retrieval documents.

## 3. Target Architecture

```text
Browser collector
  |  compact versioned pageview, bounded evidence
  v
Cloudflare event-buffer Worker
  |  authenticate domain, derive geo, normalize provider
  |  canonicalize and bound payload
  v
Durable Object buffer
  |  batch by row shape
  v
Supabase rum_metrics
  |  typed hot facts + bounded diagnostic JSONB
  v
SQL RPCs and aggregate tables
  |  indexed site/page/region/device/network analysis
  v
Issue detection engine
  |  evidence threshold, baked reason, confidence
  v
Supabase issue_documents
  |  source of truth and provenance
  v
Cloudflare indexer Worker
  |  Workers AI embedding, Vectorize upsert
  v
Cloudflare Vectorize
  |  retrieval index only
  v
Authenticated RAG query Worker
  |  tenant filter + semantic retrieval + Supabase aggregate grounding
  v
Customer or expert answer
```

## 4. Field Retention Matrix

| Data | Decision | Stored form | Reason |
| :--- | :--- | :--- | :--- |
| Pageview ID | Keep | typed unique column | one row per pageview and continuation merge |
| Session ID | Keep with policy | typed column, hash or rotate before reporting | sessions and navigation analysis |
| Current/previous page | Keep | typed columns | page and referral analysis |
| Country, region, city | Keep | typed columns | regional performance analysis |
| Raw Cloudflare organization | Remove | normalized coarse provider label or null | unnecessary precise location exposure |
| Full user-agent | Remove | coarse browser family and OS family if needed | browser cohorts without fingerprinting detail |
| Viewport-only device type | Replace | capability-based device class with viewport fallback | correct device cohorts |
| Device memory | Keep, bucket | typed numeric or coarse class | LCP and low-memory analysis |
| Hardware concurrency | Remove by default | null | little product value relative to fingerprinting surface |
| Language | Keep | typed column | audience and locale analysis |
| Connection effective type | Keep | typed column | regional and network cohorts |
| RTT and downlink | Keep, rounded and bucketed | typed columns | connection quality diagnosis |
| FCP, LCP, CLS, INP, TTFB | Keep | typed value and rating columns | core trends and issue thresholds |
| LCP target and asset | Keep, compact | bounded evidence | element-level LCP diagnosis |
| LCP load delay/duration and render delay | Keep | typed or bounded evidence | cause attribution |
| Render blockers | Keep, top 3 | bounded evidence | baked reason for delayed paint |
| Full navigation timing matrix | Reduce | typed canonical timing columns | faster queries and less duplication |
| Resource totals by type | Keep | typed JSONB summary | page weight and request mix |
| Every slow resource | Reduce | top 5 diagnostic candidates | actionable assets without noise |
| Resource phase details | Keep for candidates only | bounded evidence | explain asset cost |
| Full CLS geometry and 5 shift details | Reduce | top 3 compact shift sources | identify layout-shift source |
| INP LoAF and script details | Reduce | top 3 scripts or targets | interaction diagnosis |
| Error stacks | Remove by default | normalized signature, source, count, first seen | error trends without sensitive payloads |
| Raw IP address | Never store | none | unnecessary and sensitive |
| Query strings | Normalize | path plus safe low-cardinality parameters only | page grouping and privacy |
| Raw pageviews in Vectorize | Never embed | none | noisy, duplicated, hard to explain |

## 5. Target Canonical Contract

The exact field names belong in the protocol specification during implementation. The contract should have this logical shape:

```json
{
  "schema_version": 2,
  "pageview_id": "uuid",
  "session_id": "opaque-id",
  "current_page": "/products/widget",
  "previous_page": "/",
  "client": {
    "device_type": "desktop",
    "browser_family": "chrome",
    "os_family": "windows",
    "device_memory_gb": 8,
    "language": "en-US",
    "network": {
      "effective_type": "4g",
      "rtt_ms": 100,
      "downlink_mbps": 1.5
    }
  },
  "navigation": {
    "ttfb_ms": 3432,
    "backend_ms": 2312,
    "dns_ms": 95,
    "connect_ms": 1018,
    "redirect_ms": 0,
    "queue_ms": 0,
    "cache_status": "unknown",
    "transfer_bytes": 28807,
    "decoded_bytes": 285511
  },
  "vitals": {
    "FCP": { "value": 5620, "rating": "poor" },
    "LCP": { "value": 6204, "rating": "poor" },
    "CLS": { "value": 0, "rating": "good" },
    "TTFB": { "value": 3432, "rating": "poor" },
    "INP": null
  },
  "resources": {
    "request_count": 29,
    "transfer_bytes": 104965,
    "by_type": { "script": { "count": 16, "duration_ms": 32946, "bytes": 67724 } }
  },
  "evidence": {
    "lcp": [],
    "render_blockers": [],
    "slow_resources": [],
    "cls_shifts": [],
    "inp": null,
    "errors": []
  }
}
```

The Worker remains the security boundary. It derives the domain from Origin/Referer, enriches the row with Cloudflare geo data, normalizes the provider, and rejects malformed or oversized payloads.

## 6. Delivery Phases

### Phase 0: Contract and Measurement Baseline

- [x] Inventory every production reader of `rum_metrics.events` and classify each field as required, optional, legacy-only, or unused.
- [x] Capture representative payload sizes by event type for passive desktop, passive mobile, interactive, and slow-page visits.
- [ ] Record baseline `rum_metrics` row size, events JSONB size, daily rows, query latency, and Supabase read volume. Development measurements are complete; production-scale storage and read-volume capture requires access to a production-scale dataset or direct PostgreSQL connection.
- [x] Define `schema_version = 2` in the protocol document.
- [x] Define normalization, URL redaction, evidence ranking, and payload size test cases.
- [x] Define the issue-document schema and sample thresholds before any vector work.

**Gate:** no production contract changes until the field inventory and size baseline are reproducible. The field inventory and fixture size baseline are reproducible. The production-scale database baseline remains open, so Phase 1 may add schema only and must not change production behavior.

**Phase 0 evidence:** [`docs/reports/rum-phase0-baseline.md`](../reports/rum-phase0-baseline.md)

### Phase 1: Additive Database Migration

- [x] Create a timestamped migration using `pnpm run db:new compact_rum_telemetry`.
- [x] Add typed columns for scope, geo, client, network, navigation, Core Web Vitals, resource totals, and diagnostic counts.
- [x] Add `schema_version`, normalized `referrer_domain`, and a bounded `diagnostic_evidence` JSONB column.
- [x] Add indexes for the proven read paths: domain and time, domain and page, domain and country/region, domain and device, and metric filters where justified.
- [x] Update the upsert RPC to merge continuation beacons by `pageview_id` without duplicating geo/client/navigation facts.
- [x] Keep legacy `events` readable and unchanged.
- [x] Regenerate database types with `make types` or the repository equivalent. Never edit generated types directly.

**Gate:** migration applies cleanly, legacy rows remain readable, and new columns have documented null semantics for legacy data.

**Verification:** The migration was applied to the linked live Supabase database on 2026-11-23. The live RPC accepted an empty payload, merged a reversible synthetic continuation into one row, preserved first-party context, superseded INP with the later observation, merged distinct diagnostic sections, and cleaned up the synthetic row. Oversized diagnostic evidence was rejected by the live 4 KiB constraint. A follow-up grant hardening migration removed explicit `anon` and `authenticated` execution, leaving the RPC available to `service_role` only. The live public-key probe returned HTTP 401 and the service-role probe passed. Types were regenerated from the live schema.

### Phase 2: Collector and Edge Canonicalization

- [x] Add contract builders and unit tests in `scripts/extended-rum.js`.
- [x] Replace viewport-only device detection with capability-based detection and a fallback.
- [x] Parse the user-agent once into coarse browser and OS families, then discard the raw string.
- [x] Remove duplicate `siteDomain` fields from the v2 payload.
- [x] Canonicalize navigation timings and remove derived values that can be recalculated.
- [x] Rank resources by diagnostic value and keep at most 5 candidates with complete phase details.
- [x] Keep at most 3 render blockers, 3 LCP candidates, 3 CLS sources, 3 INP scripts, and 5 error signatures.
- [x] Replace full error stacks with normalized signatures, source, count, and first-seen offset.
- [x] Add payload size assertions to collector tests.
- [x] Build `public/rum.js` and `cloudflare-workers/rum/src/rum.txt` from one source and verify they are reproducible in their intended module formats.

**Gate:** representative v2 passive and interactive payloads are under the agreed size budgets, contain all required fields, and contain no forbidden fields.

**Verification:** The collector emits `schema_version: 2` from a stable `pageview_id`. Shared contract builders normalize capability-based device class, coarse browser and OS families, page paths, external referrer domains, navigation timings, Web Vitals, resource totals, and bounded evidence. Deterministic desktop, mobile, interactive, and slow-page fixtures serialize below 8 KiB and contain no raw user agent, hardware concurrency, URL credentials, fragments, unsafe query values, or error stacks.

### Phase 3: Worker Ingestion and Durable Object Flow

- [x] Update `cloudflare-workers/event-buffer/src/index.js` to accept v1 and v2 during rollout.
- [x] Derive and validate domain from Origin/Referer as today.
- [x] Normalize the Cloudflare provider string into a coarse label and reject precise street-level values.
- [x] Write typed hot facts and bounded diagnostic evidence to the v2 columns.
- [x] Continue to enrich realtime data from the canonical contract.
- [x] Make continuation beacons merge only newly observed metric or evidence fields.
- [x] Add source-level Worker contract tests for entitlement, unknown domains, v1 compatibility, v2 canonicalization, size limits, continuation merge, and precise-provider removal. A full Workers runtime integration suite remains future work.
- [x] Add structured logs for payload version, row count, rejected payload count, and Supabase latency. Never log full payloads.

**Gate:** v1 and v2 can coexist, unknown domains remain rejected, one pageview remains one row, and v2 rows contain no raw user-agent or precise organization string.

### Phase 4: Reader Migration and Analytics Quality

- [ ] Migrate `recent_requests`, `analyze_fcp_by_device`, `analyze_lcp_by_device`, `analyze_web_vitals_by_page`, `cache_analysis`, `cls_elements`, `inp_elements`, `page_performance_analysis`, `refresh_rum_daily_distributions`, `user_happiness`, `user_happiness_dist`, `ux_map_data`, `traffic_source`, `ttfb_contributors`, and `web_vitals` to canonical columns and bounded evidence.
- [ ] Prefer one row per pageview over repeated event expansion when computing pageview counts.
- [ ] Add page-template normalization so query strings do not fragment page cohorts.
- [ ] Define minimum sample counts and confidence rules for every product-facing insight.
- [ ] Add regional and network cohort views only where the sample count is sufficient.
- [ ] Remove obsolete event-shape fallbacks only after parity checks pass.
- [ ] Keep the legacy `events` path for historical rows until every reader and dashboard has passed parity checks.

**Gate:** legacy and canonical fixtures produce materially equivalent results for dashboards and reports, with documented differences where the old collector did not actually send a field.

### Phase 5: Issue Detection and Knowledge Documents

- [ ] Add `issue_documents` and issue-evidence tables through a timestamped migration.
- [ ] Define issue types such as slow LCP image, render-blocking plugin assets, heavy third-party scripts, slow origin response, layout instability, poor mobile experience, and high INP interaction cost.
- [ ] Generate baked reasons containing what, where, affected cohort, why, evidence, sample count, and recommended WordPress fix.
- [ ] Add confidence, severity, status, first/last seen, and schema version.
- [ ] Aggregate repeated pageviews into issue families so the knowledge layer does not duplicate one finding per visit.
- [ ] Build an idempotent exporter from approved issue documents to a Cloudflare queue or scheduled Worker.
- [ ] Add retention and deletion behavior that updates both Supabase and Vectorize.

**Gate:** experts receive actionable issues grounded in sufficient evidence, and each issue document can be traced to source aggregates and evidence.

### Phase 6: Cloudflare RAG Pilot

- [ ] Validate `@cf/baai/bge-small-en-v1.5`, 384 dimensions, and cosine distance in a staging Vectorize index.
- [ ] Create metadata indexes before inserting vectors: tenant, site, page template, issue type, country, region, device, and observation month.
- [ ] Use a tenant namespace and filter by site in every query.
- [ ] Build the document text within the 512-token model limit and store the full canonical document in Supabase.
- [ ] Add an authenticated query Worker that performs Vectorize retrieval and then grounds the answer in Supabase aggregates and source documents.
- [ ] Add evaluation questions for site, page, region, device, network, and fix recommendations.
- [ ] Add negative tests proving one tenant cannot retrieve another tenant's documents.
- [ ] Add insufficient-data behavior for low-sample regions or pages.

**Gate:** retrieval is tenant-safe, answers cite current evidence and sample sizes, and the model does not invent a cause or fix unsupported by the issue document.

### Phase 7: Production Cutover and Legacy Retirement

- [ ] Deploy the collector, Worker, migration, readers, and issue pipeline in a coordinated, reversible sequence.
- [ ] Compare v1 and v2 traffic and row sizes for at least one full traffic cycle.
- [ ] Verify v2 passive, interactive, continuation, and slow-page flows in production.
- [ ] Stop producing legacy events only after all readers pass parity checks.
- [ ] Backfill only product-critical typed fields from legacy events, in bounded batches with dry-run counts.
- [ ] Decide historical retention separately. Do not delete legacy data under this plan.
- [ ] Enable RAG for internal experts first, then for customers if product direction permits it.

**Gate:** payload and storage targets are met, dashboards are stable, passive visits persist, and no known reader depends on the removed event fields.

## 7. Verification Matrix

| Area | Required proof |
| :--- | :--- |
| Collector | unit tests for all bounds, redaction rules, device classification, and compact contract output |
| Build | `public/rum.js` and Worker `rum.txt` are reproducible from `scripts/extended-rum.js` |
| Worker | tests for v1/v2 acceptance, entitlement rejection, canonicalization, continuation merge, and payload limits |
| Database | migration test, legacy compatibility test, upsert merge test, generated types check |
| SQL | fixture-based parity tests for every migrated RPC, including null and low-sample behavior |
| UI | dashboard regression tests for pages, LCP, CLS, INP, trace, analytics, and regional cohorts |
| Performance | p50 and p95 RPC latency before and after; row and JSONB size comparison; query-plan inspection |
| Privacy | automated scan proving no raw user-agent, raw Cloudflare organization, IP, credentials, or URL fragments in stored rows |
| RAG | retrieval relevance evaluation, cross-tenant isolation tests, citation checks, insufficient-data tests |
| Live flow | passive desktop visit, passive mobile visit, interactive visit, INP continuation, unknown-domain rejection, and Supabase row verification |

## 8. Performance and Quality Budgets

Final numeric targets should be set from the Phase 0 baseline. Recommended initial acceptance targets:

- v2 beacon body: under 8 KB for normal passive visits.
- diagnostic evidence JSONB: under 4 KB per pageview.
- stored v2 row: under 12 KB including indexes and JSONB overhead.
- retained slow resources: at most 5.
- retained render blockers: at most 3.
- retained CLS shift sources: at most 3.
- retained INP scripts or targets: at most 3.
- retained error signatures: at most 5.
- no forbidden field in any persisted payload.
- canonical RPC p95 latency: no worse than the legacy baseline while providing equivalent or better results.
- Vectorize retrieval topK: normally 5 to 10 candidates, never above 50 when metadata is returned.

## 9. Rollout and Rollback

1. Apply the additive migration.
2. Deploy readers that accept both formats.
3. Deploy the Worker with dual write enabled.
4. Deploy the v2 collector.
5. Validate traffic, rows, privacy, and dashboard parity.
6. Migrate readers incrementally to canonical columns.
7. Disable legacy event production.
8. Backfill selected historical aggregates in bounded batches.
9. Build and validate issue documents.
10. Enable the RAG pilot behind an authenticated internal route.

Rollback points:

- Before v2 collector deployment: disable v2 emission and retain the additive schema.
- During dual write: revert the collector to v1 without reverting the database migration.
- During reader migration: route the affected RPC back to legacy extraction.
- During RAG pilot: disable the query route without affecting telemetry collection or issue generation.

## 10. Explicitly Out of Scope

- Embedding raw pageviews or full resource waterfalls.
- A self-serve customer diagnostic chatbot.
- Generic application or infrastructure tracing.
- Storing raw IP addresses or full user-agent strings.
- Replacing Supabase with D1, KV, R2, or Vectorize as the source of truth.
- Automatic remediation of WordPress without expert review.
- Deleting historical telemetry before a separate retention decision.

## 11. Expected Documentation Updates During Implementation

- `docs/protocols/rum-beacon-transport.md`: v2 wire schema, compatibility, limits, and redaction rules.
- `docs/systems/analytics-pipeline.md`: canonical storage and reader flow after Phase 4.
- `docs/systems/rum-injector-plugin.md`: collector contract changes that affect installation or runtime.
- `docs/IMPACT-LOG.md`: record the shipped schema, collector, Worker, and RAG pipeline changes.
- `docs/adr/README.md` and `docs/plans/README.md`: update this plan and ADR status as milestones complete.

## 12. Completion Criteria

- [ ] All required data is present in canonical typed fields or bounded evidence.
- [ ] Full user-agent, precise provider strings, raw IP data, credentials, and fragments are absent from storage.
- [ ] Normal passive and interactive beacons meet size budgets.
- [ ] The event-buffer Worker and Supabase upsert preserve one row per pageview and merge continuation data.
- [ ] All production readers use canonical fields for new rows and pass fixture parity checks.
- [ ] Site, page, region, device, and network analysis is supported with sample-size and confidence rules.
- [ ] Issue documents contain baked reasons and traceable evidence.
- [ ] Vectorize contains issue documents only, with tenant isolation enforced.
- [ ] RAG answers are grounded in Supabase evidence and state when data is insufficient.
- [ ] Legacy retirement and historical retention are explicitly approved after production validation.


