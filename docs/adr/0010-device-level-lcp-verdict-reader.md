# ADR-0010: Device-Level LCP Verdict Reader

> **Status:** Accepted
> **Date:** 2026-11-26
> **Decision-Makers:** Core Engineering Team
> **Supersedes:** None
> **Refines:** ADR-0008 and ADR-0009

---

## 1. Context

ADR-0008 built the universal device issue panels on top of the retained LCP, CLS, INP, and TTFB readers. Its §4.3 applies a Core Web Vitals threshold to each row, and its negative consequence "Reader limits shape coverage" accepted the inherited reader limits as a known limitation.

One of those limits turned out to be a correctness problem rather than a cosmetic one. The LCP element reader `analyze_lcp_by_device` only returns a `(page, element)` group that was observed at least five times. A device whose slow pageviews are spread across many pages therefore produces no LCP row at all, even when most of its pageviews are poor.

The live data for feedingnature.com showed exactly this. The distribution chart reported desktop LCP at 63 percent poor over sixteen desktop pageviews with a p75 of 6278 ms, while the desktop panel showed no LCP issue, because no `(page, element)` group reached five observations. The panel and the chart were describing the same seven day window from the same `public.rum_lcp_candidates` source but disagreed on the verdict.

The disagreement matters for the customer and for the service. A device with a systemic LCP problem was reported as healthy, so the service channel received no signal, and the assistant had no device-level fact to ground an answer in.

## 2. Decision Drivers

- The panel verdict and the chart verdict must be derived from the same window and the same source.
- A device-level verdict must exist independently of whether any single element repeats.
- The element-level diagnosis must remain, because a device verdict does not identify the cause.
- The new reader must not be able to take the panels down when it fails.
- The tenant boundary and the server-resolved site authority of ADR-0007 and ADR-0008 must be preserved.

## 3. Considered Alternatives

### Alternative A: Lower the element reader threshold

- **Pros:** No new reader, no new panel concept.
- **Cons:** A threshold of one produces a row per pageview, which floods the panel with noise and repeats the site-wide thirty row cap. The threshold also cannot express "most pageviews of this device are poor", because a group of one is not a device signal.
- **Rejected because:** it conflates a repeated element cause with a device wide symptom.

### Alternative B: Derive the device verdict in the browser from the chart data

- **Pros:** No server or database change.
- **Cons:** Puts the verdict outside the evidence-first boundary, duplicates the threshold logic in a second place, and leaves the assistant context unable to see it.
- **Rejected because:** ADR-0007 requires that measurements and thresholds stay server derived.

### Alternative C: Read the raw candidate rows from the server and roll them up in application code

- **Pros:** No new database function, so the rollup logic is testable in the existing unit suite.
- **Cons:** Transfers the pageview set to the application, which then has to compute percentiles and counts outside the database. The raw candidate set is unbounded, so the transfer is not bounded either.
- **Rejected because:** the aggregation belongs next to the other retained readers.

### Alternative D: Add a dedicated device level LCP rollup reader next to the element reader (Chosen)

- **Pros:** The rollup reuses the same `public.rum_lcp_candidates` source and the same seven day window as the element reader, so the two verdicts cannot drift. It returns a bounded one row per device result. The element diagnosis is untouched, and the rollup is additive.
- **Cons:** One more service-role RPC, and one more reader call in the shared reader.

## 4. Decision Outcome

**Chosen Option: a dedicated device level LCP rollup reader that publishes one verdict per device, read alongside the element reader and rendered as a separate summary row.**

### 4.1 The Reader

The migration `supabase/migrations/20261126124908_device_lcp_rollup_reader.sql` adds `public.analyze_lcp_device_rollup(domain_filter text)`, restricted to `service_role`. It reads `public.rum_lcp_candidates` over the same seven day window that the element reader uses, groups by device, and returns the pageview, good, needs-improvement, and poor counts, the p50 and p75 LCP, the distinct page and target counts, the number of poor pages, the slowest page with its LCP, and the most repeated LCP target with its count and p75.

The device label normalization happens in the CTE before the joins, so the worst page and the top target join on the same device key as the aggregate row. Normalizing after the join produced null join keys and null detail columns.

### 4.2 The Verdict

A rollup becomes an issue when the device has at least five pageviews and a p75 LCP above 2.5 s. That minimum keeps a device with two slow visits from being reported as a systemic problem. The resulting row carries a `summary` flag, is ordered first within its device, and is rendered with a "Device wide" badge so the customer can tell the device verdict from the element causes beneath it.

The element rows are unchanged. A device with a repeated slow element shows both the device verdict and the element cause.

### 4.3 Failure Behaviour

The rollup reader is additive and fails open. A failure of the rollup leaves the element level issues intact and simply omits the device verdict. A failure of the element reader still fails the whole request, because the element causes are the primary content of the panel.

### 4.4 Scope

This decision changes neither ADR-0008 nor ADR-0009. ADR-0008 already stated that the panels show every problem for a device in one place and already listed the reader limits as a known negative consequence. This ADR resolves that consequence rather than replacing the decision. The shared reader in `src/lib/rum/deviceIssueReader.ts` serves both the panels and the assistant context, so the assistant now receives the same device verdict, labelled with a `scope` of `device` instead of `element`.

## 5. Consequences and Trade-offs

### Positive

- The panel and the distribution chart now agree, because they share the window and the source.
- A device with a systemic LCP problem produces a service channel signal instead of silence.
- The assistant can ground an answer in a device wide verdict, not only in repeated element causes.

### Negative and Mitigations

- **One more reader call.** The rollup runs in the same `Promise.all` as the other readers and returns one row per device, so the added cost is bounded by the number of devices.
- **The verdict names a symptom, not a cause.** The device row points at the slowest page and the most repeated target as starting points, and the element rows remain for the actual diagnosis. Mitigated by rendering the verdict first and labelling it "Device wide".
- **Two LCP rows can appear for one device.** A device with both a poor rollup and a qualifying element group shows both. Mitigated by the `summary` flag and the badge, and by the deterministic ordering that puts the verdict first.
- **A thin device can still be silent.** A device below five pageviews produces no verdict. Mitigated because the chart reflects the same thin data, so the two surfaces still agree.

## 6. Implementation and Verification Boundaries

The implementation sequence and verification gate belong in:

`docs/plans/2026-11-26_135353_device_level_lcp_verdict_reader.md`

## 7. References

- Universal device issue panels: `docs/adr/0008-universal-device-issue-panels.md`
- Site-wide RAG performance assistant: `docs/adr/0009-site-wide-rag-performance-assistant.md`
- Evidence-first issue diagnosis: `docs/adr/0007-evidence-first-issue-diagnosis-and-grounded-remediation.md`
- Analytics pipeline system: `docs/systems/analytics-pipeline.md`
- RUM issue API contract: `docs/protocols/rum-issue-api.md`

- **Chosen because:** it fixes the disagreement at its source while keeping the cause and the symptom as separate rows.
