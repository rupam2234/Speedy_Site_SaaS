# Site-Wide RAG Performance Assistant

> **Status:** 🟢 COMPLETED
> **Created:** 2026-11-26 12:00:26 UTC
> **Updated:** 2026-11-26 12:00:26 UTC
> **Related ADR:** [ADR-0009](../adr/0009-site-wide-rag-performance-assistant.md)
> **Prerequisite phases:** ADR-0005, ADR-0007, ADR-0008

---

## 1. Objective

Move the customer "Detected issues" experience into a site-wide RAG assistant page that pairs structured performance context with a conversation, and bound the Cloudflare cost of every question.

## 2. Architecture and Flows

```
Browser (dashboard/rum/assistant)
  |
  | GET  /api/rum/assistant?site_id=...        (context panel)
  | POST /api/rum/assistant {site_id, question, issue_id?, history}
  v
Next.js route
  |- authorizeRumSite(siteId)            server-resolved site authority
  |- hasLiveRumEntitlement(...)         live managed_wp gate
  |- isWithinRateLimit(...)              site 30/h, user 120/h, fail open
  |- loadAssistantSiteContext(...)        published issues + device findings
  |- answer cache (Upstash, 10 min)      skip on hit
  |- retrieval cache (Upstash, 30 min)   skip on hit
  v
issue-knowledge Worker (/retrieve)
  |- embedding cache (Workers Cache API) skip Workers AI inference on hit
  |- retrieval cache (Workers Cache API) skip Vectorize query on hit
  |- Vectorize query, topK 3 per namespace
  v
Gemini (facts = authoritative, retrieval = untrusted reference)
```

The context loader is the single source for both the panel and the prompt, so the customer sees exactly the facts the model was given.

## 3. Deliverables

- [x] Add `src/lib/rum/entitlement.ts` with the managed WordPress entitlement check.
- [x] Add `src/lib/rum/assistantCache.ts` with Upstash JSON caching, normalized question hashing, and fixed-window rate limiting that fails open.
- [x] Add `src/lib/rum/deviceIssueReader.ts` and share it between the device issue panels route and the assistant context.
- [x] Add `src/lib/rum/assistantContext.ts` with the canonical issue and device context loader and the device summary projection.
- [x] Add `POST /api/rum/assistant` with authorization, entitlement, rate limiting, answer caching, retrieval caching, and citation filtering.
- [x] Add `GET /api/rum/assistant` for the structured context panel.
- [x] Add `/dashboard/rum/assistant` with the context panel, the device breakdown, and the conversation.
- [x] Remove the Detected issues section from the Web Vitals page.
- [x] Remove `detectedIssues.tsx`, `issueAssistant.tsx`, and `POST /api/rum/issues/<issue_id>/assistant`.
- [x] Add the Performance Assistant entry to the Real User Monitoring sidebar group.
- [x] Add embedding and retrieval caching to the issue-knowledge Worker and lower the retrieval window to three matches.
- [x] Update the API protocol, system dossiers, ADR index, plan index, and impact log.

## 4. Verification Gate

- [x] `pnpm exec tsc --noEmit --skipLibCheck` passes.
- [x] `pnpm run lint` passes.
- [x] `pnpm run test` passes.
- [x] `pnpm run build` passes.
- [x] `node --check cloudflare-workers/issue-knowledge/src/index.js` passes.
- [x] `tests/rum-site-assistant.test.mjs` covers the new boundaries.

## 5. Notes and Limitations

- The context panel is a projection of the issue documents. The full issue record, including bounded evidence and history, stays on `GET /api/rum/issues/<issue_id>`.
- The answer cache is keyed by site, focus, and normalized question hash. Conversations therefore reuse an answer only when the question text repeats.
- The Worker cache uses the Workers Cache API, so it needs no new Cloudflare resource and degrades to a direct call when the cache is unavailable.
- Remaining work from ADR-0007 (additional detectors, backend correlation, evaluations, and rollout) is unchanged and stays in the evidence-first plan.
