# ADR-0007: Evidence-First Issue Diagnosis and Grounded Remediation

> **Status:** Accepted
> **Date:** 2026-11-25
> **Decision-Makers:** Core Engineering Team
> **Supersedes:** None
> **Refines:** ADR-0004, ADR-0005, and ADR-0006

---

## 1. Context

Speedy Site is a WordPress performance optimization service powered by real user data and WordPress backend tests. The canonical RUM model now retains bounded evidence for LCP resources, render blockers, layout shifts, INP attribution, and TTFB phases. The remaining product gap is not another telemetry stream or an open-ended AI assistant. It is a persistent, evidence-backed workflow that turns repeated observations into diagnosed issues, recommends a targeted fix, routes that issue to an expert, and verifies the outcome with a RUM delta.

The current Web Vitals drilldowns expose element-level analysis actions backed by OpenRouter. Those actions analyze contributor rows supplied by the browser. They do not independently establish tenant or site authority, persist a diagnosis and its provenance, enforce recurring-sample thresholds, correlate the symptom with WordPress backend evidence, or track whether a recommended fix worked. A model response alone is not a durable service record.

ADR-0004 established canonical pageview facts, bounded evidence, derived issue documents, and Cloudflare Vectorize as a retrieval index. ADR-0005 retained focused Web Vitals drilldowns and retired generic analytics. ADR-0006 limits raw diagnostic retention and requires long-lived issue records to preserve their own bounded evidence. This ADR connects those decisions into the primary product workflow.

## 2. Decision Drivers

- Preserve canonical RUM facts and deterministic evidence as the source of truth.
- Prevent an LLM from inventing a cause, aggregate count, affected site, or remediation step.
- Establish site and tenant authority on the server for every analysis and retrieval request.
- Aggregate repeated observations into stable issue families instead of analyzing every element independently.
- Distinguish confirmed causes from probable causes using WordPress backend corroboration.
- Give experts concise issue cards with evidence, confidence, remediation, and verification guidance.
- Route diagnosed issues into the existing managed WordPress service channel.
- Measure service outcomes through verified RUM improvement rather than AI response volume.
- Scale retrieval without embedding raw pageviews or duplicating authoritative state.
- Keep the initial scope limited to Web Vitals element analysis before broader site diagnostics.

## 3. Considered Alternatives

### Alternative A: Put RAG Directly Between Elements and Diagnosis

- **Pros:** Small conceptual change to the current analysis buttons and fast path to natural-language output.
- **Cons:** Causes, sample counts, and affected cohorts are nondeterministic; cross-tenant scope is difficult to enforce; repeated visits create repeated vectors; evidence is difficult to audit; recommendations are not persisted or verifiable.
- **Rejected because:** it makes the model responsible for facts that canonical telemetry and deterministic rules already establish.

### Alternative B: Keep Deterministic Element Analysis Only

- **Pros:** Simple architecture, predictable cost, and no vector retrieval or prompt-injection surface.
- **Cons:** Repetitive investigations still require expert effort; prior fixes and curated remediation knowledge are difficult to reuse; the product remains a monitoring display rather than a remediation service.
- **Rejected because:** it omits the retrieval and explanation value needed by experts once issue detection is stable.

### Alternative C: Analyze Client-Supplied Contributor Rows Through OpenRouter

- **Pros:** Existing routes and UI already support this flow.
- **Cons:** The browser controls the evidence payload; tenant and site ownership are not independently established; output is ephemeral free-form text; no recurring threshold, provenance, backend correlation, or fix verification exists.
- **Rejected because:** it is not an authoritative, tenant-safe diagnosis boundary.

### Alternative D: Detect and Diagnose Entirely With an LLM

- **Pros:** Flexible reasoning and easier initial prototyping.
- **Cons:** Nondeterministic aggregation, higher recurring cost, invented causes, weak threshold enforcement, difficult regression testing, and poor auditability.
- **Rejected because:** diagnosis must be reproducible from structured facts.

### Alternative E: Deterministic Detection First, Then Optional Cloudflare RAG Grounded in Supabase (Chosen)

- **Pros:** Preserves canonical facts, creates durable issue records, supports deterministic tests and confidence rules, reuses curated remediation knowledge, and keeps retrieval tenant-scoped.
- **Cons:** Requires issue persistence, detector versioning, backend evidence contracts, and a separately operated retrieval index.
- **Chosen because:** it matches the service workflow, minimizes hallucination risk, and scales the knowledge layer without duplicating authoritative state.

## 4. Decision Outcome

**Chosen Option: deterministic issue detection with authoritative Supabase issue documents and auxiliary Cloudflare RAG for grounded expert assistance.**

### 4.1 Authority Boundaries

- Canonical RUM facts and bounded diagnostic evidence are the telemetry source of truth.
- Structured WordPress backend tests are the backend source of truth.
- Deterministic detectors establish issue existence, type, scope, sample counts, confidence, and candidate cause.
- Supabase issue documents are the authoritative diagnosis and workflow record.
- Vectorize is a retrieval index over approved issue documents and curated playbooks, never the authoritative datastore.
- A language model may summarize, retrieve precedents, and draft remediation guidance. It may not publish an issue, change its scope, or override evidence and confidence rules.

### 4.2 Detection and Issue Model

Detection runs asynchronously and idempotently. A scheduled Cloudflare Worker or equivalent service reads authorized site scopes, calls versioned service-role-only detection RPCs, aggregates canonical evidence into recurring issue families, and upserts issue documents. Browser requests do not run detection or submit authoritative evidence.

Each issue has a stable fingerprint derived from site, issue type, page template, target or asset, and material cohort. Publication requires the scope-specific pageview and session thresholds already defined in the issue-document contract. A cohort issue must also be materially worse than the site baseline.

### 4.3 WordPress Correlation

WordPress backend tests are formalized and versioned. They cover cache effectiveness, asset-to-plugin ownership, plugin weight, media delivery, and origin behavior. A plugin or theme may be named as a confirmed cause only when a backend test or direct asset evidence confirms ownership. Otherwise the issue identifies the asset or symptom and marks the cause as probable.

### 4.4 Issue-First Product Experience

The Web Vitals dashboard changes its primary unit from elements to detected issues. Existing LCP, CLS, INP, and TTFB evidence remains available as a secondary drilldown. Each issue card presents what happened, where it happened, the supporting evidence and sample count, the confirmed or likely cause, a targeted fix, expected impact, and verification guidance.

Supported workflow states are `detected`, `reviewed`, `in_progress`, `fixed`, `verified`, `resolved`, and `dismissed`. Experts can attach an issue to a managed WordPress order, add notes, record a fix, compare before and after RUM, and verify or reopen the issue.

### 4.5 Analysis and Retrieval Security

Every analysis and retrieval request requires an authenticated user. The server resolves tenant, site, domain, and entitlement from authoritative records. A client-provided domain or contributor row is not proof of access and is not accepted as authoritative issue evidence. Inputs are bounded and validated, errors are structured, and model endpoints are rate limited.

Tenant and site filters are applied before retrieval. Retrieval uses a tenant namespace plus low-cardinality metadata filters. Cross-tenant access attempts, missing evidence, low samples, and conflicting evidence fail closed with explicit responses.

### 4.6 Grounded Remediation Retrieval

The initial retrieval corpus contains approved resolved issue documents from the authorized tenant, curated WordPress remediation playbooks, versioned plugin and theme performance guidance, and backend-test interpretation rules. Raw pageviews, every contributor row, raw events, raw backend logs, and unbounded plugin descriptions are never indexed.

The retrieval flow resolves tenant and site on the application server, retrieves 5 to 10 candidates, loads current issue documents and aggregates from Supabase, and then generates a response with citations. Retrieval similarity alone cannot establish the current diagnosis or select an authoritative remediation.

### 4.7 Fix Verification

A fix is not verified from a single improved pageview. Verification compares the same page template, metric, and material cohort across comparable observation windows. Where traffic permits, the after window contains at least seven complete UTC days. The result records p50, p75, affected-pageview rate, sample count, and confidence so service impact can be measured.

## 5. Privacy, Prompt-Injection, and Cost Controls

- Store and retrieve only bounded, approved issue knowledge and curated guidance.
- Treat WordPress plugin text and other external content as untrusted reference material, never as instructions.
- Exclude document instructions and page content from model authority; the model cannot change tool or database permissions.
- Require authenticated tenant-scoped retrieval and current Supabase grounding.
- Cache deterministic detection and aggregate reads where freshness permits.
- Cache or batch embeddings by document version and avoid re-embedding unchanged issue documents.
- Rate limit analysis and retrieval per user, tenant, and site.
- Emit structured metrics for request count, latency, token use, embedding use, retrieval count, and AI cost.
- Delete or supersede vectors when the source document is deleted, resolved, or no longer approved, according to the issue-document retention policy.

## 6. Consequences and Trade-offs

### Positive

- Detection becomes reproducible, testable, and auditable.
- Issue cards connect real-user symptoms to targeted WordPress remediation.
- Supabase remains authoritative while Vectorize stays a replaceable auxiliary index.
- Experts can reuse successful fixes and curated playbooks without repeating investigations.
- Service outcomes become measurable through verified RUM improvement.
- Tenant and site isolation are enforced before evidence loading and retrieval.

### Negative and Mitigations

- **Additional persistence and detector complexity:** mitigated by versioned RPCs, idempotent upserts, stable fingerprints, and fixture-based detector tests.
- **Backend correlation lag:** mitigated by displaying probable causes until corroboration arrives and recording confidence explicitly.
- **Retrieval and model operating cost:** mitigated by deterministic issue-level indexing, caching, batching, rate limits, and cost metrics.
- **Prompt injection through plugin or page text:** mitigated by bounded corpora, untrusted-content labeling, filtered retrieval, and a model that cannot authorize writes or expand scope.
- **Historical evidence loss after raw retention:** mitigated by bounded derived evidence on long-lived issue documents.
- **More complex dashboard transition:** mitigated by retaining element evidence as a secondary drilldown during staged rollout.

## 7. Implementation and Verification Boundaries

The implementation sequence, phase gates, schema contract, API responsibilities, rollout rules, and success metrics belong in:

`docs/plans/2026-11-25_041449_evidence_first_issue_diagnosis_and_grounded_remediation.md`

## 8. References

- Product goals: `docs/GOALS.md`
- Compact telemetry ADR: `docs/adr/0004-compact-rum-telemetry-and-rag-knowledge-model.md`
- Focused dashboard ADR: `docs/adr/0005-focused-rum-dashboard-and-data-retirement.md`
- Hot and cold retention ADR: `docs/adr/0006-hot-cold-rum-history-retention.md`
- Issue document system: `docs/systems/issue-knowledge-documents.md`
- Analytics pipeline system: `docs/systems/analytics-pipeline.md`
- Workers AI embedding model: https://developers.cloudflare.com/workers-ai/models/bge-small-en-v1.5/
- Vectorize limits: https://developers.cloudflare.com/vectorize/platform/limits/
- Vectorize metadata filtering: https://developers.cloudflare.com/vectorize/reference/metadata-filtering/
