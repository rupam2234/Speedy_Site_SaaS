# DESIGN: User onboarding flow (add site → public checks → managed opt-in → config tour)

> **Status:** Plan v1 · **Owner:** Speedy Site · **Last updated:** 2026-11-03
> **Scope:** The signed-in funnel from "add site (free)" to a paying managed-WP
> customer: site assignment, public data checks (CrUX + PSI), the dashboard
> upgrade opt-in, and the configuration tour that binds the WP plugin and
> collects the one-time payment.
> Read with `docs/GOALS.md`, `docs/plans/2026-10-10_000000_restructure_plan.md`,
> `docs/systems/rum-injector-plugin.md`, `docs/systems/site-metadata-worker.md`.

---

## 1. The funnel

```
signup
  │
  v
add site (free)  ──── hard limit: 10 free sites (orders trigger
  │                        enforce_free_site_limit, user_services.metadata.max_sites)
  v
dashboard content area
  └─ show managed-service upgrade card  (only while: >=1 site AND no live
  │                                       managed_wp entitlement)
  v
public data checks (both run in parallel, server-side)
  ├─ 1. CrUX history  → how the site has performed historically
  └─ 2. PSI (lab)     → what is slow right now
  │
  v
verdict
  ├─ slow / bad vitals → "your visitors are losing money" pitch
  └─ good vitals       → "you are winning; protect and compound it" pitch
  │                                 (SEO + GEO advantages)
  v
user clicks "explore" / "use the managed service"  ── the opt-in
  │
  v
configuration tour (/dashboard/onboarding)
  ├─ step 1  user selects the site
  ├─ step 2  we prepare the HMAC signature and bind it to the WP plugin
  ├─ step 3  user installs and activates the plugin
  ├─ step 4  plugin emits the signature
  ├─ step 5  we verify with the API and assign the RUM data collection script
  │          (collector already built and functioning; delivery stays
  │           entitlement-gated, see §6)
  └─ step 6  steps complete → collect the payment ($299 one time)
                │
                v
         Stripe checkout → required-data → order + expert assignment
         (existing flow) → entitlement flips → injector serves rum.js
```

Two hard product rules from `docs/GOALS.md` govern the whole funnel:

1. Free tier is **CrUX only**. No collector, no snippet, no plugin promise that
   is not kept.
2. One payment, $299 one time per site, never recurring.

---

## 2. Data model

New migration: `supabase/migrations/20261103000002_user_onboarding.sql`

### 2.1 `public.site_onboarding`

Per user + website_name. Tracks the card state, the checks result, and the
tour progress. One row per site so a 3-site free user gets three independent
decisions.

| column | type | notes |
|---|---|---|
| `id` | `uuid` PK default `gen_random_uuid()` | |
| `user_id` | `uuid` not null, FK `auth.users` on delete cascade | |
| `website_name` | `text` not null, FK `orders.website_name` on delete cascade | matches an existing order for this user |
| `status` | `text` not null default `'checks_pending'` | `checks_pending`, `checks_done`, `opted_in`, `tour_complete`, `dismissed` |
| `current_step` | `int` not null default `0` | tour step index 0..5 |
| `public_checks` | `jsonb` | the checks payload, §3 |
| `opt_in_at` | `timestamptz` | when the user agreed to explore |
| `tour` | `jsonb` not null default `'{}'` | per-step completion flags |
| `stripe_session_id` | `text` | set when checkout starts |
| `created_at` / `updated_at` | `timestamptz` default `now()` | `updated_at` kept fresh by trigger |

`CHECK (status IN (...))` on the five values. `UNIQUE (user_id, website_name)`.
RLS enabled; policies: select/insert/update where `auth.uid() = user_id`
(service role still bypasses for the API routes).

### 2.2 HMAC binding columns on `public.wp_key`

`wp_key` is already the per-domain plugin secret table (PK `domain`, FK to
`orders.website_name`). The tour's signature lives next to it so one row is the
single source of truth for "is this domain's plugin bound".

| column | type | notes |
|---|---|---|
| `hmac_signature` | `text` | the signature we prepared and bound |
| `hmac_expires_at` | `timestamptz` | binding window (default 24h) |
| `hmac_verified_at` | `timestamptz` | set when the plugin emitted it back |
| `rum_assigned_at` | `timestamptz` | set once verification succeeded |

Idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

---

## 3. Server API

All routes are session-authenticated (`getSupabaseServerUser`), identity never
from the body, structured errors `{ error, message? }`, service-role `setupDB()`
for writes (same pattern as `api/orders/*`).

| Route | Method | Purpose |
|---|---|---|
| `/api/onboarding/checks` | POST | Run CrUX + PSI for `{ site }`, compute verdict, persist `public_checks`, return payload |
| `/api/onboarding/state` | GET | Return the user's onboarding rows (all sites) |
| `/api/onboarding/opt-in` | POST | `{ site }` marks `opted_in`, `current_step = 0` |
| `/api/onboarding/dismiss` | POST | `{ site }` marks `dismissed` |
| `/api/onboarding/tour/step` | POST | `{ site, step, data? }` record a step completion, advance `current_step` |
| `/api/wordpress/hmac` | POST | Prepare signature: `{ domain }` → HMAC-SHA256 over `domain:timestamp:nonce` using `WP_HMAC_SECRET`, upsert into `wp_key`, return `{ signature, expiresAt }` |
| `/api/wordpress/hmac/verify` | POST | `{ domain, signature }` constant-time compare against stored, not expired → set `hmac_verified_at`, `rum_assigned_at`, return `{ verified }` |

`/api/onboarding/checks` details:

- **CrUX (historical):** POST `chromeuxreport.googleapis.com/v1/records:queryHistoryRecord`
  for DESKTOP and PHONE with the four metrics already used by
  `api/crux/history`. Reuse those request shapes; map to p75 per metric.
- **PSI (lab):** GET `www.googleapis.com/pagespeedonline/v5/runPagespeed`
  with `strategy=mobile` and `category=performance`, key `PSI_API_KEY` (new env
  var, documented in `.env.example`). Take `lighthouseResult.categories.performance.score`
  and the `largest-contentful-paint`, `cumulative-layout-shift`,
  `total-blocking-time`, `server-response-time` audits.
- Both calls are independent: `Promise.allSettled` so one failing source never
  blanks the card. A failing source is reported as `unavailable` with the
  reason and the verdict falls back to the source that did answer.
- Result persisted in `site_onboarding.public_checks` with `checked_at`; a
  repeat POST within 6h returns the stored payload unless `force=true`.

### Verdict rules (pure function, unit-testable)

| input | verdict |
|---|---|
| no data from either source | `unknown` |
| CrUX p75 LCP > 4000ms, or CLS > 0.25, or INP > 300 | `needs_attention` |
| PSI performance score < 0.5 | `needs_attention` |
| anything else with data | `healthy` |

Thresholds mirror `getWebVitalStatus` in
`src/app/(dashboard)/dashboard/dashboard_render/helper/main.tsx` and the
`getColor` thresholds there, so the card and the charts never disagree.

Thresholds mirror `getWebVitalStatus` in
`src/app/(dashboard)/dashboard/dashboard_render/helper/main.tsx` and the
`getColor` thresholds there, so the card and the charts never disagree.

---

## 4. Frontend

### 4.1 Dashboard content area card

New `OnboardingUpgradeCard` in `src/app/(dashboard)/dashboard/dashboard_render/`,
rendered by `helper/main.tsx` **above** the CrUX section. Visibility: `plan`
resolved and not paid, `orders.length >= 1`, `selectedSite` set, and the site's
onboarding status is neither `tour_complete` nor `dismissed`.

Content:

- Loading skeleton while `/api/onboarding/checks` runs (one POST per site per
  session, cached client-side with the existing `cachedData` helper under the
  `onboarding-checks:` prefix).
- Two result blocks: "Historical performance (CrUX)" and "Right now (PSI)"
  with p75 / score and the good-failing pills already used by the charts.
- Copy branch on verdict:
  - `needs_attention` → "Your visitors are waiting. Real-user monitoring shows
    exactly which pages lose them, and our experts fix them."
  - `healthy` → "Your Core Web Vitals pass. Fast sites rank and convert better,
    and AI answer engines cite the fastest sources. Let's protect that."
    (the SEO + GEO framing requested for the good case).
- CTAs: primary "Explore the managed service" → `POST /api/onboarding/opt-in`
  then `router.push('/dashboard/onboarding?site=...')`; secondary "Maybe later"
  → `POST /api/onboarding/dismiss`. The card never blocks the CrUX data below
  it and dismisses permanently.

### 4.2 Configuration tour (`/dashboard/onboarding`)

New route under the existing dashboard layout so it inherits the sidebar,
`SiteContext` (orders, selectedSite, plan) and the auth gate. Six steps, each a
row with state (done / active / locked) driven by `GET /api/onboarding/state`:

1. **Select the site.** Prefilled from `selectedSite`; switching re-binds the
   tour to that site's onboarding row.
2. **Prepare the HMAC signature and bind it to the plugin.** Button →
   `POST /api/wordpress/hmac`; shows the signature, its expiry, and the
   download link to the existing plugin page
   (`/dashboard/wordpress-plugin-analysis`, unchanged, which still bakes
   `SPEEDY_SITE_AUTH_KEY` from `wp-secret`).
3. **Install and activate the plugin.** Static WP-admin instructions plus a
   live status from `POST /api/wordpress/check-connection` (already returns
   `{ plugin, key }`), polled every ~8s while the step is active.
4. **Plugin emits the signature.** Verify button → `POST /api/wordpress/hmac/verify`
   (in a real WP install the plugin's REST call does this automatically; the
   button is the manual fallback and the demo path).
5. **RUM data collection script assigned.** Automatic once step 4 succeeds:
   `rum_assigned_at` is stamped and the step shows the collector URL
   (`https://rum.speedy.site/rum.js`) plus "starts collecting the moment your
   payment activates the entitlement".
6. **Complete with the one-time payment.** `POST /api/checkout`
   (`priceKey: "managed_wp"`, the existing Stripe one-time path). On return
   from Stripe the existing `required-data` → `/api/orders/managed/add` flow
   finishes the order; the tour shows the completion state once `plan` is
   `Managed WP`.

Progress persists per step via `POST /api/onboarding/tour/step`, so a reload
resumes. A paid user who lands here directly sees the tour as complete.

---

## 5. Fixes already applied in this change (code/doc disagreements)

`AGENTS.md` rule 3: docs and code disagree, so flag and fix before building.

1. **`src/app/api/orders/newOrder/route.ts` enforced `FREE_SITE_LIMIT = 1`**
   while `api/orders/site-limit`, the DB trigger `enforce_free_site_limit` and
   `user_services.metadata.max_sites` disagreed, so free users were blocked
   from adding their later sites and step 1 of this funnel broke. **Resolved
   2026-11-03** (before this plan landed): both routes and the triggers now
   enforce 10 free sites via migration
   `20261103000001_free_site_limit_10.sql` (see `docs/IMPACT-LOG.md`). Verified
   while writing this plan.
2. **`src/components/theme/addSite.tsx` showed the manual RUM `<script>`
   snippet** after adding a site, contradicting `docs/systems/rum-injector-plugin.md`
   ("remove legacy manual snippet", slice C) and `docs/GOALS.md` ("free tier is
   CrUX only"). **Fixed in this change:** the "Quick RUM Configuration" block is
   replaced by a "Connect your site, step by step" button into the tour.

---

## 6. Payment and entitlement ordering

The user's diagram puts payment **after** the plugin steps. The entitlement
model is unchanged: `managed_wp` active is what makes `api/wordpress/injection`
answer `inject: true` (docs/systems/rum-injector-plugin.md §3), and the
`event-buffer` edge rejects beacons for unentitled domains independently.

So step 5 ("assign the RUM script") binds and verifies the plugin; the
collector itself is delivered automatically by the injector once payment
activates the entitlement (the plugin caches its injection answer for 5
minutes, so live data starts within minutes of checkout). Nothing in the tour
promises collection before payment, and no free domain can receive `rum.js`.

---

## 7. Rollout

| Slice | Deliverables | Depends on |
|---|---|---|
| A | Migration + `site_onboarding` + HMAC columns | none |
| B | `/api/onboarding/*` + `/api/wordpress/hmac*` + verdict unit tests | A |
| C | `OnboardingUpgradeCard` in the dashboard content area | B |
| D | `/dashboard/onboarding` tour page | C |
| E | Removed the legacy manual RUM snippet from `addSite.tsx`, replaced by the tour link | none |
| F | `PSI_API_KEY` in `.env.example` + Vercel | none |

Each slice is independently shippable; C is the revenue-visible one.

---

## 8. Acceptance criteria

1. A free user can add up to 10 sites; the 11th is rejected by both the API and
   the DB trigger.
2. With >=1 site and no managed service, the dashboard shows the upgrade card
   with both check results and the correct verdict copy branch.
3. A healthy site's card mentions SEO and GEO advantages; a slow site's card
   leads with the performance loss.
4. Opt-in creates `opted_in` and lands on the tour with step 1 active.
5. Steps 2 to 5 complete in order; reloading the tour resumes at the right step.
6. Payment lands on the existing Stripe → required-data → order flow and the
   tour reports complete; the plugin injects `rum.js` within its 5-minute cache
   window and beacons reach the collector.
7. Free domains still get `{ inject: false }` at every point of the tour.

---

## Related docs

- `docs/GOALS.md`: product loop, one-plugin principle, $299 model.
- `docs/plans/2026-10-10_000000_restructure_plan.md`: Phase 1 plugin scope.
- `docs/systems/rum-injector-plugin.md`: injection + entitlement contract.
- `docs/systems/site-metadata-worker.md`: entitlement mirror and edge gate.

   `rum_assigned_at` is stamped and the step shows the collector URL
   (`https://rum.speedy.site/rum.js`) plus "starts collecting the moment your
   payment activates the entitlement".
6. **Complete with the one-time payment.** `POST /api/checkout`
   (`priceKey: "managed_wp"`, the existing Stripe one-time path) with
   `stripe_session_id` stored on the row. On return from Stripe the existing
   `required-data` → `/api/orders/managed/add` flow finishes the order; the
   tour marks `tour_complete` when the order exists.

Progress persists per step via `POST /api/onboarding/tour/step`, so a reload
resumes. A paid user who lands here directly sees the tour as complete.
