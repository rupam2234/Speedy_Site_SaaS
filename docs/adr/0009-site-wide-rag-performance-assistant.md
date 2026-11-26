# ADR-0009: Site-Wide RAG Performance Assistant

> **Status:** Accepted
> **Date:** 2026-11-26
> **Decision-Makers:** Core Engineering Team
> **Supersedes:** None
> **Refines:** ADR-0005, ADR-0007, ADR-0008

---

## 1. Context

ADR-0007 made detected issues the primary unit of the Web Vitals dashboard and added a per-issue assistant so a customer could ask how to apply a recommended fix. ADR-0008 replaced the per-metric element drilldown with universal per-device issue panels.

Three problems remained with that shape:

- The assistant was reachable only from inside one expanded issue. A customer who wanted to know what to fix first, or which page was hurting them, had to open a specific issue before they could ask.
- The assistant saw one issue at a time. Site-wide questions such as "which pages are slow on mobile" had no supporting device findings in the prompt, so the model had to answer from a narrow slice of the evidence.
- Every question cost one Workers AI embedding and one Vectorize query, with no caching at either the application or Worker boundary. Repeated or rephrased questions were billed again.

The dashboard was also carrying two separate surfaces for the same underlying facts: the detected-issues list and the per-device issue panels.

## 2. Decision Drivers

- Let a customer ask site-wide performance questions, not only per-issue questions.
- Give the model the same structured facts the customer sees, so the answer and the panel agree.
- Keep browser input from defining performance facts.
- Keep the evidence-first contract of ADR-0007: canonical facts, server-resolved authority, untrusted retrieval material.
- Bound Cloudflare Workers AI and Vectorize spend per question.
- Remove duplicate surfaces rather than add a third one.

## 3. Considered Alternatives

### Alternative A: Keep the per-issue assistant and add site-wide prompts to it

- **Pros:** Smallest change; no new page.
- **Cons:** The customer still had to open an issue to start a conversation, and the prompt still only carried one issue. The site-wide questions that motivated the request remained unanswerable.
- **Rejected because:** it treats the symptom. The navigation shape was the problem.

### Alternative B: A chat page with no structured context panel

- **Pros:** Simple layout; the chat carries everything.
- **Cons:** The customer cannot see which measurements the answer was grounded in, and the model would still need the facts in its prompt. The panel and the prompt would be built from two separate code paths that could drift.
- **Rejected because:** the customer needs the evidence next to the answer, and one server loader should feed both.

### Alternative C: Browser supplied facts in the prompt

- **Pros:** No server context loader.
- **Cons:** The browser would define measurements, counts, pages, and scope. That breaks the ADR-0007 guarantee and allows a client to make the model assert invented performance facts.
- **Rejected because:** it is a correctness and trust regression, not a cost saving.

### Alternative D: Site-scoped assistant with server-derived structured context, multi-layer caching, and a lower retrieval window (Chosen)

- **Pros:** One server loader produces the panel and the prompt from the same facts. Site-wide and focused questions share one endpoint. Caching at the answer, retrieval, and embedding layers removes repeated billable work. The dashboard keeps a single issue surface.
- **Cons:** Adds a page, a route, a shared context loader, and a cache module.
- **Chosen because:** it satisfies every driver and keeps the evidence-first contract intact.

## 4. Decision Outcome

**Chosen Option: a site-scoped assistant page backed by one server-derived context loader, with answer, retrieval, and embedding caching and a reduced retrieval window.**

### 4.1 Page and Navigation

A new route `/dashboard/rum/assistant` presents a two-column workspace. The left column shows the structured performance context for the selected site: published issue facts and a per-device metric summary. The right column is the conversation. A "Performance Assistant" entry is added to the Real User Monitoring group in the sidebar.

The Detected issues section is removed from the Web Vitals page, along with the per-issue assistant panel and the per-issue assistant route. The universal per-device issue panels remain on the Web Vitals page. The assistant page becomes the single customer surface for published issue facts.

### 4.2 Data Boundary

`src/lib/rum/assistantContext.ts` loads the canonical published issue facts from `rum_issue_documents` and the per-device findings from the retained readers. The same loader feeds the context panel and the model prompt, so the panel and the answer cannot disagree. `src/lib/rum/deviceIssueReader.ts` shares the retained RPC queries and deterministic grouping between the assistant context and the device issue panels route.

The browser sends a site identifier, a question, an optional conversation history, and an optional issue focus. It never sends measurements, counts, scope, tenant, or retrieval namespace. The server resolves site authority, checks the live `managed_wp` entitlement, and loads the facts.

### 4.3 Assistant Route

`POST /api/rum/assistant` is the site-scoped conversational boundary. It accepts `site_id`, `question`, optional `issue_id` focus, and optional `history`. The route validates the site, authorizes the caller, enforces the entitlement, applies fixed-window rate limits, loads the server context, retrieves knowledge, and returns a structured answer with `answer`, `citations`, `limitations`, and `sources`. Citations are filtered against the allowed source set, so the model cannot cite a source that was not supplied.

An optional `issue_id` narrows the authoritative facts to one issue, which keeps the focused flow available without a second endpoint. `GET /api/rum/assistant` returns the same structured context for the panel.

### 4.4 Cost Controls

Cloudflare spend is bounded at three layers:

- **Answer cache:** a repeated question for the same site and focus is answered from Upstash without a retrieval call.
- **Retrieval cache:** the retrieval result is cached per tenant, site, focus, and normalized question hash.
- **Embedding cache:** the issue-knowledge Worker caches the embedding vector for a normalized question and caches the retrieval result, using the Workers Cache API.
- **Reduced retrieval window:** the Worker retrieves the top three matches per namespace instead of five.
- **Rate limits:** a site may ask thirty questions per hour and a user may ask one hundred and twenty per hour. Cache and counter failures fail open so availability is never blocked by the cost controls.

### 4.5 Relationship to ADR-0007 and ADR-0008

The guarantees of ADR-0007 §4.1, §4.2, and §4.5 are unchanged: canonical facts remain the telemetry source of truth, the server resolves tenant and site authority, the browser cannot inject evidence, and issue documents remain the authoritative diagnosis and workflow record. ADR-0007 §4.3 placed the assistant inside the issue panel. This ADR moves that assistant to a site-scoped page and widens it, so the issue-scoped assistant route is retired.

The universal device issue panels of ADR-0008 remain in place on the Web Vitals page. Their reader is now shared with the assistant context rather than duplicated, so the thresholds, caps, and grouping stay identical in both surfaces.

## 5. Consequences and Trade-offs

### Positive

- Customers can ask site-wide questions and see the evidence behind the answer in one place.
- The panel and the prompt are generated from one loader, so they cannot drift.
- Repeated questions cost no Workers AI inference and no Vectorize query.
- The dashboard no longer carries two surfaces for the same published issue facts.

### Negative and Mitigations

- **The context panel is a projection, not the full issue document:** it omits the bounded evidence and history collections. Mitigated because the issue list and detail routes remain available for the full record.
- **Caches can serve a slightly stale answer:** the answer cache lives ten minutes and the retrieval cache fifteen. Mitigated because the authoritative facts are reloaded on every request, and only the generated answer is cached.
- **Rate limits can block a legitimate burst:** a site is capped at thirty questions per hour. Mitigated by fail-open counters, so a Redis outage never blocks the customer.
- **Cache keys are hash based:** a key collision would serve the wrong answer. Mitigated by using a truncated SHA-256 digest of the normalized question together with the tenant, site, and focus in the key.

## 6. Implementation and Verification Boundaries

The implementation sequence and verification gate belong in:

`docs/plans/2026-11-26_120026_site_wide_rag_performance_assistant.md`

## 7. References

- Product goals: `docs/GOALS.md`
- Evidence-first issue diagnosis: `docs/adr/0007-evidence-first-issue-diagnosis-and-grounded-remediation.md`
- Universal device issue panels: `docs/adr/0008-universal-device-issue-panels.md`
- Focused dashboard: `docs/adr/0005-focused-rum-dashboard-and-data-retirement.md`
- Analytics pipeline system: `docs/systems/analytics-pipeline.md`
- Issue knowledge documents: `docs/systems/issue-knowledge-documents.md`
- RUM issue API contract: `docs/protocols/rum-issue-api.md`
