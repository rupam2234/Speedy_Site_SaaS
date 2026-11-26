# Device-Level LCP Verdict Reader

> **Status:** 🟢 COMPLETED
> **Created:** 2026-11-26 13:53:53 UTC
> **Owner:** Speedy Site
> **Related ADR:** [ADR-0010: Device-Level LCP Verdict Reader](../adr/0010-device-level-lcp-verdict-reader.md)
> **Prerequisites:** ADR-0008 and ADR-0009
> **Goal:** Make the device issue panels publish a device level LCP verdict so a device with mostly poor LCP is no longer reported as healthy, and keep the panel in agreement with the distribution chart.

---

## 1. Objective

Implement the product correction defined by ADR-0010:

```text
public.rum_lcp_candidates, seven day window
              |
              v
analyze_lcp_device_rollup, one row per device
              |
              v
buildLcpDeviceRollupIssue, threshold and summary flag
              |
              +------> Device wide row, first in its device
              +------> Assistant device fact, scope device
```

The element reader keeps publishing element causes. The rollup adds the device symptom. Neither replaces the other.

## 2. Scope

### Included

- A service-role RPC that reports the LCP verdict per device over the same window and source as the element reader.
- A deterministic builder that turns a rollup row into a device issue with a summary flag.
- Ordering that places the device verdict first within its device.
- A "Device wide" badge in the panel and a `scope` of `device` in the assistant facts.
- Fail-open handling for the rollup reader.
- Automated coverage for the builder, the summary flag, the ordering, and the reader wiring.

### Excluded

- Changing the retained element reader or its five occurrence threshold.
- Changing the CLS, INP, or TTFB readers.
- Changing the issue document schema, the detector, or the workflow.
- Changing the distribution chart.

## 3. Target Structure

| Area | File | Responsibility |
| :--- | :--- | :--- |
| Migration | `supabase/migrations/20261126124908_device_lcp_rollup_reader.sql` | `analyze_lcp_device_rollup`, service-role only. |
| Shared logic | `src/lib/rum/deviceIssues.ts` | Rollup row type, threshold, builder, summary ordering. |
| Reader | `src/lib/rum/deviceIssueReader.ts` | Parallel rollup call, fail-open handling. |
| Assistant | `src/app/api/rum/assistant/route.ts` | `scope` of `device` or `element` on each device fact. |
| Presentation | `src/app/(dashboard)/dashboard/rum/web-vitals/helpers/deviceIssuePanels.tsx` | "Device wide" badge, seven day subtitle. |

## 4. Implementation Phases

### Phase 1: Diagnosis

- [x] Compare the live desktop distribution with the live element reader output for the same site.
- [x] Confirm the element reader floor of five observations per `(page, element)` group.
- [x] Confirm the panel and the chart share the seven day window and the `public.rum_lcp_candidates` source.

### Phase 2: The Rollup Reader

- [x] Add the additive migration with `analyze_lcp_device_rollup(domain_filter text)`.
- [x] Return pageview, good, needs-improvement, and poor counts, p50 and p75, distinct pages and targets, poor pages, the worst page, and the top target.
- [x] Normalize the device label in the CTE before the joins so the detail columns are not null.
- [x] Restrict execution to `service_role`.
- [x] Apply the migration to the linked project and regenerate `src/lib/db/database.types.ts`.

### Phase 3: The Device Verdict

- [x] Add the rollup row type and the `lcpRollup` input to the issue builder.
- [x] Require at least five pageviews and a p75 above 2.5 s.
- [x] Mark the row with `summary: true` and order it first within its device.
- [x] Name the slowest page and the most repeated target as starting points.
- [x] Keep the element rows unchanged beside the verdict.

### Phase 4: Wiring and Presentation

- [x] Call the rollup in the same `Promise.all` as the other readers and fail open on error.
- [x] Label the assistant device facts with a `scope` of `device` or `element`.
- [x] Render the "Device wide" badge and state the seven day window in the panel subtitle.

### Phase 5: Verification and Documentation

- [x] Extend `tests/rum-device-issue-panels.test.mjs` for the rollup, the summary flag, the ordering, and the reader wiring.
- [x] Run type check, lint, tests, and the production build.
- [x] Update `docs/protocols/rum-issue-api.md`, `docs/systems/analytics-pipeline.md`, and `docs/IMPACT-LOG.md`.
- [x] Record the decision in ADR-0010 and synchronize the ADR and plan indexes.
- [x] Remove the temporary live diagnostic scripts.

## 5. Verification Gate

- `pnpm exec tsc --noEmit --skipLibCheck` passes.
- `pnpm exec next lint` reports no errors.
- `pnpm test` passes with the rollup cases included.
- `pnpm run build` compiles and includes `POST /api/rum/device-issues`.
- The live site returns a device wide Desktop LCP row with a p75 of 6.28 s and ten poor pageviews.

## 6. Progress Log

### 2026-11-26 13:53:53 UTC

- Reproduced the disagreement with a live diagnostic against the linked project: desktop showed ten of sixteen pageviews poor with a p75 of 6278 ms, and the element reader returned no qualifying group.
- Added the additive migration for `analyze_lcp_device_rollup` and applied it to the linked project. The first version normalized the device label after the joins, which produced null worst page and top target columns, so the migration was repaired as reverted and re-pushed with the normalization moved into the CTE.
- Regenerated `src/lib/db/database.types.ts` from the live schema with the Supabase CLI. The diff was purely additive: the new RPC plus the `graphql_public` schema.
- Added the rollup builder, the summary flag, the summary ordering, the fail-open reader call, the assistant `scope`, and the "Device wide" badge.
- Confirmed against the live database that the desktop panel now returns a device wide LCP row with a p75 of 6.28 s and ten poor pageviews, that the mobile and tablet rows stay within the seven day window, and that no duplicate desktop LCP rows appear.
- Extended `tests/rum-device-issue-panels.test.mjs` and `tests/rum-site-assistant.test.mjs`, then ran the full gate: 107 tests pass, lint reports no errors, the type check is clean, and the production build succeeds.
- The prescribed workspace plan-manager script was unavailable on this Windows host. Plan headers, checklists, progress log, and master indexes were synchronized directly, following the precedent in the earlier plans.

