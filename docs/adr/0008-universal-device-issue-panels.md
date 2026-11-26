# ADR-0008: Universal Device Issue Panels

> **Status:** Accepted
> **Date:** 2026-11-26
> **Decision-Makers:** Core Engineering Team
> **Supersedes:** None
> **Refines:** ADR-0005 and ADR-0007

---

## 1. Context

ADR-0007 made detected issues the primary unit of the Web Vitals dashboard. The dashboard still presented the retained LCP, CLS, INP, and TTFB evidence through per-metric affected-element drilldowns behind a metric and device switch.

That presentation had three problems for the customer:

- The customer had to know which metric to select before seeing what was hurting the site. The dashboard presented the taxonomy of the metrics rather than the list of problems.
- The device selection was shared with the charts, so a customer who wanted to compare desktop, mobile, and tablet had to switch three times and remember the previous state.
- The affected asset was buried. The customer had to open a metric card, find the right row, and expand a tooltip before learning which image, script, font, element, or page was responsible.

PageSpeed Insights solves this with a single minimal opportunities list. Each row states the problem, identifies the affected asset, and offers a fix without asking the reader to navigate a metric hierarchy first.

The underlying evidence did not need to change. The retained LCP, CLS, INP, and TTFB readers already return device-scoped rows with the asset, target, page, and timing facts required to identify a problem and its fix.

## 2. Decision Drivers

- Show every problem for a device in one place, without a metric switch.
- Keep the evidence-first contract: canonical facts and service-role readers remain the source of truth.
- Identify the affected asset directly in the row.
- Keep the panel minimal enough to be scanned, and every row actionable.
- Avoid extra browser round trips and repeated authorization checks.
- Preserve tenant isolation and server-resolved site authority.

## 3. Considered Alternatives

### Alternative A: Keep the metric switch and improve the rows

- **Pros:** Smallest change; no new reader.
- **Cons:** Preserves the navigation burden that caused the request. The customer still needs the metric taxonomy to find problems.
- **Rejected because:** it optimizes the wrong interaction.

### Alternative B: One combined panel for every device

- **Pros:** Simplest list to read.
- **Cons:** A device with many issues drowns out the others. A mobile-heavy site cannot be read next to its desktop baseline.
- **Rejected because:** device comparison is a core customer question.

### Alternative C: Per-device panels driven by the existing per-metric element endpoints

- **Pros:** Reuses existing endpoints with no new reader.
- **Cons:** Requires four browser requests, repeats the authorization and RPC cost four times, and leaves the metric grouping to the browser.
- **Rejected because:** the server already owns authorization and the reader contract, so the grouping belongs there.

### Alternative D: Per-device panels from one authorized server reader with deterministic issue building (Chosen)

- **Pros:** One request covers every metric and every device. The server enforces site authority once, reads the retained readers in parallel, applies Core Web Vitals thresholds, identifies the asset, and caps the list so each panel stays minimal.
- **Cons:** Adds a reader endpoint and a shared issue-building module.
- **Chosen because:** it matches the customer workflow and keeps every guarantee that ADR-0007 established.

## 4. Decision Outcome

**Chosen Option: per-device issue panels populated by one authorized server reader that applies deterministic thresholds and asset identification.**

### 4.1 Presentation

The Web Vitals dashboard presents three universal issue panels, one for desktop, one for mobile, and one for tablet. Each panel groups its rows by metric for readability, but the metric groups are disclosure sections, not a switch. Every panel is visible at once and the shared chart device selection does not filter them.

A row states the problem in one line, marks the affected asset with a type icon and label, names the affected page, shows the measurement, and expands to reveal the supporting evidence, a targeted fix, a link to the affected page, and a link to the asset.

### 4.2 Data Boundary

A single authenticated reader resolves the domain to an authoritative order, reads the retained LCP, CLS, INP, and TTFB readers in parallel, and returns a minimal issue list per device. The browser never supplies contributor rows, and the reader never creates, publishes, or modifies an issue document. The panel is a read model over canonical facts, not a diagnosis surface.

### 4.3 Issue Selection

Only observations that exceed a Core Web Vitals threshold appear: LCP p75 above 2.5 s, CLS above 0.1, INP above 200 ms, and TTFB p75 above 800 ms. The reader returns at most thirty rows per metric, and the panel shows six rows per page. When a metric group holds more than six issues the panel renders previous and next controls with a page counter, so every issue stays reachable without a long scroll. Rows are ordered by rating, then by measured value.

### 4.4 Asset Identification

Each row marks one asset: the LCP asset URL, the LCP font family, the CLS selector, the responsible INP script, or the affected page for TTFB. The type is derived from the asset itself, so the customer can tell an image problem from a script problem without extra navigation.

### 4.5 Relationship to ADR-0007

ADR-0007 §4.4 retained the per-metric element drilldown as a secondary drilldown. This ADR replaces that drilldown with the universal panels. The guarantees of ADR-0007 §4.1, §4.2, and §4.5 are unchanged: canonical facts remain the telemetry source of truth, the server resolves tenant and site authority, the browser cannot inject evidence, and issue documents remain the authoritative diagnosis and workflow record. Detected issues remain the primary presentation above the panels.

## 5. Consequences and Trade-offs

### Positive

- Customers see all problems for a device in one scan, with no metric switch.
- The affected asset is visible in every row.
- One request replaces one request per metric switch.
- Every row is actionable because rows below the threshold never appear.

### Negative and Mitigations

- **Reader limits shape coverage:** the LCP reader returns at most thirty site-wide rows and the TTFB reader caps at pages above 800 ms, so a device can be absent from a metric group. Mitigated by documenting the inherited limits in the API contract.
- **Less granular raw timing drilldown:** the panel does not show every timing phase of every element. Mitigated because the row still exposes the deciding measurements, and the phase breakdown stays available in the issue documents.
- **Shared issue-building logic must stay deterministic:** thresholds and asset labeling are code, not model output. Mitigated by keeping the builder in a shared, tested module with no model dependency.

## 6. Implementation and Verification Boundaries

The implementation sequence and verification gate belong in:

`docs/plans/2026-11-26_073024_universal_device_issue_panels.md`

## 7. References

- Product goals: `docs/GOALS.md`
- Evidence-first issue diagnosis: `docs/adr/0007-evidence-first-issue-diagnosis-and-grounded-remediation.md`
- Focused dashboard: `docs/adr/0005-focused-rum-dashboard-and-data-retirement.md`
- Analytics pipeline system: `docs/systems/analytics-pipeline.md`
- RUM issue API contract: `docs/protocols/rum-issue-api.md`
