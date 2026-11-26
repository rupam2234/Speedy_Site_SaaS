# IMPACT-LOG: Track Record of Major Changes

> **Purpose:** a short, interview-ready record of the most impactful
> engineering changes to speedy.site. Newest first.
> **Entry rules (AGENTS.md rule 2):** only major, measurable changes (cost,
> security, performance, reliability, product); each entry states problem,
> changes, before/after impact, and where to verify; link details instead of
> duplicating them.
> **Last updated:** 2026-11-26
---

---

## 2026-11-26: Device-Level LCP Verdict Reader

**Problem:** The Web Vitals device panels and the LCP distribution chart read the same seven day window from the same candidate source but disagreed on the verdict. The element reader only returns a `(page, element)` group observed at least five times, so a device whose slow pageviews are spread across many pages showed no LCP issue even when most of its pageviews were poor. On feedingnature.com the chart reported desktop LCP at 63 percent poor over sixteen desktop pageviews with a p75 of 6278 ms, while the desktop panel showed no LCP issue at all. The service channel received no signal for a device with a systemic LCP problem, and the assistant had no device-level fact to ground an answer in.

**Changes:** Added the additive migration `supabase/migrations/20261126124908_device_lcp_rollup_reader.sql` with the service-role RPC `analyze_lcp_device_rollup(domain_filter text)`, which reports the LCP verdict per device over the same window and the same `public.rum_lcp_candidates` source, including pageview, good, needs-improvement, and poor counts, p50 and p75, distinct pages and targets, poor pages, the slowest page, and the most repeated target. Added `buildLcpDeviceRollupIssue` and the `summary` flag to `src/lib/rum/deviceIssues.ts`, ordered the device verdict first within its device, and made the rollup call in `src/lib/rum/deviceIssueReader.ts` fail open so a rollup failure omits the device verdict without hiding the element issues. The assistant device facts now carry a `scope` of `device` or `element`, and the panel renders a "Device wide" badge and states the seven day window. Regenerated `src/lib/db/database.types.ts` from the live schema.

**Impact:** The panel and the chart now agree, because they share the window and the source. A device with a mostly poor LCP is reported instead of looking healthy, so the service channel receives the signal and the assistant can ground an answer in the device verdict. The element diagnosis is unchanged and still names the cause, so the verdict and the cause are complementary rather than competing. The rollup returns one row per device and fails open, so the added reader cost is bounded and cannot take the panels down.

> **Where to verify:** `docs/adr/0010-device-level-lcp-verdict-reader.md`, `supabase/migrations/20261126124908_device_lcp_rollup_reader.sql`, `src/lib/rum/deviceIssues.ts`, `src/lib/rum/deviceIssueReader.ts`, `src/app/(dashboard)/dashboard/rum/web-vitals/helpers/deviceIssuePanels.tsx`, `tests/rum-device-issue-panels.test.mjs`, `docs/protocols/rum-issue-api.md`.

**Interview one-liner:** "Closed the gap where a device with mostly poor LCP was reported as healthy, by adding a device-level rollup reader that reads the same window and source as the distribution chart."

---

## 2026-11-26: Site-Wide RAG Performance Assistant

**Problem:** The customer issue assistant was reachable only from inside one expanded issue, so site-wide questions such as "what should I fix first" or "which pages are slow on mobile" had no supporting device evidence and could not be asked. Every question also cost a fresh Workers AI embedding and Vectorize query with no caching at either the application or Worker boundary, and the dashboard carried two separate surfaces for the same published issue facts.

**Changes:** Added `/dashboard/rum/assistant`, a two-column workspace that pairs a structured performance context panel with a conversation, plus a site-scoped `POST /api/rum/assistant` route and a `GET /api/rum/assistant` context route. Added `src/lib/rum/assistantContext.ts` as the single server loader that produces both the panel and the model prompt, `src/lib/rum/assistantCache.ts` for Upstash answer and retrieval caching with fail-open fixed-window rate limits, `src/lib/rum/entitlement.ts` for the managed WordPress entitlement gate, and `src/lib/rum/deviceIssueReader.ts` to share the retained RPC queries and deterministic grouping with the device issue panels route. Removed the Detected issues section from the Web Vitals page, the `detectedIssues` and `issueAssistant` components, and the per-issue `POST /api/rum/issues/<issue_id>/assistant` route, which the new route replaces through an optional issue focus. Added embedding and retrieval caching to the `issue-knowledge` Cloudflare Worker and lowered its retrieval window from five matches per namespace to three. Added the Performance Assistant entry to the Real User Monitoring sidebar group.

**Impact:** Customers can now ask site-wide performance questions and see the exact facts the answer was grounded in beside the conversation, because one server loader feeds both the panel and the prompt. Browser input still cannot define a measurement, count, page, asset, scope, or tenant, so the evidence-first contract of ADR-0007 holds. Repeated questions no longer consume Workers AI inference or Vectorize queries at either the application or Worker layer, the retrieval window is smaller, and site and user rate limits bound the remaining spend. Cache and counter failures fail open, so a Redis or cache outage costs latency rather than availability. The dashboard no longer carries two surfaces for the same published issue facts.

> **Where to verify:** `docs/adr/0009-site-wide-rag-performance-assistant.md`, `src/app/api/rum/assistant/route.ts`, `src/lib/rum/assistantContext.ts`, `src/lib/rum/assistantCache.ts`, `src/lib/rum/deviceIssueReader.ts`, `src/app/(dashboard)/dashboard/rum/assistant/`, `cloudflare-workers/issue-knowledge/src/index.js`, `tests/rum-site-assistant.test.mjs`, `docs/protocols/rum-issue-api.md`.

**Interview one-liner:** "Moved the customer issue assistant into a site-wide RAG workspace with server-derived performance context and layered caching that keeps Cloudflare inference cost flat as usage grows."

---

## 2026-11-26: Universal Device Issue Panels

**Problem:** The Web Vitals dashboard exposed per-metric affected-element drilldowns behind a metric and device switch. Customers had to know which metric to select before they could see what was actually hurting them, and the drilldowns buried the affected asset behind several interactions.

**Changes:** Replaced the per-metric affected-elements section with three universal issue panels for desktop, mobile, and tablet. Added `POST /api/rum/device-issues`, which authorizes the domain server-side and reads the retained LCP, CLS, INP, and TTFB readers in one parallel query, then returns a minimal issue list per device. Added `src/lib/rum/deviceIssues.ts` for deterministic issue building, thresholding, asset identification, and fix guidance. Rows show the affected asset or element, the page, the measurement, and a targeted fix. Removed the retired per-metric element drilldown components (`lcp.tsx`, `cls.tsx`, `inp.tsx`, `ttfb.tsx`, `types.ts`) and their lazy per-metric fetching.

**Impact:** One request now covers every metric and every device instead of one request per metric switch. Customers see only observations that exceed a Core Web Vitals threshold, so each panel stays short and every row is actionable. Asset type and label are identified from the retained reader output, which keeps the evidence-first contract intact because the panels are built from canonical facts and service-role readers rather than browser-selected rows.

> **Where to verify:** `docs/adr/0008-universal-device-issue-panels.md`, `src/lib/rum/deviceIssues.ts`, `src/app/api/rum/device-issues/route.ts`, `src/app/(dashboard)/dashboard/rum/web-vitals/helpers/deviceIssuePanels.tsx`, `tests/rum-device-issue-panels.test.mjs`, `docs/protocols/rum-issue-api.md`.

**Interview one-liner:** "Replaced metric-switched element drilldowns with PageSpeed-style issue panels per device that identify the affected asset and the fix in one place."

---

## 2026-11-25: Customer Issue Assistant and Tenant-Scoped RAG

**Problem:** The evidence-first issue panel explained each published diagnosis, but customers could not ask how to apply the recommended fix or how to verify it. A model also needed approved remediation context without treating raw telemetry or browser input as authoritative evidence.

**Changes:** Added an "Ask about this issue" panel to the customer Detected issues view and an authenticated `POST /api/rum/issues/<issue_id>/assistant` route. The route verifies canonical site authority, the site's live `managed_wp` entitlement, and publication state, then loads the current issue from Supabase before generation. Added the deployed `issue-knowledge` Cloudflare Worker, Workers AI embeddings with `@cf/baai/bge-small-en-v1.5`, and the `speedy-issue-knowledge` Vectorize index. Customer documents use tenant namespaces and `siteId` filters; curated remediation playbooks use a separate namespace. The model receives the current issue as authoritative facts and retrieved documents as untrusted reference material, with citations and limitations in the response.

**Impact:** Customers can now request targeted fix and verification guidance inside a published issue without sending raw contributor data to an AI endpoint. Cross-tenant and cross-site retrieval is blocked before generation. Live validation rejected an unauthenticated Worker request with HTTP 401 and returned the WP Rocket LCP image playbook as the top result for a representative retrieval query. Four curated playbooks are indexed; no resolved customer issues are currently available to index.

**Where to verify:** `src/app/api/rum/issues/[issueId]/assistant/route.ts`, `src/app/(dashboard)/dashboard/rum/web-vitals/helpers/issueAssistant.tsx`, `cloudflare-workers/issue-knowledge/`, `tests/evidence-first-issue-workflow.test.mjs`, `docs/protocols/rum-issue-api.md`.

**Interview one-liner:** "Added a customer issue assistant that turns published, evidence-backed diagnoses into cited WordPress fix guidance through tenant-scoped Cloudflare RAG."

---

## 2026-11-25: Evidence-First RUM Issue Slice

**Problem:** The Web Vitals drilldowns accepted browser-selected contributor rows for OpenRouter analysis, while privileged RUM readers accepted browser-supplied domains without proving site ownership. Diagnoses were neither tenant-scoped nor persistent, and repeated observations could not become a stable issue family.

**Changes:** Added the additive `rum_issue_documents`, `rum_issue_evidence`, `wp_backend_tests`, and `rum_issue_history` migration with RLS, restricted grants, bounded evidence, stable fingerprints, and a service-role-only `detect_lcp_issues_v1` RPC. Added authenticated site authorization for every retained RUM reader, canonical `site_id` issue APIs, an admin-only shadow detector endpoint, and an issue-first Detected issues panel in RUM Analytics Web Vitals. The three contributor-analysis routes now return authenticated `410 Gone` responses and no longer call OpenRouter.

**Impact:** Unauthenticated and cross-tenant RUM reads are blocked, browser input cannot inject issue facts, and recurring LCP observations upsert one stable issue per template, asset, target, and device cohort. The detector remains shadow-first by default and requires at least five pageviews and three sessions before creating an issue. The additive migration and a PostgreSQL compatibility follow-up were applied directly to the linked remote Supabase project without Docker, and `src/lib/db/database.types.ts` was regenerated from the live schema. Remote shadow validation confirmed the detector executes, rejects non-service-role execution, and creates no rows when thresholds are not met.

**Where to verify:** `supabase/migrations/20261125073117_evidence_first_issue_documents.sql`, `src/lib/rum/siteAccess.ts`, `src/app/api/rum/issues/`, `tests/evidence-first-issue-workflow.test.mjs`, `docs/systems/analytics-pipeline.md`.

**Interview one-liner:** "Replaced unauthenticated element analysis with a tenant-scoped, evidence-backed LCP issue workflow that can be validated before customer publication."

---

## 2026-11-25: Evidence-First Issue Diagnosis Architecture Decision

**Problem:** The Web Vitals drilldowns could analyze individual elements through OpenRouter, but the flow accepted browser-supplied contributor rows, did not persist a tenant-scoped diagnosis, did not correlate real-user symptoms with WordPress backend evidence, and could not verify whether a recommended fix improved the affected metric. Applying RAG directly to elements would preserve these correctness, isolation, and auditability gaps.

**Changes:** ADR-0007 establishes deterministic issue detection over canonical RUM facts and structured WordPress backend tests, with Supabase issue documents as the authoritative diagnosis and workflow record. It defines an issue-first dashboard, expert service-task workflow, comparable before-and-after verification, and Cloudflare Vectorize as an auxiliary retrieval index for approved issue knowledge and curated remediation playbooks. The timestamped execution plan separates schema, security, detector, backend-correlation, dashboard, service-channel, RAG-pilot, and production-rollout gates. Older RUM plans are retained as historical records, with unfinished issue and RAG scope explicitly transferred to the new plan.

**Impact:** The accepted architecture prevents a language model from deciding whether an issue exists, calculating authoritative sample counts, changing tenant scope, or publishing unsupported causes. It creates one reviewable path from canonical evidence to a durable diagnosis, targeted fix, expert task, and measured RUM outcome. The decision is documented but the new schema, detectors, dashboard workflow, and retrieval service are not yet implemented.

**Where to verify:** `docs/adr/0007-evidence-first-issue-diagnosis-and-grounded-remediation.md`, `docs/plans/2026-11-25_041449_evidence_first_issue_diagnosis_and_grounded_remediation.md`, `docs/systems/issue-knowledge-documents.md`, `docs/systems/analytics-pipeline.md`.

**Interview one-liner:** "Chose a deterministic, tenant-safe issue workflow that keeps Supabase authoritative and uses RAG only to ground expert remediation."

---

## 2026-11-25: RUM Reader Cleanup and Canonical Distribution Read

**Problem:** The focused RUM dashboard still had repository-defined SQL readers for removed or unused generic analytics surfaces. The live Web Vitals distributions route also depended on `rum_daily_distributions`, a legacy projection populated by an event-only refresher. Canonical v2 rows use typed facts with `events = []`, so the projection path could omit current traffic.

**Changes:** Migration `20261125025407_retire_unused_rum_readers.sql` replaces `rum_distributions_all_metrics` with a canonical and historical raw-fact query over explicit UTC date boundaries, restricts it to `service_role`, and drops 13 legacy function signatures: 11 unused reader signatures, the obsolete origin-hit cleanup function, and the legacy distribution refresher. The migration does not drop tables, delete telemetry, or remove the `rum_metrics.events` column.

**Impact:** The retained dashboard no longer depends on a stale legacy distribution projection for current traffic, while unused SQL readers and the origin-hit cleanup surface are removed. Stale tables and production-only RPCs remain for a separate dependency and retention audit.

**Where to verify:** `supabase/migrations/20261125025407_retire_unused_rum_readers.sql`, `tests/rum-dashboard-live-reader.test.mjs`, `docs/reports/rum-events-reader-inventory.md`, `docs/systems/analytics-pipeline.md`.

**Interview one-liner:** "Removed a legacy RUM SQL surface and replaced a stale materialized distribution path with canonical raw-fact aggregation."

---

## 2026-11-25: RUM Retention Security and Storage Recovery

**Problem:** The legacy `delete_old_rum_metrics()` cleanup function retained default public execution grants, allowing the anonymous PostgREST role to invoke raw-row deletion. Production also carried a 101 MB bloated GIN index on the legacy `events` JSON column even though retained canonical readers use typed facts and JSONPath fallbacks.

**Changes:** Migration `20261125021531_secure_and_batch_rum_retention.sql` revokes execution from `PUBLIC`, `anon`, and `authenticated`, grants it only to `service_role`, and changes cleanup to bounded 5,000-row batches. Migration `20261125022142_drop_bloated_legacy_events_index.sql` drops `idx_rum_resource_summary` after confirming that no supported reader depends on JSONB containment searches. Migration `20261125023115_disable_raw_cleanup_until_cold_snapshots.sql` disables cleanup until every deleted day has a verified cold snapshot.

**Impact:** Anonymous cleanup invocation now returns HTTP 401, and service-role cleanup refuses deletion until the cold snapshot pipeline is available. Removing the obsolete GIN index reduced the production `rum_metrics` footprint from about 111 MB to 10.2 MB while preserving all live rows. History, INP element, and LCP image readers returned HTTP 200 with their expected production rows after the change.

**Where to verify:** [`docs/reports/rum-storage-optimization-2026-11-25.md`](reports/rum-storage-optimization-2026-11-25.md), `supabase/migrations/20261125021531_secure_and_batch_rum_retention.sql`, `supabase/migrations/20261125022142_drop_bloated_legacy_events_index.sql`, `tests/rum-dashboard-live-reader.test.mjs`, `docs/systems/analytics-pipeline.md`.

**Interview one-liner:** "Closed an exposed raw-telemetry cleanup endpoint and recovered 101 MB of production storage by removing an obsolete legacy-events index."

---

## 2026-11-24: Focused RUM Dashboard and Generic Analytics Retirement

**Problem:** The RUM dashboard included Trace, generic Analytics, Global UX, and Cloudflare Enhancements. Those surfaces preserved legacy event parsing, duplicated telemetry projections, generic D1 analytics, and recurring Workers that did not support the focused WordPress performance optimization product. Retained surfaces also lacked a canonical v2 reader cutover, including the LCP and CLS evidence needed for image, font, and layout-shift explanations.

**Changes:** ADR-0005 defines Web Vitals, Page Groups, Images, and Fonts as the retained product surfaces. The implementation expands bounded LCP and CLS evidence, migrates retained readers to typed facts and canonical evidence with historical fallbacks, removes the retired UI and APIs, drops removal-only RPCs, stops the deployed generic analytics cron Workers, and stops producing legacy `events` for new v2 rows. Corrective migrations `20261124123405_fix_retained_reader_production_errors.sql` and `20261124125351_fix_remaining_retained_reader_errors.sql` resolve production-only output-name and historical-shape failures found during parity verification. The collector Worker was updated to version `52839b51-0816-4edf-a7cc-3a7e90fc181c`, the entitlement Worker to version `56995b98-9029-43de-979d-84bb7df43a04`, and monotonic evidence-validator migrations corrected JSON-null handling, geometric key type resolution, array comparison typing, and PL/pgSQL record-field ambiguity. Migrations `20261125015224_migrate_canonical_rum_history_reader.sql` and `20261125015847_fix_canonical_rum_history_metric_keys.sql` move Web Vitals history to live normalized facts and restore the dashboard's lowercase metric keys.

**Impact:** The retired product now has only Web Vitals, Page Groups, Images, and Fonts. Two scheduled Cloudflare Workers and their D1 read/write path were removed from source and deployment, eliminating recurring generic analytics work while preserving Supabase telemetry and retained diagnostic behavior. Production verification executed all 12 retained reader RPCs successfully, confirmed all 5 retired RPCs were absent, and found zero value or normalized-rating mismatches across 60 typed-versus-legacy metric comparisons on 17 v2 rows. Event-buffer Worker version `c9fad319-df44-41ab-9e3b-63c8aec63e0c` stores new v2 rows without the legacy event projection. A final controlled live beacon confirmed the full path through the served collector, entitlement gate, Durable Object buffer, and Supabase: the stored row had schema version 2, canonical device and Web Vital facts, and `events = []`. The live history reader now returns newly collected canonical traffic without waiting for a materialized refresh, and the local Web Vitals API returns current desktop, mobile, and tablet data for `feedingnature.com`. The physical `events` column drop remains a separately approved destructive migration.

**Where to verify:** `docs/adr/0005-focused-rum-dashboard-and-data-retirement.md`, `docs/plans/2026-11-24_054436_focused_rum_dashboard_and_data_retirement.md`, `docs/reports/rum-events-reader-inventory.md`, `docs/systems/analytics-pipeline.md`.

**Interview one-liner:** "Focused real-user monitoring on WordPress performance evidence, migrated the retained dashboards to bounded canonical diagnostics, and retired the generic analytics infrastructure."

---

## 2026-11-24: Compact RUM v2 Deployed and Duplicate-Safe in Production

**Problem:** The committed compact RUM v2 implementation was not active in production. After deploying the event-buffer and collector Workers, a duplicate-pageview flush batch exposed a PostgreSQL cardinality error (`21000`) because one `ON CONFLICT DO UPDATE` statement proposed the same `pageview_id` more than once. The affected Durable Object could retain the failed buffer and retry it.

**Changes:** Deployed the event-buffer Worker at version `42f0a870-3c4c-4db3-8abf-65497b7c8a33`, then the collector Worker at version `8a27927e-8d92-45d8-978b-c325f26a09c0`. The live cache-busted collector now emits the version 2 canonical envelope. Migration `20261124005400_dedupe_rum_upsert_batch.sql` changes the public batch RPC to apply each payload as a separate upsert through a service-role-only internal helper. This preserves first-party context, metric supersession, append-only legacy events, and shallow evidence merging.

**Impact:** Version 2 telemetry now reaches Supabase canonical columns while legacy dashboards continue reading the compatibility projection. Retries and continuation beacons that share a `pageview_id` no longer fail the whole batch. Direct duplicate RPC tests and four-shard Worker tests now produce successful structured flush logs.

**Where to verify:** `supabase/migrations/20261124005400_dedupe_rum_upsert_batch.sql`, `tests/rum-compact-migration.test.mjs`, `docs/protocols/rum-beacon-transport.md`, `docs/systems/site-metadata-worker.md`.

**Interview one-liner:** "Deployed compact real-user telemetry end to end and hardened its continuation pipeline so retries merge safely instead of blocking a batch."

---

## 2026-11-24: Canonical RUM Collector and Edge Dual-Write

**Problem:** The legacy collector sent a heterogeneous event array with raw user agents, duplicated domain fields, unbounded diagnostic detail, and no versioned canonical contract. The Worker could not reliably distinguish continuation facts from repeated first-party context, and malformed requests could bypass the declared body limit when `Content-Length` was absent.

**Changes:** The browser collector now emits `schema_version: 2` from a stable `pageview_id`. Shared contract modules normalize page paths, external referrer hostnames, capability-based device class, coarse browser and OS families, navigation timings, Web Vitals, resource totals, and bounded diagnostic evidence. Raw user agents, hardware concurrency, URL credentials, fragments, unsafe query values, complete error stacks, and duplicated `siteDomain` fields no longer cross the Worker boundary. The event-buffer Worker accepts v1 and v2, derives tenant identity from authenticated Origin or Referer, checks actual body bytes, rejects unknown versions and malformed typed values, and writes typed canonical facts plus bounded evidence. It also generates a compact legacy `events` projection so current dashboards remain operational. Structured Worker logs expose payload version, accepted and rejected row counts, and Supabase latency without recording payloads.

**Impact:** Representative v2 payloads remain below 8 KiB, privacy-sensitive fields are removed before transport, one pageview continues to merge into one row, and existing analytics can migrate to typed columns one reader at a time. INP continuation beacons now carry only newly observed metric and evidence fields.

**Where to verify:** `scripts/extended-rum.js`, `src/lib/rum/`, `cloudflare-workers/event-buffer/src/index.js`, `tests/rum-compact-contract.test.mjs`, `docs/protocols/rum-beacon-transport.md`.

**Interview one-liner:** "Replaced the RUM event blob with a validated, privacy-safe canonical contract while keeping every existing dashboard running through an automatic compatibility projection."

---

## 2026-11-23: Compact RUM Telemetry Schema

**Problem:** The legacy `rum_metrics` model stored most facts inside a heterogeneous event array, which limited indexed analytics and made continuation merging depend on event shape.

**Changes:** An additive migration adds nullable canonical columns for geography, device, network, navigation, Core Web Vitals, resource totals, and error counts, plus `schema_version`, normalized `referrer_domain`, and bounded 4 KiB diagnostic evidence. The upsert RPC now merges continuation beacons by the existing partial unique `pageview_id` target, preserves first-party context, allows later non-null metrics to supersede earlier values, appends legacy events, and shallow-merges diagnostic sections. A follow-up migration removes explicit `anon` and `authenticated` grants so only `service_role` can execute the RPC. Database types were regenerated from the live schema.

**Impact:** Current dashboards and legacy rows remain readable without backfill, while future issue detection can query typed facts and retain bounded evidence for expert diagnosis. The migration was applied to the linked live Supabase database and verified with a reversible synthetic continuation test.

**Where to verify:** `supabase/migrations/20261123233125_compact_rum_telemetry.sql`, `tests/rum-compact-migration.test.mjs`, `docs/systems/site-metadata-worker.md`.

**Interview one-liner:** "Added a backward-compatible canonical RUM schema that makes pageview diagnostics queryable and evidence-efficient without disrupting legacy analytics."

---

## 2026-11-23: Delayed Chat Email Notifications (15-Minute Grace Window & Digest)

**Problem:** Immediate email alerts sent on every chat message flooded recipient inboxes during active back-and-forth conversations, generating dozens of redundant notifications for messages users had already viewed on their screens.

**Changes:**
1. Database migration adding `email_notified_at` column, composite and partial indexes on `order_messages`, and Supabase `pg_cron` schedule registration calling `/api/cron/chat-notifications`.
2. Decoupled in-app notifications from external email alerts in `src/app/api/chat/messages/route.ts`: in-app notifications (`public.notifications`) remain immediate, while real-time message posting bypasses Resend completely.
3. Created unread digest dispatcher and responsive HTML template in `src/app/api/emails/chatNotification.ts` batching unread messages per recipient and updating `email_notified_at = now()`.
4. Implemented secure cron route `src/app/api/cron/chat-notifications/route.ts` with Bearer/webhook authorization, 15-minute grace window evaluation, and recipient resolution.
5. Added automated unit and integration tests in `tests/delayed-chat-notifications.test.mjs` verifying suppression, threshold, consolidation, idempotency, and security gates.

**Impact:** Eliminates inbox spam during active chat sessions while ensuring unread messages are reliably aggregated into a single actionable email digest after 15 minutes.

**Where to verify:** `pnpm test` (all 15 test cases passing); `make check` (zero lint issues); migration `supabase/migrations/20261123000001_delayed_chat_notifications.sql`.

**Interview one-liner:** "Replaced noisy per-message email notifications with a 15-minute grace window and Supabase pg_cron digest pipeline that consolidates unread order messages and suppresses alerts for active users."

---

## 2026-11-23 · Checkout returns to the originating environment

**Problem:** The checkout callback selected its destination from `NODE_ENV`. A local `next start` server runs with `NODE_ENV=production`, so Stripe returned localhost customers to `speedy.site` instead of the local onboarding flow.

**Changes:** `/api/checkout` now resolves the public request origin from the browser `Origin`, proxy-forwarded host, or request URL, with configured environment URLs only as a fallback. The success URL remains on that origin and opens onboarding step 3.

**Impact:** Local, production, and preview checkouts return to the environment where checkout started. The success and cancel callbacks cannot accidentally cross environments, and the local onboarding flow remains testable against the test Stripe account.

**Verify:** `pnpm typecheck`, changed-file ESLint, `pnpm build`; authenticated local checkout returned `http://localhost:3000/dashboard/onboarding?...&step=3`, while a production-origin request returned `https://speedy.site/dashboard/onboarding?...&step=3`.

**Interview summary:** Payment callbacks now stay in the environment where the customer started, so local and preview onboarding flows complete correctly without leaking into production.

---

## 2026-11-23 · Stable WordPress plugin keys and live combined status

**Problem:** Plugin downloads could generate or overwrite a site's key, the settings page cached a stale connected state for 30 days, and a deactivated plugin could still appear connected. Plugin and RUM state were checked separately.

**Changes:** Key creation now lives only in the authenticated `plugin-key` API, uses 256-bit CSPRNG output, reuses the existing key on every download, and enforces unique secrets in the database. The legacy `wp-secret` write path is closed. The plugin exposes a live status route and enqueues the RUM collector globally in the frontend header. The settings API probes plugin and RUM state together with no client-side status cache and persists both timestamps.

**Impact:** Reinstalling is safe and does not rotate credentials. Disabling the plugin is reflected as not active on the next settings check. RUM status now reflects the same live probe instead of a stale order flag. The plugin transient-caches an entitled RUM decision for five minutes and a negative decision for 30 seconds, avoiding an API call on every page view while allowing payment to activate RUM promptly.

**Verify:** `pnpm run typecheck`, `pnpm test`, `pnpm build`; settings page live check; plugin download twice and confirm the baked key is identical.

**Interview summary:** Plugin connections now use stable per-site credentials and live status, so reinstalls do not break and deactivation is visible immediately.

## 2026-11-03 · Free tier site limit increased to 10 + add-site reliability fix

**Problem:** Users on free accounts encountered issues when adding sites:
1. `src/app/api/orders/newOrder/route.ts` was still hardcoded to `FREE_SITE_LIMIT = 1`, blocking additions at the API level even after `site-limit` returned capacity.
2. In `addSite.tsx`, the `POST /api/orders/newOrder` mutation was wrapped in client-side `cachedData` with a static key `orders`, caching failed attempts in `sessionStorage` and blocking retries.
3. In `addSite.tsx`, error responses from `newOrder` returning `{ error: "..." }` were ignored in favor of `res.body.message`, causing the UI to show a generic "Failed to create site." instead of the real reason.
4. Accounts missing a `user_services` row (e.g. if signup trigger was skipped) had no auto-provisioning fallback, permanently returning 403 "No active service found".
5. In `delete-site/route.ts`, sequential updates clearing `order_id` then trying to match on `order_id` prevented `website_name` from being cleared on deleted free services.

**Changes:**
- `src/app/api/orders/newOrder/route.ts`:
  - `FREE_SITE_LIMIT` updated to 10.
  - Auto-provisions active free service entitlement if the account has no active services.
  - Only updates `order_id`/`website_name` on `user_services` when unbound (`!activeFree.order_id`), supporting multi-site free accounts.
- `src/app/api/orders/site-limit/route.ts`: `FREE_SITE_LIMIT` set to 10.
- `src/components/theme/addSite.tsx`:
  - Removed `cachedData` wrapper from `addOrder` mutation.
  - Improved error display to check `res.body.error || res.body.message`.
- `src/app/api/orders/delete-site/route.ts`: Combined clearing of `order_id` and `website_name` in a single atomic update.
- `supabase/migrations/20261103000001_free_site_limit_10.sql`:
  - Updated `enforce_free_site_limit()` trigger function on `orders` to allow up to 10 free orders.
  - Updated `handle_new_user()` trigger to initialize `max_sites: 10`.
- `scripts/test-free-limit.js`: Updated automated test loop to test 10 free orders succeeding and the 11th being blocked.

**Impact:** Free users can connect up to 10 sites. The site addition flow is reliable, unblocks failed retries immediately, and surfaces accurate server errors.

**Where to verify:** `pnpm build` / `tsc --noEmit`; migration test script `scripts/test-free-limit.js`.

---

## 2026-10-24 · Pricing page redesigned to a minimalist single-panel layout

**Problem:** The previous `/dashboard/pricing` used a dropdown selector (pointless with one
product), a giant 2xl/extrabold price block, 6 per-benefit icon tiles, 4 unlock
pills, and a boxed `CurrentPlanBadge` - all adding visual weight but no signal.

**Changes:**
- `src/app/(dashboard)/dashboard/pricing/page.tsx` (rewritten, ~429 → ~350
  lines): one `ServicePanel` per `UPGRADE_SERVICES` entry; with today's single
  `managed_wp` product the page is a single bordered card, no selector.
- Removed per-benefit `icon` field (all 6 icons → one shared `Check` glyph at
  40% opacity).
- Price inline with service name; unlocks collapsed to one muted line.
- Numbered setup steps: outlined number tiles instead of filled circles.
- `CurrentPlanBadge` → quiet text pill (green when paid, muted when free).
- Still uses the same `validatePlan` guard, `/api/checkout` POST, and
  `w-full space-y-6 p-6` full-width wrapper.

**Impact:** fewer DOM nodes, less color noise, faster scan-to-CTA. Adding a
second product still requires only a `PRICE_MAP` entry + one `UPGRADE_SERVICES`
object - no UI change.

**Where to verify:** `npx tsc --noEmit --skipLibCheck`, `npx eslint`, `npm run
build` all exit 0; `/dashboard/pricing` emits at 5.58 kB (was 4.82 kB). A page
reload clears any cached plan value.

---
## 2026-10-24 · Plan now honours `status` / `expires_at` - cancelled and expired services no longer show as Managed WP

**Problem:** `/dashboard/pricing` rendered "Current plan: Managed WP" for
accounts that no longer hold a live entitlement. Verified against production
data - two accounts were affected:

| account | service row | shown | should be |
|---|---|---|---|
| mindyloub@gmail.com | `managed_wp` / **cancelled** / 2027-04-21 | Managed WP | Free |
| pinchofbitemarina@gmail.com | `managed_wp` / **expired** / 2027-06-09 | Managed WP | Free |

**Root cause:** `src/components/utils/planValidation/activePlan.ts` derived the
plan from `service_type` alone - `data.some(s => s.service_type === "managed_wp")`
- never checking `status` or `expires_at`, so a cancelled or expired row still
counted as paid. Every other entitlement gate in the repo already applies the
full predicate: `src/lib/wordpress/injection.ts` (`.eq("service_type", "managed_wp").eq("status", "active")` plus an `expires_at` future-or-null
check) and the `site-metadata` worker (`docs/systems/site-metadata-worker.md`:
paid = managed_wp + active + expires_at null-or-future). `activePlan.ts` was the
only consumer that skipped it - and it is the one that drives the UI.

**Changes:**
- `activePlan.ts`: `fetchPlan` now selects `service_type, status, expires_at`
  and resolves through a new `isLiveManagedWp()` helper implementing the
  documented predicate. Cache key bumped to `user-plan:${userId}:v2` so answers
  written before the fix are not reused; the key still sits under the
  `user-plan` prefix so `cleanExpiredCache` keeps sweeping it.
- `src/app/(dashboard)/dashboard/pricing/page.tsx`: full-width page
  (`w-full space-y-6 p-6` - the wrapper the sibling dashboard pages use)
  instead of the centred `max-w-5xl` marketing column.

**Impact:** cancelled and expired accounts fall back to Free, so they see the
checkout CTA again instead of "Active on your account".

**Where to verify:** `node scripts/diag-plan-check.js` reproduced both
mismatches before the change (script deleted afterwards, it printed user
emails); `npx tsc --noEmit --skipLibCheck`, `npx eslint`, and `npm run build`
all exit 0. A page reload is required to clear a wrong value already held in
React state - the layout effect only fetches while `plan === null`, and the
`:v2` key only helps on a fresh load.

**Known, not fixed:** `src/app/api/orders/newOrder/route.ts:53` checks
`service_type === "managed_wp" && status === "active"` but ignores `expires_at`,
so an expired service still passes the paid site-limit branch. `free` accounts
are unaffected - they get no `managed_wp` row at all.

---


## 2026-10-24 · Dashboard pricing redesigned into a service selector

**Problem:** `/dashboard/pricing` rendered the marketing plan-card layout - Free
vs Managed side by side, gradient hero styling. Inside the dashboard that read
wrong: the user is already signed in, already on a plan, and wants to upgrade,
not compare tiers.

**Changes:**
- `src/app/(dashboard)/dashboard/pricing/page.tsx` (rewritten, 392 → 429 lines):
  the two-card comparison is now a **selector-driven upgrade panel**:
  - A dropdown (`@/components/ui/select` - the Radix Select already used by the
    RUM pages and toolbar) lists the available services to upgrade, each with
    price and terms.
  - Picking a service reveals **Benefits** plus **"How to configure it"** - a
    numbered setup path: one-time payment → confirm site details → connect your
    site → verification → first data. Steps 3 and 4 link out to
    `/dashboard/wordpress-plugin-analysis` and `/dashboard/managed-wp/status`.
  - A `Current plan` badge reads `plan` from `useSiteContext()`. Free users get
    the checkout CTA (`POST /api/checkout`, `priceKey`); paid users get an
    "Active on your account" notice plus a service-status link.
  - `PricingCardContent` and `planCards` removed from this page, which also
    removes the `(home)/pricing.tsx` duplication flagged in the entry below.
    The homepage still owns `PricingCardContent`; nothing imported it here.
  - `handleSubscribe` no longer sends `mode` - the model is one-time payment
    only, and `/api/checkout` already ignored it.
  - `if (plan === null) return null;` guards the layout's plan resolution, so
    paid users never see a "Free" flash while `validatePlan` runs.
- Services live in one `UPGRADE_SERVICES` array (`priceKey`, benefits, unlocks,
  setup steps). There is one purchasable service today - `managed_wp`, the only
  key in `PRICE_MAP` - so a second product is a `PRICE_MAP` entry plus one array
  object, with no UI change.

**Copy note:** setup step 3 follows `docs/GOALS.md` principle 2 - "connect your
site", never "install a plugin".

**Where to verify:** `tsc --noEmit --skipLibCheck` and `eslint` clean (exit 0);
`npm run build` succeeds and emits `/dashboard/pricing` (4.82 kB);
`GET /dashboard/pricing` signed out returns 307 → `/sign-in` so the route
resolves. Still unverified: signed-in rendering of both plan states and the
checkout button.

---

## 2026-10-24 · Pricing page moved to dashboard + sidebar fix

**Problem:** There was never a `/pricing` route: `src/app/(home)/pricing.tsx` is a component file (exports `PricingCardContent`, no default export), so the sidebar's `/pricing` link 404'd for authenticated users, and the earlier `/account/subscription` link was also dead.

**Changes:**
- `src/app/(dashboard)/dashboard/pricing/page.tsx` (new): dashboard-scoped pricing page. Reuses the `PricingCardContent` card (same Free / Managed WordPress Performance plan data as the homepage) plus a "what you unlock" panel.
- Reads the active plan from `useSiteContext()` (already resolved by the dashboard layout via `validatePlan`), so no extra request: paid users see "Current Plan", free users get the checkout CTA (`POST /api/checkout`, `priceKey: "managed_wp"`).
- `src/components/sidebarDesign/AppSidebar.tsx`: "Pricing & Upgrade" link updated from `/pricing` → `/dashboard/pricing`.
- `/account/subscription` references removed (already done in previous commits).

**Impact:** Authenticated users now see "Pricing & Upgrade" in sidebar → `/dashboard/pricing` → Free vs Managed WP comparison → Stripe checkout. Unauthenticated visits to `/dashboard/pricing` redirect to `/sign-in` instead of crashing or 404ing.

**Where to verify:** `tsc --noEmit --skipLibCheck` + `eslint` pass on the page and sidebar. Runtime: `GET /dashboard/pricing` while signed out returns 307 → `/sign-in` (route resolves, no "default export is not a React Component" error); signed in it renders the cards.

**Note:** `PricingCardContent` is duplicated between `(home)/pricing.tsx` and the new page rather than shared. Intentional for now: the public homepage needs a logged-out variant, the dashboard needs plan-awareness. Consolidate behind one shared component if the two start to drift.

---
## 2026-10-24 · Creative free-tier upsell at add-site success and upgrade modal

**Problem:** The add-site flow and upgrade modal had minimal copy ("Upgrade Required", "One payment, one year") with no value demonstration. Free-tier users saw only CrUX data with no context for why to upgrade.

**Changes:**
- `src/components/theme/addSite.tsx`:
  - Added `showUpgrade` state for upgrade modal
  - Enhanced success state with creative upsell card showing 5 concrete benefits:
    - Real-user Core Web Vitals (not 28-day averages)
    - Per-page, per-device, per-browser breakdown
    - Auto-injected RUM script via plugin (zero copy-paste)
    - Issue detection + expert fix service
    - Core Web Vitals Pass Guarantee
  - Added "Upgrade Now -- $299 / year" button opening modal
  - Full-screen upgrade modal with same benefit-driven copy + checkout integration

- `src/components/theme/planFallback.tsx`:
  - Added rocket emoji header
  - Expanded benefit list (same 5 points)
  - Updated button text to "Upgrade Now -- $299 / year"
  - Kept "One payment, one year, no auto-renewal" disclaimer

**Impact (before → after):**
- Free-tier add-site success: bare "script copied" message → value-driven upsell with 5 specific benefits
- Upgrade modal: generic "Upgrade Required" → benefit-led pitch with concrete outcomes
- Checkout flow: unchanged (still hits `/api/checkout` with `priceKey: "managed_wp"`)

**Where to verify:** `npm run typecheck` + `eslint` on both files. Manual test: add a site as free user → see upsell card → click "Upgrade Now" → modal opens → "Upgrade Now" redirects to Stripe checkout.

---
## 2026-10-24 · Database index cleanup -- dropped 10 redundant indexes

**Problem:** `supabase inspect db index-stats` showed 10+ indexes with 0% usage and 0 scans, wasting space and slowing writes.

**Changes:**
- `supabase/migrations/20261024000002_drop_redundant_indexes.sql` (new):
  - `uniq_user_services_free_per_user` -- old free-tier unique index (replaced by trigger)
  - `idx_orders_user_id` -- duplicate FK index (covered by `idx_orders_user_id_website_name` with 10K+ scans)
  - `idx_user_services_order_id`, `idx_user_services_status`, `idx_user_services_service_type` -- never used
  - `website_metadata_url_key` -- unique constraint on empty table
  - `idx_wp_scans_status`, `idx_wp_scans_scan_type` -- indexes on empty table
  - `idx_optimization_tasks_category`, `idx_optimization_tasks_status` -- indexes on empty table

**Retained (could not drop):**
- `orders_website_name_key` / `orders_website_address_key` -- unique constraints referenced by FKs from RUM tables
- PK constraints on empty tables (`email_reporting`, `wp_scans`, `website_metadata`) -- required for table structure

**Impact:** ~160 KB index space freed, write paths slightly faster. No functional change.

**Where to verify:** `npx supabase inspect db index-stats` -- the 10 dropped indexes no longer appear.

---
## 2026-11-23 · Passive RUM visits now reach Cloudflare and Supabase

**Problem:** The live WordPress collector loaded on `feedingnature.com`, and its domain was correctly present in both Supabase and the Cloudflare entitlement KV, but a passive browser visit produced no `rum_metrics` row. The deployed collector waited for LCP, CLS, and INP before its 20-second flush. INP requires an interaction, so passive visits remained buffered until a page-hide event. The collector also had no `pageview_id`, and its `application/json` beacon triggered a CORS preflight that failed in the browser before the POST was sent.

**Changes:**
- The collector generates one stable `pageview_id` per pageview and includes it in every payload, allowing the existing `upsert_rum_metrics_batch` RPC to merge continuation beacons into one row.
- Passive visits flush after 20 seconds without requiring INP. A later INP value is sent as a continuation beacon under the same `pageview_id`.
- `navigator.sendBeacon` now uses `text/plain;charset=UTF-8` for a CORS-safelisted request. The Worker still parses JSON and derives authorization from Origin/Referer, so the security gate is unchanged.
- The root collector build now generates both `public/rum.js` and the Worker-served `cloudflare-workers/rum/src/rum.txt` from one source, with `esbuild` declared as a root dev dependency.

**Impact (before → after):**
- Passive pageview: no browser POST and no database row -> browser POST accepted with HTTP 202 and one merged `rum_metrics` row.
- Continuation data: no pageview identity -> stable UUID merge key for interaction metrics.
- Collector delivery: separate, drifting artifacts -> one reproducible source build.

**Verified:** `feedingnature.com` returned HTTP 200 with `rum.speedy.site/rum.js`; Cloudflare tail showed the browser POST accepted with HTTP 202 and no exceptions; Supabase contained one browser row with `pageview_id`, geo, client, web-vitals, navigation, render-blocker, and resource-summary events. Unknown domains remained rejected with HTTP 403.

---
## 2026-10-24 · Free tier site limit increased from 1 to 3

**Change:** Free tier users can now connect up to 3 sites (was 1) without upgrading to a paid plan.

**Files changed:**
- `src/app/api/orders/site-limit/route.ts`: `FREE_SITE_LIMIT` constant `1 → 3`
- `src/app/api/orders/newOrder/route.ts`: error message updated, limit check uses new constant
- `supabase/migrations/20261011000002_free_service_tier_backfill.sql`: metadata `"max_sites": 1 → 3`
- `supabase/migrations/20261011000003_free_service_tier_constraints.sql`: trigger metadata `"max_sites": 1 → 3`
- `supabase/migrations/20261024000001_free_site_limit_3.sql` (new): replaces unique index `uniq_orders_free_per_user` (max 1) with BEFORE INSERT trigger `enforce_free_site_limit` that allows up to 3 free orders per user

**Rationale:** CrUX data is free from Google (no ingestion cost); 3 sites gives users more value while still preserving the upgrade incentive for RUM (real-user monitoring) and expert services.

**Where to verify:** `npm run typecheck` + `eslint` on touched routes. DB: apply migration `20261024000001` → free users can create up to 3 orders with `product_type='free'`; 4th attempt returns 403/DB exception.

---
## 2026-10-24 · RUM injector module baked into the downloadable WordPress plugin

**Problem:** the server-side injection API and entitlement fix existed, but the customer's WordPress site had no code to call the API and enqueue `rum.js`. The existing "Plugin Auditor" plugin only exposed a REST endpoint for analysis; it did not inject the collector.

**Changes:**
- `src/app/(dashboard)/dashboard/wordpress-plugin-analysis/companionPlugin.tsx`:
  - Bumped plugin version to 1.3; description updated to mention auto-inject RUM.
  - Baked `SPEEDY_SITE_API_ORIGIN` (dashboard origin at zip time) into the generated PHP.
  - Added `wp_enqueue_scripts` hook (`rum-injector` module) that:
    - Reads the site's host via `home_url()`, normalizes it (trim/lowercase/strip one leading `www.`) to match the API's `normalizeDomain`.
    - Uses the pre-shared `SPEEDY_SITE_AUTH_KEY` as the per-domain secret.
    - Calls `POST {apiOrigin}/api/wordpress/injection` with `{ domain, key }`.
    - Transient-caches an entitled response for 5 minutes and a negative response
      for 30 seconds (`speedy_site_rum_injection_v1_7_<md5(domain)>`).
    - On `{ "inject": true, "scriptUrl": "..." }`, enqueues the collector via `wp_enqueue_script` (in footer).
    - Fail-closed on network errors, non-200, or malformed responses.
  - The download button continues to produce `speedy-site-plugin-auditor.zip` with the updated PHP.

**Impact (before → after):**
- Paid Managed WP sites: manual snippet required → plugin auto-injects `rum.js` once the hourly `site-metadata` sync has populated the entitlement KV (or immediately if sync already ran). Free sites get `{ inject: false }` and no script.
- No schema change; the generated zip is the new artifact. Existing installations will auto-update if re-downloaded.

**Where to verify:** `npm run typecheck` and `npx eslint` on the touched file. Manual test: download the plugin zip, upload to a WordPress site with a paid managed_wp entitlement, confirm `rum.speedy.site/rum.js` appears in the page source (footer) and the transient `speedy_site_rum_injection_<hash>` is populated in `wp_options`.

---
## 2026-10-23 · Paid Managed WP sites finally get a RUM-entitled domain and an injector API

**Problem:** the RUM ingestion gate (`site-metadata` → `event-buffer`) decides eligibility from `user_services.website_name` on a `managed_wp` row, but neither paid path ever wrote that column. The Stripe webhook creates the entitlement with no site, `POST /api/orders/managed/add` only stored `payment_id` on `wordpress_cred`, and the dashboard `newOrder` paid branch set `order_id` only. Net effect: every paying Managed WP customer had `user_services.website_name = null`, so the sync skipped the domain, the KV never listed it, and `event-buffer` returned 403 on every beacon (the script loads, no data collected). There was also no documented, self-contained API for the plugin to ask whether to inject the collector. Detail: `docs/systems/rum-injector-plugin.md`.

**Changes:**
- `src/app/api/orders/newOrder/route.ts`: the paid (`activeManaged`) branch now sets `website_name: insertedOrder.website_name` on the `user_services` link, mirroring the free branch.
- `src/app/api/orders/managed/add/route.ts`: after the order and WP creds succeed, the managed entitlement row is linked with `order_id` and `website_name: selectedSite` (matched by the resolved `payment_id`), the same value stored in `orders.website_name`. The expert `autoAssignOrder` hook is untouched.
- `src/lib/wordpress/domain.ts`: `normalizeDomain` (trim, lowercase, strip one leading `www.`), identical to the `site-metadata` worker so the injector and the edge resolve the same label.
- `src/lib/wordpress/injection.ts`: `resolveInjection({ domain, key })` verifies the per-site `wp_key` secret (constant-time compare) and checks the paid entitlement; exports `RUM_SCRIPT_URL`.
- `src/app/api/wordpress/injection/route.ts`: `POST` answers `{ inject, scriptUrl }`, fail-closed, with an in-memory per-domain limiter (pattern reused from `api/emails/contact`).

**Impact (before → after):**
- Paid Managed WP RUM: domain absent from the KV gate, 403 on every beacon → entitled domain present on order creation; beacons are accepted once the hourly site-metadata sync runs, and the plugin gets a single, self-contained `inject` answer instead of a hand-pasted script.
- No schema or OpenAPI change; the injection endpoint is additive. Free sites are unaffected (still `managed_wp`-gated, CrUX only).

**Where to verify:** `npm run typecheck` and `npx eslint` on the touched files. DB check: after `managed/add` or a paid `newOrder`, the `managed_wp` `user_services` row has `website_name` set (matches `orders.website_name`). API check: `POST /api/wordpress/injection` with a paid domain + valid key returns `{ "inject": true, "scriptUrl": ... }`; free/unknown returns `{ "inject": false }`. End-to-end data needs the hourly site-metadata sync (or a manual `POST` to that worker with the cron secret).

---

## 2026-10-23 · Auto-assign hook wired into the managed-WP order flow

**Problem:** Phase 1 of the expert-management design shipped the SQL (`pick_next_expert()`, `order_assignments`, `experts_pool`) plus the admin assign API, but the customer-facing order path never called it. Every paid Managed WP order landed with no expert attached, so nothing routed the order to the expert queue and the service loop (order → expert) could not start.

**Changes:**
- `src/app/api/orders/managed/add/route.ts`: after the order, WP creds, and customer email succeed, a new `autoAssignOrder(orderId)` runs `pick_next_expert()` and inserts a `pending` `order_assignments` row. It skips if the order already has an active assignment (route retries) and no-ops when the pool is empty, so an order without a free expert still succeeds and enters the unassigned queue.
- The hook is isolated: any assignment failure is logged and swallowed, so it can never fail the customer's order creation. `assigned_by` is left null to mark it as system/auto (the admin route records the acting admin instead).

**Impact (before → after):**
- Paid Managed WP order: created but never assigned → auto-assigned to the next available expert (round-robin, capacity-aware) the moment experts populate the pool. Design detail: `docs/systems/admin-expert-management.md` (Phase 1) and `docs/systems/managed-wp-order-assignment.md` (P2).

**Where to verify:** `tsc --noEmit` and `eslint` pass on the route; `POST /rest/v1/rpc/pick_next_expert` returns `null` while the pool is empty (so orders currently go to the unassigned queue). End-to-end proof needs one available expert in `experts_pool`: submit `POST /api/orders/managed/add` and confirm an active `order_assignments` row (`status='pending'`, one per order) is created.

---

## 2026-10-23 · Admin Operations Mission Control, Order Dispatch, SLA Queue, Support Hub, and Clean Middleware Routing

**Problem:** The managed WP optimization service lacked an operational control center for admins to triage customer tickets, track SLA-breaching unassigned orders, dispatch/reassign orders to developer pools with capacity limits, and review live performance metrics. Additionally, URL paths leaked internal directory names (`/admin`), the tickets discussion view suffered from flexbox height clipping and container scroll occlusion, and navigating to `/account` broke the sidebar layout due to missing context providers.

**Changes (details: `docs/systems/admin-expert-management.md`):**
- **Operations Mission Control (`/dashboard`):** Executive overview with 4 KPI metrics (queue depth, active optimizations, developer utilization, open tickets), critical SLA warning banner for orders waiting > 12h, operational dispatch shortcuts, and live feed.
- **Managed WP Orders (`/dashboard/orders`):** Search by domain, customer email, or order ID; status filter pills; pagination; sliding detail drawer linking directly to live RUM Core Web Vitals evidence; and dispatch actions (Assign, Reassign, Skip with reason, Mark Completed) with assignment audit trail.
- **SLA-Aware Unassigned Queue (`/dashboard/queue`):** Real-time wait duration badges (`<1h`, `4–12h`, `>12h critical`), inline dispatch modal (auto round-robin or manual selection), and batch auto-assign.
- **Customer Support Hub (`/dashboard/tickets`):** Two-column split-pane inbox allowing admins to triage customer inquiries, reply to messages, and update resolution status (`open`, `pending`, `closed`). Fixed layout occlusion by adding `min-h-0` flexbox constraints, replacing `scrollIntoView` with targeted internal scroll, and removing column gaps for clean border alignment.
- **Developer Pool Management (`/dashboard/experts`):** Email invitations, capacity controls, and availability toggle for round-robin dispatch.
- **Clean Middleware Routing:** Next.js middleware inspects `profiles.role` via Supabase service client and internally rewrites requests, keeping browser URLs clean (`/dashboard`, `/dashboard/orders`, `/dashboard/queue`, `/dashboard/tickets`, `/dashboard/experts`) while maintaining source code isolation in `src/app/(dashboard)/dashboard/admin/*` and `expert/*`.
- **Account Sidebar Fix (`/account`):** Wrapped `AccountLayout` with `AuthProvider` and `SiteContextProvider` in `src/app/account/layout.tsx`, resolving the permanent `roleLoading: true` skeleton state.

**Impact (before → after):**
- Order triage & assignment: manual DB inspection → 1-click dispatch modal with automated round-robin and developer capacity protection.
- SLA visibility: zero queue metrics → real-time wait duration tracking with >12h critical alerting.
- URL architecture: exposed `/admin/*` paths → unified clean `/dashboard/*` URLs with transparent role rewriting.
- Tickets chat layout: container scrolled off-screen by 488px on thread load → zero container scroll, perfectly aligned inside rounded container with internal message scrolling.
- Account sidebar: stuck in pulsing skeleton state forever → fully rendered navigation links and user profile dropdown.

**Where to verify:**
- `http://localhost:3000/dashboard`, `/dashboard/orders`, `/dashboard/queue`, `/dashboard/tickets`, `/dashboard/experts`, `/dashboard/account`.
- Pull Request #16 on GitHub (`feature/admin-allocations` → `dev`).

**Interview one-liner:** "Built the operational mission control for our managed WordPress optimization service, complete with SLA queue alerting, round-robin developer dispatching, and live RUM evidence links, while keeping URL architectures clean and role-segregated via edge middleware rewriting."

---

## 2026-10-23 · Expert auto-assign outage fixed at the database

**Problem:** migration `20261022000001` was pushed to the operational database before a bug in it was caught: `pick_next_expert()` read `experts_pool.active_load`, a column that only exists on the `experts_pool_live` view. Every auto-assignment call failed at runtime with `42703 column e.active_load does not exist`: expert routing was down from the moment the migration landed.

**Changes:**
- Follow-up migration `20261023000001_fix_pick_next_expert.sql` replaces the function: the load count is computed inline from `order_assignments` via `CROSS JOIN LATERAL`, and `FOR UPDATE OF e SKIP LOCKED` stays on the base table so the capacity check remains atomic (an applied migration is never edited in place; the fix ships as a new version)
- Applied to the live database with `supabase db push`; types regenerated (`database.types.ts` now includes the expert tables) and the dead root `db.types.ts` deleted

**Impact (before → after):**
- Auto-assignment path: every call errored (42703) → functional (verified with a throwaway expert: pick returned the expert and advanced `rr_position` 0→1→2; the test expert was cascade-deleted afterwards, leaving no residue)

**Where to verify:** `POST /rest/v1/rpc/pick_next_expert` returns `null` while the pool is empty; migration `20261023000001` is recorded in `supabase_migrations.schema_migrations`; `supabase migration list --linked` shows it on both sides.

---

## 2026-10-22 · RUM ingestion: "403 for every new customer" fixed at the edge

**Problem:** the `event-buffer` ingestion gate read entitlement from a KV that
`sub-kv-metadata` had stopped feeding: that worker watched the `subscriptions`
table, which the user_services model migration dropped. Every domain provisioned
after that migration got a 403 on every beacon (the script still loads, no data
collected). Secondarily, the gate trusted the payload's own
`data.siteDomain`, so a copied `<script>` tag plus curl could write into another
site's metrics.

**Changes (details: `docs/systems/site-metadata-worker.md`):**
- New `site-metadata` worker syncs entitlement from `services_with_domains` into KV
  `SITE_METADATA` (`domain:{website_name}` → `{serviceId, status, expiresAt, pageviewLimit}`)
- `event-buffer` derives the domain from Origin/Referer at the edge instead of the
  payload, rejects unknown/oversized bodies (403/413), and reuses the same KV
  namespace so the sync deletes the stale keys
- `sub-kv-metadata` deleted; root `.gitignore` scoped from a blanket
  `/cloudflare-workers` down to `.wrangler/`, `node_modules/` and `.dev.vars`, so
  the replacement workers can be committed and deployed from CI

**Impact (before → after):**
- Ingestion for a domain provisioned after the DB migration: 403 → 200
  (verified 2026-10-22: `/collect` returned 202 for a seeded domain and 403
  for an unknown one; the alarm flush landed a row in `rum_metrics`)
- Domain source of truth: client payload → edge Origin/Referer
- Workers feeding the ingestion KV: one dead worker → one live sync; daily KV
  writes stay in the low double digits on the free plan (compare-before-write)

**Verified 2026-10-22:** KV `domain:{website_name}` written for all 9 entitled
domains after one sync; `event-buffer` `/collect` returned 202 for an entitled
domain and 403 for an unknown one; `rum.speedy.site/rum.js` serving is untouched
(separate `rum` worker).

## 2026-10-13 · Analytics pipeline: ~95% free-tier quota bleed eliminated

**Problem:** both analytics workers sat near Cloudflare free-tier ceilings
(~95%) while serving a handful of dashboard users. Bots could trigger the
whole pipeline through unauthenticated endpoints; writes were N+1 against a
D1 database with zero indexes; reads bypassed every cache layer we own.

**Changes (details: `docs/systems/analytics-pipeline.md`):**
- All worker endpoints now require a secret header; public `/` and `/test`
  triggers deleted; the secret that lived in the client bundle removed
- Upserts rewritten: 3N queries per cron run → 1 keys-read + 1 `env.DB.batch()`
- Created the first D1 indexes (`idx_web_metrics_key`,
  `idx_traffic_source_key`); every UPDATE had been a full table scan
- Cron frequency hourly → every 4h (24 → 6 runs/day)
- Dashboard reads moved off workers.dev behind Next.js API routes with
  `revalidate` caching (shared client in `src/lib/analytics/workers.ts`)

**Impact (before → after):**
- Cron write queries: 72N/day → 12/day (2 per run × 6 runs)
- Unauthenticated endpoints: 4 → 0 (verified live: 401 without secret)
- Dashboard view cost: 3 worker invocations + 3 D1 query sets → zero browser
  calls to workers, one cached upstream call per hour
- Quota: ~95% → projected single digits (48h watch pending)

**Verify:** worker versions 3289aeda / fdc774f4; production smoke test: all
three proxy routes return 200 through the authenticated chain.

**Interview one-liner:** "Our edge analytics sat at 95% of free-tier quota
with a handful of users. The cause was architectural, not load: triggers
anyone could run, N+1 writes against a database with zero indexes, and a read
path that bypassed all caching. I fixed the architecture instead of upgrading
the plan."

## 2026-10-13 · CI build made deterministic (no secrets required)

**Problem:** CI failed at Next.js "Collecting page data": route modules
executed client constructors at import time (`new Resend`, `new Stripe`,
Supabase `setupDB`, `Redis.fromEnv`) and threw without env vars.

**Changes:** build-safe placeholder fallbacks at every module-level
constructor (11 files, e.g. `src/lib/db/db_config.ts`,
`src/components/utils/redisCache.ts`). Page-data collection only imports
modules, so placeholder clients are never used during a build; real env wins
at runtime.

**Impact:** CI (typecheck + lint + build) passes with zero secrets; verified
by hiding `.env.local` and re-running the exact CI sequence: full pass.

**Interview one-liner:** "Module-level side effects made our build depend on
production secrets. I made every client constructor tolerate absent env and
defer failure to first use, so builds are deterministic and CI needs no
secrets."

## 2026-10-13 · Environment variable audit: 37/40 keys → 13, exact parity

**Problem:** env drift across local, Vercel, and code; duplicate and legacy
keys; an API secret shipped in the client bundle.

**Changes:** migrated `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy JWT) to
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new Supabase format) across the three
db client files; removed 24 unused keys (Upstash/Redis, Postgres, EmailJS,
PSI, AI Gateway, duplicates) from `.env.local`, `.env.example`, and Vercel;
preview deployments disabled on Vercel; Vercel now mirrors `.env.local`
exactly (13 keys, production + preview + development).

**Impact:** 40 Vercel entries → 13; zero unused credentials in any system;
key format future-proofed; config drift eliminated.

**Interview one-liner:** "Env config is attack surface: I audited every key
across three systems, removed two-thirds of them, and made all environments
match exactly."

## 2026-10-13 · Secrets remediation: committed service key → secret managers

**Problem:** `SUPABASE_SERVICE_ROLE_KEY` (bypasses all row-level security)
sat committed as a plain var in two Cloudflare worker configs, and an API
secret was hardcoded in the client bundle.

**Changes:** the service key was removed from both `wrangler.jsonc` files and
uploaded as a Wrangler secret on all four workers (analytics-cron, traffic-source-cron, event-buffer, site-metadata); Supabase-side rotation completed 2026-10-13; RUM ingestion verified end-to-end with new key. The API secret moved server-side behind a Next.js proxy.

**Impact:** no secrets in the repo or client bundles; the credential that bypasses RLS exists only in secret managers with the rotated key; RUM pipeline (event-buffer → upsert RPC) verified live with new key.

**Interview one-liner:** "A key that bypasses all row-level security was in
git. Deleting the file is not remediation: rotation plus secret managers is."

## 2026-10-11 · Subscription → service model migration (billing + free tier)

**Problem:** the subscriptions model was retired in favor of a $299 one-time
service, but old tables were dropped while APIs still gated on them; new
signups needed automatic provisioning.

**Changes (details: `docs/migration/README.md`):** database migrated to
`user_services` (11 services migrated, old tables dropped on staging);
`/api/account/auth` rewritten cookie-based against `user_services` (jose
removed); free tier auto-provisioned by a `handle_new_user()` trigger plus
backfill; 1-site free limit enforced with entitlement-aware APIs and DB
unique indexes (an IDOR fixed along the way); new `POST /api/checkout` and an
idempotent, signature-verified Stripe webhook for the one-time flow.

**Impact:** the billing funnel runs on the one-time model; every signup gets
a free service automatically; entitlement enforcement moved into the database.

**Interview one-liner:** "We migrated billing from recurring subscriptions to
a one-time service model, moving entitlement checks from application code
into the database with trigger-based provisioning."

## 2026-11-22: Order-scoped communication channels with role-gated access (ADR-0002)

**Problem:** Customers, assigned performance experts, and administrators required structured communication scoped to specific WordPress optimization orders. Platform administrators needed full visibility into customer-expert dialogue for quality assurance without ability to post to customer threads, while requiring a private backchannel to coordinate with experts.

**Changes:**
1. Database migration adding `order_conversations` and `order_messages` tables with strict Row Level Security (RLS) enforcing customer read/write on client channels, admin read-only observation on client channels, and private admin-expert internal channels.
2. Realtime listener hook and broadcast channel support in `src/lib/chat/realtime.ts`.
3. Role-gated server API endpoints (`/api/chat/conversations`, `/api/chat/messages`, `/api/chat/messages/read`) with notification pipeline dispatch (in-app and Resend email alerts).
4. Reusable frontend chat UI suite in `src/components/chat/` (`OrderChatPanel`, `MessageBubble`, `ChatInput`, `TypingIndicator`).
5. Dashboard integrations:
   - Customer dashboard (`/dashboard/managed-wp/status`) integrated with live expert chat.
   - Expert dashboard (`/dashboard/expert/orders`) equipped with dual-channel drawer.
   - Admin dashboard (`/dashboard/admin/orders`) equipped with read-only customer dialogue stream alongside active expert backchannel.
6. Automated test suite in `tests/order-communication-channels.test.mjs` verifying role isolation and write rejection.

**Impact:** Tamper-proof, order-scoped communication with zero third-party chat server dependencies, enforcing compliance oversight and staff coordination natively in Supabase and Next.js.

**Interview one-liner:** "Implemented dual-channel order messaging with Postgres RLS: platform admins can supervise client threads in strict read-only mode while maintaining an isolated staff backchannel with assigned experts."

