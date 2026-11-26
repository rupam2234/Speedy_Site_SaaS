# Universal Device Issue Panels

> **Status:** 🟢 COMPLETED
> **Created:** 2026-11-26 07:30:24 UTC
> **Owner:** Speedy Site
> **Related ADR:** [ADR-0008: Universal Device Issue Panels](../adr/0008-universal-device-issue-panels.md)
> **Prerequisites:** ADR-0005 and ADR-0007
> **Goal:** Replace the per-metric affected-elements switch with minimal PageSpeed Insights-style issue panels for desktop, mobile, and tablet, including asset identification and marking.

---

## 1. Objective

Implement the product presentation defined by ADR-0008:

```text
Retained LCP, CLS, INP, and TTFB readers
              |
              v
One authorized server reader
              |
              v
Thresholded, asset-marked issue list per device
              |
              +------> Desktop panel
              +------> Mobile panel
              +------> Tablet panel
```

The browser never selects a metric for the issue section, never supplies contributor rows, and never creates or modifies an issue document.

## 2. Scope

### Included

- A shared deterministic issue builder with Core Web Vitals thresholds, asset identification, and fix guidance.
- One authenticated reader that resolves site authority and queries the retained readers in parallel.
- A dashboard section with three device panels, collapsible metric groups, and expandable issue rows.
- Removal of the per-metric affected-elements drilldown components and their lazy fetching.
- Automated coverage for grouping, asset marking, thresholds, caps, authorization, and the absence of metric switching.

### Excluded

- New detectors, issue-document writes, workflow actions, or service-task creation.
- Changing the retained SQL readers or their thresholds.
- Changing the chart metric selection, the sidebar, or the detected-issues panel.
- Replacing the canonical evidence model or the issue assistant.

## 3. Target Structure

| Area | File | Responsibility |
| :--- | :--- | :--- |
| Shared logic | `src/lib/rum/deviceIssues.ts` | Device normalization, thresholds, asset identification, issue building, per-metric caps. |
| Reader | `src/app/api/rum/device-issues/route.ts` | Domain authorization, parallel retained-reader queries, grouped response. |
| Presentation | `src/app/(dashboard)/dashboard/rum/web-vitals/helpers/deviceIssuePanels.tsx` | Three device panels, metric groups, expandable rows, fix and asset links. |
| Page wiring | `src/app/(dashboard)/dashboard/rum/web-vitals/helpers/main.tsx` | Mounts the panels and removes the per-metric drilldown. |

## 4. Implementation Phases

### Phase 1: Shared Issue Model

- [x] Define the issue, asset, and device types.
- [x] Normalize the reader device labels.
- [x] Detect the asset type from the asset itself.
- [x] Apply Core Web Vitals thresholds per metric.
- [x] Attach the deciding measurements and a targeted fix to every issue.
- [x] Cap each device panel at six rows per metric.
- [x] Page through longer metric groups with previous and next controls.

### Phase 2: Authorized Reader

- [x] Resolve the domain to an authoritative order before reading.
- [x] Query the retained LCP, CLS, INP, and TTFB readers in parallel.
- [x] Return structured errors for invalid input, missing authority, and query failure.
- [x] Document the wire contract in `docs/protocols/rum-issue-api.md`.

### Phase 3: Dashboard Presentation

- [x] Add the desktop, mobile, and tablet panels.
- [x] Group rows by metric as disclosure sections without a switch.
- [x] Mark the affected asset with a type icon and label.
- [x] Show the affected page and measurement on every row.
- [x] Expand a row to reveal evidence, the fix, and links to the page and asset.
- [x] Remove the per-metric drilldown components and their lazy fetching.

### Phase 4: Verification and Documentation

- [x] Add `tests/rum-device-issue-panels.test.mjs`.
- [x] Cover pagination reach, clamping, and the navigation controls.
- [x] Update `docs/systems/analytics-pipeline.md`, `docs/protocols/rum-issue-api.md`, and `docs/IMPACT-LOG.md`.
- [x] Record the decision in ADR-0008 and synchronize the ADR and plan indexes.
- [x] Run type check, lint, tests, and the production build.

## 5. Verification Gate

- `pnpm exec tsc --noEmit --skipLibCheck` passes.
- `pnpm exec next lint --dir src` reports no errors.
- `pnpm test` passes with the new device panel suite included.
- `pnpm run build` compiles and includes `POST /api/rum/device-issues`.
- The dashboard source contains no per-metric element drilldown and no metric switch in the issue section.

## 6. Progress Log

### 2026-11-26 07:30:24 UTC

- Audited the existing Web Vitals page, metric helper components, element reader routes, retained reader migrations, site-access utilities, and test infrastructure.
- Confirmed that the retained LCP, CLS, INP, and TTFB readers already return device-scoped rows with the asset, target, page, and timing facts required by the panels, so no reader or migration change was needed.
- Added `src/lib/rum/deviceIssues.ts` with deterministic thresholds, asset identification, issue building, and per-metric caps.
- Added `POST /api/rum/device-issues`, which authorizes the domain server-side and queries the retained readers in parallel.
- Added `deviceIssuePanels.tsx` and mounted it in the Web Vitals page.
- Removed the per-metric drilldown components (`lcp.tsx`, `cls.tsx`, `inp.tsx`, `ttfb.tsx`, `types.ts`) and the lazy per-metric fetching.
- Added `tests/rum-device-issue-panels.test.mjs` covering grouping, asset marking, thresholds, caps, authorization, and the absence of metric switching.
- Updated the API protocol, the analytics pipeline dossier, the impact log, and the ADR and plan indexes.
- The prescribed workspace plan-manager script was unavailable on this Windows host. Plan headers, checklists, progress log, and master indexes were synchronized directly, following the precedent in the evidence-first issue plan.
