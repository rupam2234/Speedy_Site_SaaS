# ADR-0004: Compact RUM Telemetry and RAG Knowledge Model

> **Status:** Accepted  
> **Date:** 2026-11-23  
> **Decision-Makers:** Core Engineering Team  
> **Supersedes:** None  
> **Superseded By:** None

---

## 1. Context and Problem Statement

Speedy Site is a WordPress performance optimization service. Real user monitoring is evidence for its issue detection engine, not a general-purpose observability product. The current collector stores a heterogeneous `events` JSONB array in each `rum_metrics` row.

A single pageview can contain complete navigation timing matrices, a full resource summary, every slow resource, render blockers, detailed CLS geometry, detailed INP attribution, and error stacks. This creates four problems:

1. **Storage and query cost:** `rum_metrics` grows with diagnostic detail, while many SQL RPCs repeatedly expand and scan the JSONB array.
2. **Payload cost:** large browser beacons increase bandwidth, Worker processing, Durable Object buffering, and Supabase writes.
3. **Signal quality:** full user-agent strings, precise network organization strings, complete resource lists, and verbose attribution add little to WordPress diagnosis while increasing cardinality and privacy exposure.
4. **RAG readiness:** raw pageviews are poor retrieval units. Embedding every visit creates noisy, duplicated vectors and makes answers difficult to attribute to a site, page, region, device, or confirmed issue.

The target data flow must support fast site, page, device, network, and regional analysis, produce pre-diagnosed WordPress issues, and later support a Cloudflare RAG assistant without treating the vector database as the source of truth.

## 2. Decision Drivers

- Preserve the product focus: evidence must lead to actionable WordPress performance issues.
- Reduce browser, Worker, Durable Object, Supabase, and RAG cost.
- Keep enough attribution to identify an LCP element, render blocker, slow third-party asset, layout-shift source, or INP script.
- Support useful comparisons by site, page template, country, region, device class, network class, and time window.
- Keep Supabase as the authoritative analytical store.
- Ensure RAG retrieval is tenant-safe, filterable, explainable, and resistant to raw telemetry noise.
- Preserve existing dashboards while the telemetry contract is migrated.
- Minimize privacy-sensitive and high-cardinality data.

## 3. Considered Alternatives

### Alternative A: Keep the Current Event Array and Only Trim It

- **Pros:** Smallest code change and no SQL reader migration.
- **Cons:** JSONB expansion remains the primary query pattern, important dimensions remain difficult to index, and RAG preparation still requires a separate interpretation layer.
- **Rejected because:** it reduces payload size but does not sufficiently improve backend flow or analytical quality.

### Alternative B: Store Every Raw Resource and Attribution Detail

- **Pros:** Maximum forensic detail and simple collection.
- **Cons:** Highest storage and query cost, largest beacons, noisy analytics, duplicated evidence, and unsafe RAG retrieval units.
- **Rejected because:** it conflicts with the performance-first product goal.

### Alternative C: Store Only Aggregated Daily Metrics

- **Pros:** Very small query surface and low storage cost.
- **Cons:** Loses pageview-level evidence required to detect element-level problems, distinguish regional effects, and explain trends.
- **Rejected because:** aggregate-only storage cannot support baked reasons.

### Alternative D: Normalized Hot Dimensions, Bounded Evidence, and Derived RAG Documents (Chosen)

- **Pros:** Fast indexed analytics, small payloads, bounded diagnostic detail, clear privacy boundaries, and stable retrieval units.
- **Cons:** Requires a versioned wire contract, database migration, reader compatibility work, and separate issue-document generation.
- **Chosen because:** it best supports the WordPress optimization service and future RAG without turning the system into a generic RUM platform.

## 4. Decision Outcome

**Chosen Option: A three-layer, purpose-specific data model with Supabase as the system of record.**

### 4.1 Layer 1: Canonical Pageview Facts

Each `rum_metrics` row remains one pageview, keyed by `pageview_id`. The next telemetry version stores hot, frequently queried facts in typed columns:

- Identity and scope: `pageview_id`, `session_id`, `domain_name`, `current_page`, `previous_page`, `referrer_domain`, `created_at`, `schema_version`.
- `referrer_domain` preserves the external traffic source as a normalized hostname. It is nullable for internal navigation and legacy rows. It must not be replaced by an internalized `previous_page` path.
- Geography: country, region, city, and coarse provider label.
- Client context: device class, coarse browser family, coarse OS family, device memory class, language, and connection class.
- Network context: effective type, rounded RTT, rounded downlink, and a coarse poor-connection flag.
- Navigation: TTFB, backend response, DNS, TCP/TLS, redirect, queue, cache status, transfer bytes, and decoded bytes.
- Web Vitals: FCP, LCP, CLS, INP, and TTFB values and ratings.
- Resource totals: request count, transfer bytes, and duration by resource type.
- Diagnostic counts: long tasks, failed resources, and error buckets.

The collector should stop sending duplicated `siteDomain` inside every event. The Worker derives the domain from the authenticated Origin/Referer and writes it once.

### 4.2 Layer 2: Bounded Diagnostic Evidence

Only the smallest evidence needed to explain an issue is retained per pageview:

- At most 3 LCP candidates and 3 render blockers.
- At most 5 slow or failed resources, selected by diagnostic relevance rather than raw duration alone.
- At most 3 CLS shift sources, with a compact target and impact summary rather than full geometry.
- At most 3 INP scripts or interaction targets.
- At most 5 error signatures with counts and first-seen offsets.
- URLs must be normalized, truncated, and stripped of irrelevant query data. Credentials, fragments, and personal data must never be stored.

Diagnostic evidence should be stored in a bounded JSONB column, not in the hot columns. A structured pageview should usually fit under 4 KB of diagnostic JSONB and under 8 KB in total. The exact limits are implementation requirements, not reasons to retain unbounded arrays.

### 4.3 Layer 3: Derived Issue and RAG Knowledge Documents

Raw pageviews are not embedded. A separate issue pipeline creates stable knowledge documents after evidence has crossed a confidence and sample-size threshold.

Each document represents one diagnosed issue or issue family and contains:

- tenant and site identifiers,
- normalized page path or page template,
- issue type,
- symptom and root cause,
- affected region, country, device class, and network class when material,
- observed period and sample count,
- supporting metrics and bounded evidence,
- recommended WordPress fix,
- confidence and schema version.

Supabase stores these documents and their provenance. A Cloudflare Worker embeds approved documents with Workers AI and writes them to Vectorize. Vectorize is a retrieval index, never the authoritative datastore.

For the initial implementation, use `@cf/baai/bge-small-en-v1.5`, which produces 384 dimensions, accepts up to 512 input tokens, supports batching, and has zero data retention. Use cosine distance. The index configuration is immutable, so the embedding model and dimensions must be validated before production creation.

Use one namespace per customer or tenant where namespace cardinality is controlled. Store short, indexed metadata for site, page template, issue type, country, region, device class, and observation month. Vectorize supports up to 10 metadata indexes per index and indexes the first 64 bytes of each string metadata value. This is sufficient for low-cardinality filters, while longer evidence remains in the document body and Supabase.

### 4.4 Query Strategy for RAG

RAG answers should combine semantic retrieval with authoritative aggregate queries:

1. Resolve the authenticated customer and allowed site identifiers.
2. Query Vectorize with the tenant namespace plus metadata filters.
3. Retrieve a small candidate set, normally 5 to 10 documents.
4. Query Supabase for current aggregates and source issue documents.
5. Generate an answer that cites the site, page, period, affected cohort, sample count, and recommended fix.

Vector similarity alone must not decide which site or page is in scope. Tenant and site filtering are mandatory before generation.

## 5. Privacy and Cardinality Rules

- Do not store the full user-agent string. Store a coarse browser family and OS family only when they materially affect diagnosis.
- Do not store the raw Cloudflare organization string when it includes a street, sector, postal code, or other precise location. Store only a normalized coarse provider label, or omit it.
- Do not store raw IP addresses. Cloudflare geo and network metadata are sufficient.
- Do not store URL fragments, credentials, query values known to contain personal data, or unbounded response text.
- Do not store complete error stacks by default. Store a normalized signature, source path, count, and first-seen offset.
- Keep city and region because they support regional analysis, but expose only aggregate views to customer-facing dashboards.
- Rotate or hash session identifiers according to the product privacy policy before using them in reports or retrieval documents.

## 6. Migration and Compatibility Rules

- Introduce a `schema_version` on the wire and in storage. Readers must support the current version and the previous version during rollout.
- Add typed columns and the bounded evidence column before switching collector output.
- Dual-write the new canonical fields while old event-array readers remain active. Do not maintain two independent sources of truth indefinitely.
- Migrate SQL RPCs to typed columns and bounded evidence incrementally, with result parity tests against representative legacy rows.
- Keep legacy `events` data readable. Historical rows may be backfilled only where it improves a product-critical aggregate.
- New canonical columns are nullable. A null value means that the fact was not observed or is unavailable for the row, not that the measurement was zero. Historical rows therefore require no backfill.
- Continuation beacons merge by `pageview_id`. First-party context is retained from the first non-null observation, later non-null metric observations may supersede earlier metrics, legacy events append, and diagnostic evidence merges shallowly by top-level section.
- Stop producing the legacy event array only after all production readers use the canonical fields.
- Do not delete historical rows as part of this migration without a separate retention decision and migration.

## 7. Consequences and Trade-offs

### Positive

- Smaller browser beacons and lower Worker, Durable Object, and Supabase write cost.
- Indexed page, region, device, and network analysis without repeated JSONB expansion.
- Better issue evidence because retained fields are selected for diagnosis.
- Lower privacy exposure and cardinality.
- Stable, explainable RAG documents instead of noisy per-pageview vectors.
- Clear source-of-truth and retrieval boundaries.

### Negative and Mitigations

- **Schema migration cost:** mitigated by additive columns, dual writes, reader-by-reader parity tests, and versioned contracts.
- **Less forensic detail:** mitigated by bounded evidence, error counts, and an optional short-lived diagnostic capture path for explicitly authorized debugging.
- **Two-stage analytics path:** mitigated by making the issue-document pipeline asynchronous and idempotent.
- **Vector index creation is immutable:** mitigated by validating embedding dimensions, metadata filters, and tenancy behavior in a staging index before production.
- **Small samples can mislead:** mitigated by minimum sample thresholds, confidence fields, and “insufficient data” responses in RAG.

## 8. Implementation and Verification Boundaries

The implementation sequence, migration gates, tests, and rollout steps belong to the related execution plan:

`docs/plans/2026-11-23_223431_compact_rum_telemetry_and_rag_readiness.md`

## 9. References

- Product goals: `docs/GOALS.md`
- Beacon protocol: `docs/protocols/rum-beacon-transport.md`
- Current analytics topology: `docs/systems/analytics-pipeline.md`
- Cloudflare Vectorize metadata filtering: https://developers.cloudflare.com/vectorize/reference/metadata-filtering/
- Cloudflare Vectorize limits: https://developers.cloudflare.com/vectorize/platform/limits/
- Workers AI embedding model: https://developers.cloudflare.com/workers-ai/models/bge-small-en-v1.5/

