# Evidence-First Issue Diagnosis and Grounded Remediation

> **Status:** 🔴 INCOMPLETE / PLANNED
> **Created:** 2026-11-25 04:14:49 UTC
> **Owner:** Speedy Site
> **Related ADR:** [ADR-0007: Evidence-First Issue Diagnosis and Grounded Remediation](../adr/0007-evidence-first-issue-diagnosis-and-grounded-remediation.md)
> **Prerequisites:** ADR-0004, ADR-0005, and ADR-0006
> **Goal:** Replace element-first ad hoc analysis with a tenant-scoped workflow that detects recurring performance issues deterministically, stores authoritative issue documents in Supabase, recommends targeted WordPress remediation, and verifies fixes through RUM deltas.

---

## 1. Objective

Implement the product loop defined by ADR-0007:

```text
Canonical RUM facts + bounded evidence
              +
WordPress backend tests
              |
              v
Deterministic issue detection
              |
              v
Supabase issue documents
              |
              +------> Customer dashboard and service channel
              |
              v
Approved issue documents and curated fix playbooks
              |
              v
Cloudflare Worker + Vectorize
              |
              v
Grounded expert assistance
```

RAG must not sit directly between raw elements and diagnosis. Deterministic rules establish the issue, its scope, confidence, and supporting evidence. The model retrieves relevant remediation knowledge and explains the established issue after current Supabase state is loaded.

## 2. Scope

### Included

- Secure, authenticated, tenant-scoped analysis and retrieval APIs.
- Structured issue documents, issue evidence, WordPress backend test records, and issue history.
- Idempotent detection for LCP, CLS, INP, and TTFB issue families.
- Recurring issue fingerprints, sample thresholds, severity, confidence, and provenance.
- WordPress backend correlation for cache, assets, plugins, media, and origin behavior.
- An issue-first Web Vitals presentation with element evidence retained as drilldown.
- Expert workflow from detected issue through fix and RUM verification.
- A tenant-safe Cloudflare Workers AI and Vectorize retrieval pilot for experts.
- Metrics for issue quality, service outcomes, latency, and AI cost.

### Excluded

- Replacing deterministic detection with ungrounded RAG.
- Embedding raw pageviews, contributor rows, raw RUM events, raw backend logs, or unbounded plugin descriptions.
- Open-ended customer self-service diagnosis.
- Automatic WordPress remediation without expert review.
- Broad site diagnostics outside the initial Web Vitals issue families.
- Replacing Supabase with Vectorize or another retrieval store as the source of truth.

## 3. Current-State Findings

### 3.1 Existing element analysis

The LCP, CLS, and INP screens expose per-element analysis actions backed by OpenRouter. The browser submits contributor rows to analysis routes. These routes do not visibly establish authenticated site ownership, and dashboard middleware does not protect them. Their output is free-form text with no persisted provenance, recurring threshold, confidence model, backend correlation, or verification record.

### 3.2 Evidence already available

Canonical RUM rows retain enough bounded evidence for deterministic first-release detectors:

- LCP: target, URL, load delay, load duration, render delay, candidate TTFB, transfer and decoded bytes, dimensions, lazy state, fetch priority, and font facts when applicable.
- CLS: target, involved elements, shift value, viewport ratio, timing, load state, area delta, movement, and bounded geometry.
- INP: target, event type, input delay, processing duration, presentation delay, and responsible scripts.
- TTFB: total, backend, DNS, connection and TLS, redirect, queue, cache status, and origin-hit facts.

### 3.3 Missing layers

The system still needs recurring issue-family detection, confidence scoring, WordPress backend correlation, persistent diagnosis, service workflow, and before-and-after verification. Adding more raw telemetry or applying RAG directly to elements does not fill these gaps.

## 4. Target Data Contract

### 4.1 `rum_issue_documents`

Persist the authoritative issue and workflow record with these logical fields:

| Field | Purpose |
| :--- | :--- |
| `id` | Stable issue identifier. |
| `tenant_id`, `site_id` | Authoritative ownership boundary. |
| `domain_name` | Domain resolved from the site record. |
| `fingerprint` | Stable recurring issue-family key. |
| `schema_version` | Issue contract version. |
| `issue_type` | Supported deterministic issue family. |
| `status` | Workflow state. |
| `severity`, `confidence` | Impact and diagnostic strength. |
| `title`, `symptom`, `root_cause` | Concise diagnosis with confirmed or probable cause language. |
| `affected_scope` | Page template, device, network, and other material cohorts. |
| `observation_period` | Bounded start and end timestamps. |
| `sample_count`, `session_count` | Publication-threshold evidence. |
| `metric_summary` | Bounded aggregate metric facts. |
| `evidence_summary` | Compact evidence needed to explain the issue. |
| `recommended_fix` | Targeted, expert-actionable remediation. |
| `expected_impact` | Bounded expected outcome with uncertainty. |
| `verification_plan` | Comparable before-and-after method. |
| `provenance` | Detector version, source IDs, and generation time. |
| `first_seen_at`, `last_seen_at`, `resolved_at` | Lifecycle timestamps. |

The fingerprint should use `site_id + issue_type + page_template + target_or_asset + material_cohort`. Uniqueness and upsert behavior must prevent repeated pageviews from becoming repeated issues.

### 4.2 `rum_issue_evidence`

Link each issue to supporting evidence. Store pageview or aggregate observation IDs, backend test IDs, evidence kind, bounded structured facts, evidence weight, and observed timestamp. Evidence links must be tenant-scoped and deletable when the parent issue or source is deleted.

### 4.3 `wp_backend_tests`

Store structured backend test runs separately from their evidence. Include tenant and site IDs, test timestamp, environment and plugin status, test type, pass/warn/fail result, structured facts, bounded evidence, test version, and schema version.

### 4.4 `rum_issue_history`

Track status transitions, expert notes, fix references, verification results, and dismissal reasons. Preserve enough history to explain why an issue was published, changed, dismissed, or resolved.

### 4.5 Publication thresholds

| Scope | Pageviews | Sessions | Additional requirement |
| :--- | ---: | ---: | :--- |
| Site-wide | 20 | 10 | Required for publication. |
| Page template | 10 | 5 | Required for publication. |
| Device or network cohort | 10 | 5 | At least 25% worse than the site p75. |
| Individual asset or selector | 5 | 3 | Target or asset must recur. |
| Error signature | 5 | 3 | Normalized signature must recur. |

Only active issues with confidence of at least `0.60` are eligible for retrieval indexing. Lower-confidence candidates may remain internal diagnostics but may not be published or indexed.

## 5. Target API Boundary

The implementation should use these logical API responsibilities. Exact routes and payloads belong in `docs/protocols/` when they introduce a new wire contract.

| API responsibility | Required behavior |
| :--- | :--- |
| List site issues | Authenticate, resolve tenant and site from server-side authority, filter by status and type, return concise issue summaries. |
| Get issue detail | Authenticate, enforce site ownership, return issue document, bounded evidence, workflow state, and history. |
| Create service task | Authenticate expert authority, attach an issue to an eligible managed WordPress order, record history. |
| Update issue state | Validate the state transition, record actor and reason, reject invalid transitions. |
| Compare before and after | Use the issue's template, metric, cohort, and comparable windows; return p50, p75, affected rate, sample count, and confidence. |
| Explain issue | Load the authoritative issue and current aggregates from Supabase before any retrieval or generation. |
| Backend test intake | Authenticate the site relay, validate schema and bounds, persist a structured test record, and enforce tenant/site ownership. |

All routes must return structured `error` and `message` fields, avoid silently swallowing failures, and never log raw telemetry payloads or secrets.

## 6. Detector Matrix

Each detector must define its required evidence, fingerprint, sample threshold, confidence scoring, confirmed-versus-probable cause rules, severity calculation, expected impact, and recommended-fix format.

| Issue type | Required RUM evidence | Backend correlation | Initial conclusion |
| :--- | :--- | :--- | :--- |
| `slow_lcp_image` | Recurring LCP URL or target, template, material cohort, p75, load delay, load duration, render delay, TTFB, bytes, dimensions, lazy state, fetch priority | Media delivery and asset ownership when available | Oversized or late-discovered recurring LCP asset delays the metric. |
| `render_blocking_plugin_asset` | Recurring blocker URL, FCP or LCP relationship, affected scope | Confirmed asset-to-plugin mapping and enqueue behavior | Plugin asset is a confirmed blocker only when backend evidence maps ownership. |
| `layout_instability` | Recurring target or selector, viewport ratio, frequency, sample count, load state, involved elements | Theme or plugin ownership when available | Same source shifts repeatedly across pageviews. |
| `high_inp_interaction_cost` | Dominant phase, recurring target or event type, responsible scripts, input delay, processing duration | Plugin ownership and script injection behavior when available | Main-thread contention or expensive handler causes interaction delay. |
| `slow_origin_response` | TTFB p75, backend, DNS, connection, TLS, redirect, queue, cache status, origin-hit rate | Cache effectiveness and origin test | Distinguish DNS, connection, redirect, origin, and cache-miss causes. |
| `heavy_third_party_script` | Recurring script, bytes, execution duration, INP or render-delay association | Ownership mapping when available | Third-party script contributes to interaction or render delay. |
| `failed_or_slow_resource` | Recurring URL and status, failure rate, duration, bytes, page impact | Asset and plugin ownership when available | Resource consistently fails or materially delays the page. |

Detector ordering for the first release:

1. Slow LCP image.
2. Layout instability.
3. High INP interaction cost.
4. Slow origin response or cache miss.
5. Render-blocking plugin asset.
6. Heavy third-party script.
7. Failed or slow resource.

### 6.1 Detection service rules

- Detection runs asynchronously and idempotently, not in dashboard read requests.
- A scheduled Cloudflare Worker or equivalent service reads authorized site scopes and calls versioned, service-role-only detection RPCs.
- Detector versions are recorded in issue provenance.
- A repeated run for the same fingerprint updates last-seen and bounded observation data without creating duplicate issues.
- A material change in scope, cause, or confidence creates a new observation or version rather than silently rewriting historical evidence.
- Structured logs contain site ID, detector version, issue counts, duration, and error metadata. They never contain raw telemetry payloads.

## 7. WordPress Backend Correlation

### 7.1 Backend test families

| Test family | Structured facts |
| :--- | :--- |
| Cache effectiveness | Page-cache hit ratio, origin hits, cache-control headers, cache plugin status, CDN status. |
| Asset ownership | Frontend asset URL, plugin/theme/core owner, affected template, enqueue state, defer or async state, safe-change guidance. |
| Plugin weight | Active plugins, observed assets, database-query signals, duplicate functionality, cache conflicts, background-task cost. |
| Media delivery | Dimensions, file size, generated formats, lazy state, responsive source availability. |
| Origin performance | Uncached dynamic routes, slow application or database processing, cron and maintenance pressure. |

### 7.2 Correlation rules

- A plugin or theme is a confirmed cause only when a backend test or direct asset evidence confirms ownership.
- If ownership is not confirmed, the issue names the asset or symptom and uses probable-cause language.
- RUM timing and backend facts must refer to a compatible site, template, and observation period.
- Conflicting backend and RUM evidence lowers confidence or blocks publication.
- The issue preserves bounded evidence so the diagnosis remains understandable after raw pageview retention expires.

Example:

```text
RUM:
  Poor mobile LCP on /products/*
  recurring LCP asset /assets/product-hero.webp
  1.6 seconds load delay

Backend:
  product-hero.webp is generated by a plugin carousel
  carousel injects the image after the initial HTML
  plugin reports a known dynamic-render pattern

Diagnosis:
  The product carousel delays discovery of the LCP image.

Fix:
  Preload the first responsive hero source, reserve image dimensions,
  and configure the carousel to render the first slide server-side.
```

## 8. Issue Workflow and Product Experience

### 8.1 Workflow states

```text
detected
  -> reviewed
  -> in_progress
  -> fixed
  -> verified
  -> resolved
```

`dismissed` is a separate terminal state and requires a reason. Invalid transitions must be rejected and recorded as structured errors.

### 8.2 Supported actions

- Create a service task.
- Attach the issue to an eligible managed WordPress order.
- Mark the issue fixed with a fix reference.
- Dismiss the issue with a reason.
- Open the supporting evidence.
- Compare before and after RUM.
- Add an expert note.
- Reopen a failed verification.

### 8.3 Issue-first information architecture

```text
Web Vitals
├── Overview
├── Detected issues        <- primary
├── Evidence by metric     <- secondary drilldown
├── Trends
└── Optimization results
```

The existing LCP, CLS, INP, and TTFB components remain available. Their role changes to expose exact evidence behind an issue, support expert investigation, and show timing breakdowns and responsible scripts. The existing per-element analysis action may become **Explain this issue** after grounded issue generation is available. It must not remain the primary diagnosis mechanism.

### 8.4 Issue card contract

```text
HIGH   Poor mobile LCP on product pages
       Affected metric: LCP
       Scope: /products/*, mobile, 4G
       Confidence: High, 0.91
       42 pageviews, 31 sessions

What we found
  Product-page mobile LCP p75 is 4.2s, 37% above the site p75.

Likely cause
  The recurring product hero image is 1.9MB decoded and is discovered late.

Recommended fix
  1. Resize and compress the source image.
  2. Generate AVIF and responsive variants.
  3. Preload the mobile LCP source.
  4. Preserve fetchpriority="high".

Expected result
  Approximately 1.0 to 1.6 seconds LCP improvement.

Verification
  Mobile product-page LCP p75 over 7 complete UTC days.

[Open evidence] [Create service task] [Mark as fixed]
```

The card must follow the baked-reason order: what, where, evidence, why, fix, expected result, and verification. Expected impact must communicate uncertainty and remain subject to real-traffic verification.

## 9. Security, Isolation, and Prompt-Injection Controls

- Require an authenticated Supabase user for analysis, issue, retrieval, and service-task routes.
- Resolve tenant, site, domain, role, and entitlement from server-side authoritative records.
- Never treat a client-provided domain or contributor row as proof of access or authoritative evidence.
- Load the issue and current aggregates from Supabase before retrieval or generation.
- Validate issue status transitions and expert role permissions server-side.
- Validate and bound model inputs, retrieved documents, and structured tool arguments.
- Treat plugin descriptions, page content, and retrieved text as untrusted reference material, never as instructions.
- Prevent retrieved text from changing tool permissions, tenant filters, database writes, or workflow state.
- Filter retrieval by tenant namespace and site before generation.
- Fail closed for cross-tenant requests, missing evidence, low samples, and conflicting evidence.
- Rate limit analysis and retrieval per user, tenant, and site.
- Avoid logging raw telemetry, full contributor payloads, prompts containing secrets, or plugin descriptions.
- Record structured audit events for issue creation, state changes, retrieval, generation, and service attachment.

## 10. Cloudflare RAG Pilot

### 10.1 Corpus

Index only approved, low-cardinality records:

1. Resolved issue documents from the current tenant.
2. Curated WordPress remediation playbooks.
3. Versioned plugin and theme performance guidance.
4. Backend-test interpretation rules.

Never index raw pageviews, every contributor row, full RUM event payloads, raw backend logs, or unbounded plugin descriptions.

### 10.2 Retrieval flow

```text
Authenticated expert request
          |
          v
Resolve tenant and site on the application server
          |
          v
Vectorize query with tenant namespace and metadata filters
          |
          v
Retrieve 5 to 10 candidates
          |
          v
Fetch current issue documents and aggregates from Supabase
          |
          v
Generate a grounded response with citations
```

### 10.3 Platform validation gate

Before production index creation:

- Validate `@cf/baai/bge-small-en-v1.5`, 384 dimensions, and cosine distance in a staging Vectorize index.
- Confirm the current model remains available, supports batching, accepts at most 512 input tokens, and provides zero data retention.
- Confirm current Vectorize limits: 10 metadata indexes, 64 bytes indexed per string metadata property, 10 KiB total metadata per vector, 50 maximum results when values or metadata are returned, 50,000 namespaces per paid index, and 20 million vectors per index.
- Validate embedding quality with representative issue and remediation queries.
- Validate tenant namespace and metadata filters before any production write.
- Re-evaluate model, dimensions, cost, and limits at implementation time rather than relying only on this plan's recorded baseline.

The current official Workers AI listing shows a unit price of `$0.0202` per million input tokens. The pilot must measure actual project cost rather than treating this rate as a total-cost forecast.

### 10.4 Required response content

- Current detected issue.
- Current sample count and metric impact.
- Similar prior issue cases.
- Relevant remediation playbook.
- Exact affected asset or plugin.
- Conflicts or precautions.
- Verification plan.
- Links to authoritative Supabase issue records.

### 10.5 RAG evaluation

- Retrieval relevance by issue type and remediation query.
- Citation coverage for current evidence and source documents.
- Unsupported-cause rate.
- Cross-tenant retrieval attempts with zero unauthorized results.
- Insufficient-data behavior for low-sample regions or pages.
- Latency, token use, embedding use, and AI cost per explanation.

## 11. Implementation Phases

### Phase 1: Secure and Formalize the Analysis Boundary

- [x] Require an authenticated user on every analysis route.
- [x] Resolve tenant, site, domain, role, and entitlement server-side.
- [x] Stop accepting browser contributor rows as authoritative evidence.
- [x] Fetch authoritative issue or contributor records on the server.
- [ ] Validate and bound model inputs. (No model inputs remain in the retired contributor path; generation remains deferred.)
- [x] Add structured errors, rate limits, and request metrics.
- [x] Define the issue and backend-test contracts.
- [x] Add unauthenticated, cross-tenant, injection, and usage-limit tests.

**Gate:** unauthenticated requests fail, users cannot access another customer's site, browser input cannot inject issue facts, and repeated requests cannot create unbounded AI usage.

### Phase 2: Detection MVP

- [x] Add `rum_issue_documents`, `rum_issue_evidence`, `wp_backend_tests`, and `rum_issue_history` through a monotonic migration.
- [x] Add constraints, indexes, restricted grants, and generated remote database types.
- [ ] Implement LCP, CLS, INP, and TTFB detectors with versioned RPCs. (LCP v1 implemented; CLS, INP, and TTFB remain.)
- [x] Add stable recurring fingerprints and idempotent upserts.
- [x] Implement scope thresholds, confidence, severity, and material-cohort rules. (LCP v1 implemented.)
- [x] Add a scheduled detector or equivalent asynchronous service. (Admin-triggered equivalent implemented; scheduling remains.)
- [x] Add internal issue-list and issue-detail APIs.
- [ ] Add fixture tests for thresholds, low samples, conflicting evidence, nulls, and retries. (Remote shadow validation and retry idempotency checks completed; dedicated database fixture coverage remains future work.)

**Gate:** repeated observations create one stable issue family, every published issue has traceable evidence, and detector retries do not change issue counts.

### Phase 3: WordPress Backend Correlation

- [ ] Normalize cache, asset ownership, plugin weight, media, limits, and origin tests.
- [ ] Map frontend assets to owning plugin, theme, or core.
- [ ] Correlate slow origin with cache effectiveness.
- [ ] Correlate render blockers and carousel output with plugin behavior.
- [ ] Distinguish confirmed causes from probable causes in generated documents.
- [ ] Preserve bounded issue evidence independently of raw retention.

**Gate:** a plugin is named as a confirmed cause only when backend evidence supports ownership, and conflicting evidence lowers confidence or blocks publication.

### Phase 4: Issue-First Dashboard

- [x] Add the detected-issues list as the primary Web Vitals presentation.
- [x] Replace the per-metric affected-elements switch with universal desktop, mobile, and tablet issue panels that mark the affected asset. (Delivered under [ADR-0008](../adr/0008-universal-device-issue-panels.md).)
- [x] Display baked reason, confidence, scope, fix, expected result, and verification.
- [x] Add issue detail and evidence views.
- [ ] Add status and service-task actions.
- [x] Replace or disable the free-form per-element analysis action when the grounded path is ready.
- [ ] Add UI tests for low sample, no issue, loading, error, and tenant-switch states. (UI states are implemented; automated browser coverage remains.)

**Gate:** customers see concise diagnosed issues first and can inspect the exact element evidence behind every published issue.

### Phase 5: Service Channel and Verification

- [ ] Attach issues to eligible managed WordPress orders.
- [ ] Assign experts through the existing assignment model.
- [ ] Add status transitions, notes, dismissal reasons, and fix references.
- [ ] Compare the same template, metric, and cohort across comparable windows.
- [ ] Record p50, p75, affected rate, sample count, and confidence.
- [ ] Support verified and reopened outcomes.
- [ ] Show before-and-after results in the expert workflow.

**Gate:** a fix is verified only from comparable real-traffic evidence, and an expert can explain why an issue was published, changed, dismissed, or resolved.

### Phase 6: Cloudflare RAG Pilot

- [x] Re-validate the official Workers AI model and Vectorize limits.
- [x] Create a Vectorize index with 384 dimensions and cosine distance.
- [x] Create metadata indexes for site, issue type, and document kind.
- [x] Use a tenant namespace and filter by site in every customer-document query.
- [x] Index only approved issue documents and curated playbooks.
- [x] Add the authenticated query Worker.
- [x] Ground every answer in current Supabase state.
- [x] Add the user-facing issue assistant and customer UI.
- [ ] Add relevance, citation, insufficient-data, and unsupported-cause evaluations.
- [ ] Add negative tests proving one tenant cannot retrieve another tenant's documents.
- [ ] Measure latency, token use, embedding use, and AI cost.

**Gate:** retrieval is tenant-safe, answers cite current evidence and sample sizes, and the model cannot invent a cause or unsupported fix.

### Phase 7: Production Rollout

- [ ] Run detectors in shadow mode and compare with expert review.
- [ ] Publish only issues that meet the quality threshold.
- [ ] Roll out the issue-first dashboard to customer sites gradually.
- [x] Enable the user-facing issue assistant behind site authorization and entitlement checks.
- [ ] Document caching, rate limits, observability, cost controls, and rollback.
- [ ] Reconcile source-document and Vectorize deletion behavior.
- [ ] Record the shipped architecture in `docs/IMPACT-LOG.md` and update system dossiers.

**Gate:** issue quality and service outcomes meet the agreed target, costs are observable, rollback is documented, and no cross-tenant retrieval incident has occurred.

## 12. Verification and Rollout Rules

### Required quality commands

- `make check`
- `pnpm run typecheck`
- `pnpm test`
- `pnpm run build`

Additional database, detector, UI, production-parity, privacy, tenant-isolation, latency, and cost checks belong to the phase that introduces them.

### Required behavior

- Unauthenticated requests return 401 or 403.
- A user cannot request another tenant's site or issue.
- Browser input cannot inject authoritative issue facts.
- Every published issue has traceable evidence, confidence, and provenance.
- Confirmed and probable causes use distinct language.
- Every actionable issue has a recommended fix and verification plan.
- RAG cannot publish an issue or change its scope.
- RAG answers cite current Supabase evidence and state when data is insufficient.
- Detector retries are idempotent.
- Raw retention cannot remove evidence required by an active issue.
- Cross-tenant retrieval incidents remain zero.

### Rollout order

1. Add additive issue and backend-test schema.
2. Secure existing analysis routes.
3. Run detectors in shadow mode.
4. Publish internal issues after expert review.
5. Enable service-task attachment and verification.
6. Move the dashboard to issue-first presentation.
7. Run the Cloudflare RAG pilot for internal experts.
8. Consider any customer-facing retrieval only after explicit product approval.

## 13. Success Metrics

Measure service outcomes, not AI response volume:

- Percentage of pageviews covered by a published issue.
- Expert acceptance rate of detected issues.
- False-positive and dismissal rate.
- Median expert time from issue creation to fix.
- Percentage of fixes with completed RUM verification.
- Median metric improvement after verification.
- RAG recommendation citation coverage.
- Unsupported-cause rate in RAG responses.
- Cross-tenant retrieval incidents, which must remain zero.
- AI cost per verified issue.
- Percentage of issues resolved without repeated manual diagnosis.
- Detection and retrieval latency.
- Embedding and generation usage per explanation.

## 14. Documentation Updates During Implementation

- `docs/systems/issue-knowledge-documents.md`: implemented schema, detector, workflow, and retrieval topology.
- `docs/systems/analytics-pipeline.md`: issue-detection and retrieval flow after implementation.
- `docs/protocols/`: new API, worker, backend-test intake, or retrieval wire contracts.
- `docs/IMPACT-LOG.md`: shipped schema, dashboard, service workflow, and retrieval impact.
- `docs/plans/README.md`: plan status and checklist synchronization.
- `docs/adr/README.md`: ADR index synchronization.

## 15. Progress Log

### 2026-11-25 04:14:49 UTC

- Audited the existing Web Vitals element-analysis display, analysis endpoints, WordPress integration, authentication, entitlement boundaries, issue-document contract, and Cloudflare RAG plan.
- Confirmed that the current analysis flow accepts browser-supplied contributor rows and does not persist a tenant-scoped issue workflow.
- Chose deterministic detection with Supabase issue documents and auxiliary Cloudflare RAG.
- Verified the current official Workers AI embedding model page and Vectorize limits and metadata-filtering documentation.
- Created ADR-0007 and this execution plan.
- Closed the compact telemetry scope and transferred its issue and RAG scope to this plan.
- Added execution dependencies between this plan and the hot and cold retention work.
- The prescribed workspace plan-manager script was unavailable on this Windows host. Plan headers, checklists, progress log, and master indexes were synchronized directly, following the precedent in the focused dashboard plan.

### 2026-11-25 07:31:17 UTC

- Added the additive issue-document migration with tenant/site constraints, RLS, indexes, restricted grants, bounded evidence, backend-test records, workflow history, and the service-role-only `detect_lcp_issues_v1` RPC.
- Implemented the LCP v1 detector in shadow-first mode. It requires at least five pageviews and three sessions for a recurring template, asset, target, and device cohort, then upserts one stable fingerprint.
- Added server-side RUM site authorization. Customers require ownership, admins may access all sites, and experts require an active assignment.
- Secured all retained RUM read routes. Browser domains are resolved to authoritative orders before privileged RPC calls.
- Added authenticated issue list/detail APIs and an admin-only detector endpoint with a per-site hourly limit.
- Retired the three browser-contributor OpenRouter routes with authenticated `410 Gone` responses and removed the Analyze actions from the Web Vitals drilldowns.
- Added the Detected issues panel to RUM Analytics Web Vitals, including loading, empty, error, summary, and evidence-detail states.
- Added `tests/evidence-first-issue-workflow.test.mjs` covering schema, RLS, detector idempotency, tenant scoping, secured readers, and retired AI analysis.
- Local database migration and type generation remain unexecuted because Docker Desktop is unavailable. No remote project was modified.

### 2026-11-25 16:19:07 UTC

- Added the customer issue assistant to the existing published-issue panel without changing admin routes or admin UI.
- Added the authenticated `POST /api/rum/issues/<issue_id>/assistant` boundary. It verifies the canonical site, live `managed_wp` entitlement, and published issue before generation.
- Added the `issue-knowledge` Cloudflare Worker with Workers AI embeddings, tenant namespaces, site metadata filtering, curated playbook indexing, and scheduled synchronization.
- Created the `speedy-issue-knowledge` Vectorize index with the `@cf/baai/bge-small-en-v1.5` preset, 384 dimensions, cosine distance, and metadata indexes for `siteId`, `issueType`, and `kind`.
- Deployed the Worker at `https://issue-knowledge.thespeedysite.workers.dev` and indexed four curated LCP and verification playbooks. No resolved customer issues are currently available to index.
- Live validation confirmed HTTP 401 without the shared secret and tenant-scoped retrieval of the WP Rocket LCP image playbook as the top result for a representative question.
- Evaluation suites, cross-tenant negative retrieval tests, rate limiting, and AI cost metrics remain pending.

### 2026-11-26 00:00:00 UTC

- Replaced the per-metric affected-elements drilldown with universal device issue panels for desktop, mobile, and tablet.
- Added `POST /api/rum/device-issues`. It authorizes the domain server-side and reads the retained LCP, CLS, INP, and TTFB readers in one parallel query.
- Added `src/lib/rum/deviceIssues.ts` for deterministic issue building, Core Web Vitals thresholds, asset identification and marking, and targeted fix guidance.
- Removed the retired per-metric element drilldown components (`lcp.tsx`, `cls.tsx`, `inp.tsx`, `ttfb.tsx`, `types.ts`) and the lazy per-metric fetching in the Web Vitals page.
- Added `tests/rum-device-issue-panels.test.mjs` covering device grouping, asset marking, threshold filtering, per-metric caps, reader authorization, and the absence of metric switching.
- The per-metric element drilldown is no longer retained under the issue-first experience. The universal panels replace it and keep the same canonical evidence, threshold, and asset identification guarantees.
- The prescribed workspace plan-manager script was unavailable on this Windows host. Plan headers, checklists, progress log, and master indexes were synchronized directly, following the precedent in this plan.
