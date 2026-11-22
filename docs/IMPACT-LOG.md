# IMPACT-LOG: Track Record of Major Changes

> **Purpose:** a short, interview-ready record of the most impactful
> engineering changes to speedy.site. Newest first.
> **Entry rules (AGENTS.md rule 2):** only major, measurable changes (cost,
> security, performance, reliability, product); each entry states problem,
> changes, before/after impact, and where to verify; link details instead of
> duplicating them.
> **Last updated:** 2026-11-03

---

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
pills, and a boxed `CurrentPlanBadge` — all adding visual weight but no signal.

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
object — no UI change.

**Where to verify:** `npx tsc --noEmit --skipLibCheck`, `npx eslint`, `npm run
build` all exit 0; `/dashboard/pricing` emits at 5.58 kB (was 4.82 kB). A page
reload clears any cached plan value.

---
## 2026-10-24 · Plan now honours `status` / `expires_at` — cancelled and expired services no longer show as Managed WP

**Problem:** `/dashboard/pricing` rendered "Current plan: Managed WP" for
accounts that no longer hold a live entitlement. Verified against production
data — two accounts were affected:

| account | service row | shown | should be |
|---|---|---|---|
| mindyloub@gmail.com | `managed_wp` / **cancelled** / 2027-04-21 | Managed WP | Free |
| pinchofbitemarina@gmail.com | `managed_wp` / **expired** / 2027-06-09 | Managed WP | Free |

**Root cause:** `src/components/utils/planValidation/activePlan.ts` derived the
plan from `service_type` alone — `data.some(s => s.service_type === "managed_wp")`
— never checking `status` or `expires_at`, so a cancelled or expired row still
counted as paid. Every other entitlement gate in the repo already applies the
full predicate: `src/lib/wordpress/injection.ts` (`.eq("service_type", "managed_wp").eq("status", "active")` plus an `expires_at` future-or-null
check) and the `site-metadata` worker (`docs/systems/site-metadata-worker.md`:
paid = managed_wp + active + expires_at null-or-future). `activePlan.ts` was the
only consumer that skipped it — and it is the one that drives the UI.

**Changes:**
- `activePlan.ts`: `fetchPlan` now selects `service_type, status, expires_at`
  and resolves through a new `isLiveManagedWp()` helper implementing the
  documented predicate. Cache key bumped to `user-plan:${userId}:v2` so answers
  written before the fix are not reused; the key still sits under the
  `user-plan` prefix so `cleanExpiredCache` keeps sweeping it.
- `src/app/(dashboard)/dashboard/pricing/page.tsx`: full-width page
  (`w-full space-y-6 p-6` — the wrapper the sibling dashboard pages use)
  instead of the centred `max-w-5xl` marketing column.

**Impact:** cancelled and expired accounts fall back to Free, so they see the
checkout CTA again instead of "Active on your account".

**Where to verify:** `node scripts/diag-plan-check.js` reproduced both
mismatches before the change (script deleted afterwards, it printed user
emails); `npx tsc --noEmit --skipLibCheck`, `npx eslint`, and `npm run build`
all exit 0. A page reload is required to clear a wrong value already held in
React state — the layout effect only fetches while `plan === null`, and the
`:v2` key only helps on a fresh load.

**Known, not fixed:** `src/app/api/orders/newOrder/route.ts:53` checks
`service_type === "managed_wp" && status === "active"` but ignores `expires_at`,
so an expired service still passes the paid site-limit branch. `free` accounts
are unaffected — they get no `managed_wp` row at all.

---


## 2026-10-24 · Dashboard pricing redesigned into a service selector

**Problem:** `/dashboard/pricing` rendered the marketing plan-card layout — Free
vs Managed side by side, gradient hero styling. Inside the dashboard that read
wrong: the user is already signed in, already on a plan, and wants to upgrade,
not compare tiers.

**Changes:**
- `src/app/(dashboard)/dashboard/pricing/page.tsx` (rewritten, 392 → 429 lines):
  the two-card comparison is now a **selector-driven upgrade panel**:
  - A dropdown (`@/components/ui/select` — the Radix Select already used by the
    RUM pages and toolbar) lists the available services to upgrade, each with
    price and terms.
  - Picking a service reveals **Benefits** plus **"How to configure it"** — a
    numbered setup path: one-time payment → confirm site details → connect your
    site → verification → first data. Steps 3 and 4 link out to
    `/dashboard/wordpress-plugin-analysis` and `/dashboard/managed-wp/status`.
  - A `Current plan` badge reads `plan` from `useSiteContext()`. Free users get
    the checkout CTA (`POST /api/checkout`, `priceKey`); paid users get an
    "Active on your account" notice plus a service-status link.
  - `PricingCardContent` and `planCards` removed from this page, which also
    removes the `(home)/pricing.tsx` duplication flagged in the entry below.
    The homepage still owns `PricingCardContent`; nothing imported it here.
  - `handleSubscribe` no longer sends `mode` — the model is one-time payment
    only, and `/api/checkout` already ignored it.
  - `if (plan === null) return null;` guards the layout's plan resolution, so
    paid users never see a "Free" flash while `validatePlan` runs.
- Services live in one `UPGRADE_SERVICES` array (`priceKey`, benefits, unlocks,
  setup steps). There is one purchasable service today — `managed_wp`, the only
  key in `PRICE_MAP` — so a second product is a `PRICE_MAP` entry plus one array
  object, with no UI change.

**Copy note:** setup step 3 follows `docs/GOALS.md` principle 2 — "connect your
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
    - Transient-caches the response for 5 minutes (`speedy_site_rum_injection_<md5(domain)>`).
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

