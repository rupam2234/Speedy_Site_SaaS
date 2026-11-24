# Compact RUM Phase 0 Baseline

> **Plan:** [Compact RUM Telemetry and RAG Readiness](../plans/2026-11-23_223431_compact_rum_telemetry_and_rag_readiness.md)
> **ADR:** [ADR-0004](../adr/0004-compact-rum-telemetry-and-rag-knowledge-model.md)
> **Generated:** 2026-11-23
> **Scope:** Contract definition, reader inventory, payload measurement, and database baseline

---

## 1. Summary

Phase 0 established the telemetry migration baseline without changing the collector, Worker, database schema, SQL readers, or dashboard behavior.

Key findings:

- **28 SQL reader definitions** read `rum_metrics.events`.
- **16 application RPC callers** invoke those readers.
- The original plan named 15 readers, so the inventory exposed additional production readers that require migration review.
- The configured Supabase project contains only **3 RUM rows**. Its storage and latency results are directional development measurements, not production benchmarks.
- The three sampled stored rows contain **7.3 KB to 11.5 KB** of event JSONB, exceeding the proposed 4 KB diagnostic budget.
- Representative version 1 fixtures range from **1.03 KiB to 3.87 KiB**. This is lower than stored production-shaped rows because the fixtures do not include every edge enrichment and continuation fragment.
- The v2 contract, normalization rules, redaction rules, evidence limits, issue-document schema, and sample thresholds are now defined.

## 2. Reproducible commands

```bash
node scripts/rum-phase0-inventory.mjs
node scripts/rum-phase0-payload.mjs
node scripts/rum-phase0-baseline.mjs
```

Generated evidence:

- `docs/reports/rum-events-reader-inventory.json`
- `docs/reports/rum-events-reader-inventory.md`
- `docs/reports/rum-payload-baseline.json`
- `docs/reports/rum-database-baseline.json`

The scripts do not print credentials, raw event payloads, URLs, or session identifiers. The inventory contains function names, field names, and source locations only.

## 3. Reader inventory

The generated inventory identifies these SQL reader definitions:

| Reader | Primary legacy dependency |
| :--- | :--- |
| `analyze_fcp_by_device` | Event-level `sessionId`, `client-info`, and FCP `web-vital` |
| `analyze_lcp_by_device` | `client-info`, LCP attribution, and render-blocking arrays |
| `analyze_web_vitals_by_page` | Event-level `sessionId`, `pageAddress`, `client-info`, and Web Vitals |
| `cache_analysis` | `origin-info`, `client-info`, `geo-info`, and TTFB attribution |
| `cls_elements` | CLS shifts, geometry, impact, and `client-info` |
| `cwv_dist_by_connection` | `client-info` and Web Vital ratings |
| `font_analysis` | JSONPath client and LCP font attribution |
| `get_ai_citation` | Client and page context from events |
| `get_analytics_by_device_and_country` | Device, country, and Web Vitals |
| `get_daily_web_metrics` | Device and Web Vital events |
| `get_lcp_image_metrics` | LCP image attribution |
| `get_rum_web_vitals_metrics` | Device and Web Vital events |
| `get_web_vital_counts_by_url` | URL and Web Vital events |
| `get_web_vitals_metrics` | Device and Web Vital events |
| `inp_elements` | INP attribution and `client-info` |
| `lcp_attribution_by_device` | LCP attribution and `client-info` |
| `page_performance_analysis` | Web Vital attribution by device and page |
| `recent_requests` | Geo, client, navigation, Web Vitals, and resource summary |
| `refresh_rum_daily_distributions` | Device and Web Vital events |
| `third_party_domains` | Resource summary and URL extraction |
| `traffic_source` | Session, device, referrer, and Web Vital events |
| `ttfb_contributors` | TTFB, client, geo, and navigation events |
| `user_happiness` | Device, Web Vital, and diagnostic event counts |
| `user_happiness_dist` | Device, country, and Web Vital events |
| `ux_map_data` | Client, geo, Web Vital, and session events |
| `web_vitals` | Device, country, language, session, and page events |

The generated report also contains duplicate definitions where a function is declared more than once in the base migration. The inventory intentionally reports every declaration so Phase 4 review cannot miss a shadowed definition.

### Legacy-only dependencies

The following shapes are read by SQL but are not emitted by the current collector:

- Event-level `sessionId`; the envelope and `rum_metrics.session_id` are authoritative.
- `pageAddress`.
- `origin-info`.
- Event-level `fetchPriority`.
- Diagnostic types such as `long-task`, `slow-api-call`, and `tracker-detected`.

These are classified as `legacy-only` in the generated inventory and must not be reintroduced into the v2 contract.


## 4. Payload baseline

| Fixture | Bytes | Events | Result |
| :--- | ---: | ---: | :--- |
| Passive desktop | 1052 | 4 | Under 8192-byte target |
| Passive mobile | 2595 | 6 | Under 8192-byte target |
| Interactive with INP | 1556 | 5 | Under 8192-byte target |
| Slow page with resources and error | 3958 | 9 | Under 8192-byte target |

All fixtures intentionally contain fields that version 2 removes, including `userAgent`, `hardwareConcurrency`, and an error `stack`. The v2 tests will assert their absence.

The fixture set establishes deterministic shape and size cases. A production browser capture remains required before Phase 1 migration sizing is finalized, because production rows include Worker geo enrichment and multiple continuation fragments.

## 5. Database baseline

The configured project returned:

| Measure | Result |
| :--- | ---: |
| Total RUM rows | 3 |
| Rows in the last day | 3 |
| Event JSONB minimum | 7303 bytes |
| Event JSONB median | 7470 bytes |
| Event JSONB maximum | 11496 bytes |
| Sampled row JSON maximum | 11552 bytes |

Directional REST RPC timings ranged from approximately 355 ms to 639 ms p50 and 516 ms to 717 ms p95 across three calls per RPC. These timings include network latency and a tiny dataset. They are useful only as a smoke baseline.

PostgreSQL heap size, index size, and `pg_stat_statements` read counters were unavailable because `.env.local` has no direct PostgreSQL connection string and the project does not expose an `exec_sql` RPC in the repository.

### Required production capture

Before production contract changes, capture the following from a production database or equivalent direct connection:

- Total RUM rows and rows per day.
- Heap and index size for `rum_metrics`.
- Event JSONB size p50, p95, and p99.
- Full row size p50, p95, and p99.
- RPC execution time p50 and p95, separated from network time.
- Daily database read volume from `pg_stat_statements` or Supabase usage reporting.
- Production beacon size samples for the four visit classes.

This is the only unresolved Phase 0 evidence item. The tooling and thresholds are ready, but the current environment cannot produce a production-scale sample.

## 6. Contract decisions

The version 2 contract is specified in `docs/protocols/rum-beacon-transport.md` and includes:

- `schema_version = 2`.
- Typed canonical facts for client, network, navigation, Web Vitals, resource totals, and diagnostic counts.
- Bounded evidence with limits of 3 LCP candidates, 3 render blockers, 5 resources, 3 CLS sources, 3 INP scripts, and 5 error signatures.
- Explicit URL, ID, timing, device, network, and rating normalization.
- Explicit removal of user agents, raw provider strings, IPs, credentials, fragments, stacks, and unbounded evidence.
- Version 1 and version 2 coexistence during rollout.

The issue-document schema and thresholds are specified in `docs/systems/issue-knowledge-documents.md`.

## 7. Phase gate status

| Deliverable | Status |
| :--- | :--- |
| Reader and caller inventory | Complete |
| Reproducible payload fixtures | Complete |
| v2 contract and normalization rules | Complete |
| Evidence limits and ranking rules | Complete |
| Issue-document schema and thresholds | Complete |
| Development database baseline | Complete |
| Production-scale storage and read-volume baseline | Pending access to production-scale data |
