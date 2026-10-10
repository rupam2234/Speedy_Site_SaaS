# Restructure Plan: Reshaping speedy.site

> **Status:** Draft v1 · **Owner:** Speedy Site · **Created:** 2026-10-10
> **Goal:** Refocus speedy.site as a WordPress performance optimization service
> powered by real user data and WordPress backend tests.
> Read `docs/GOALS.md` first; this plan implements it.

---

## 1. Where we are today

**Stack:** Next.js 15 (App Router) + Supabase (Postgres/Auth) + Cloudflare Workers + Stripe.

### 1.1 Assets we keep (strengths)

| Asset | Location | Role in the new focus |
|---|---|---|
| RUM collector script | `scripts/extended-rum.js` → `public/rum.js` | The data engine (installed by the plugin) |
| RUM ingestion & analytics workers | `cloudflare-workers/{rum,event-buffer,analytics}` | Ingestion & aggregation (keep) |
| RUM APIs | `src/app/api/rum/**` | Feed the issue detection engine |
| RUM dashboard | `src/app/(dashboard)/dashboard/rum/**` | Evidence UI for customers & experts |
| WordPress APIs | `src/app/api/wordpress/{check-connection,plugin-analysis,limits,wp-secret}` | Starting point of the backend test suite |
| Managed WP order flow | `src/app/api/orders/managed/**`, `/(dashboard)/dashboard/managed-wp` | The service channel (already sold) |
| Expert assignment design | `docs/DESIGN-managed-wp-order-assignment.md` | Round-robin expert queue (reuse for issue routing) |
| Ticket system | `src/app/api/tickets/**` | Customer ↔ expert communication (reuse) |
| Billing & plans | `src/app/api/subscriptions/**`, `src/app/account/**` | The $299 one-time path (`one_time_orders`) becomes the only offer |

### 1.2 Drift to correct (problems)

1. **Marketing says "Website Performance & UX Monitoring"**: a generic RUM platform,
   not a WordPress optimization service. *(Homepage refocused; Phase 0 done.)*
2. **Onboarding requires a manual `<script>` snippet**: fragile, unvalidated, and
   lives outside WordPress.
3. **RUM data ends at charts**: issues are not surfaced as diagnosed, fixable units.
4. **Backend tests are scattered**: plugin-analysis, limits, and connection checks
   exist but are not a coherent suite with pass/fail reasons.
5. **The service channel has no issue intake**: experts receive orders, not
   pre-diagnosed issues with baked reasons.
6. **Side tools dilute focus**: Speedy Pixel, generic analytics views, etc.

---

## 2. Target architecture: the product loop

```
WordPress plugin (new, single plugin)
  ├─ 1. Site validation    → site claim + health check against Speedy Site APIs
  ├─ 2. RUM auto-install   → injects rum.js site-wide, zero manual snippets
  ├─ 3. Backend test suite → scheduled WP probes (see §2.2)
  └─ 4. Telemetry relay    → reports WP-side facts to Speedy Site
        │
        v
Ingestion (existing Cloudflare workers + /api/rum/**)
        │
        v
Issue Detection Engine (new)
  RUM symptoms + backend test results → normalized issues with baked reasons
        │
        v
Service Channel (extends managed-wp + expert assignment design)
  issues arrive pre-diagnosed → expert queue → fix → verify with RUM delta
```

### 2.1 The WordPress plugin (new component)

New top-level `wp-plugin/` (own build; published to the WordPress.org plugin directory):

| Module | Responsibility |
|---|---|
| `activate` | Site claim: signs a challenge with the site secret (evolves `wp-secret` API), verifies ownership, registers the site |
| `validator` | Environment checks: WP version, PHP version, theme, hosting, plugin inventory, cache layers |
| `rum-injector` | Auto-injects the RUM script (`rum.speedy.site/rum.js`) with the site key, replacing manual snippets |
| `backend-tests` | Scheduled probes: cache efficiency, slow admin-ajax, autoloaded options size, plugin load impact, image delivery, origin TTFB |
| `relay` | Pushes test results + WP facts to Speedy Site ingestion |

### 2.2 Issue detection engine (new)

Turns raw RUM + backend results into **issues with baked reasons**:

```
Issue = {
  type: lcp_image | slow_ttfb | plugin_weight | cache_miss | layout_shift | …,
  evidence: { pages[], assets[], plugins[], device/network/geo breakdown },
  reason: "LCP hero image unoptimized on /product/* pages for 4G mobile users (2.8s)",
  suggested_fix: "Serve WebP/AVIF, preload hero, add fetchpriority=high",
  severity: p75 impact × traffic,
  confidence: 0..1
}
```

Where it runs: extend the `cloudflare-workers/analytics` cron (already scheduled) with
detection passes; store normalized issues in a new `issues` table.

### 2.3 Service channel with baked reasons

Reuses the existing managed-WP order + expert assignment design:

- An issue (or issue cluster) becomes a work item attached to the customer's order.
- The expert sees the baked reason, evidence links (RUM dashboard deep-links), and the
  suggested fix, instead of starting from a raw "site is slow" ticket.
- After the fix, RUM verifies the win (before/after metric delta): proof of service.

---

## 3. Keep / Rework / Remove

| Area | Decision | Notes |
|---|---|---|
| RUM collection + ingestion + APIs | **Keep** | Core evidence engine; move install into the plugin |
| RUM dashboard | **Keep, reframe** | Customer transparency view: performance + optimization impact over time; issues grouped for experts |
| Manual snippet onboarding | **Replace** | Plugin-driven activation |
| `/api/wordpress/*` | **Rework → backend test suite** | Unify into plugin validator + tests |
| Managed WP orders + assignment | **Extend** | Add issue intake with baked reasons (per design doc) |
| Ticket system | **Keep** | Attach issues to tickets |
| Billing / plans | **Simplify → $299 one-time only** | Keep `one_time_orders` + Stripe `mode: "payment"`; retire subscription plans, the monthly/yearly toggle, and subscription webhook branches after grandfathering existing subscribers |
| Speedy Pixel | **Demote** | Keep as a utility; remove from primary focus |
| Generic "UX monitoring" messaging | **Remove** | All messaging becomes WordPress optimization |
| `/wordpress-optimization` page | **Rework** | Becomes the flagship service page under the new loop |

---

## 4. Phased roadmap

### Phase 0: Refocus the message ✅ (this change)
- `AGENT.md` engineering rules
- `docs/GOALS.md` mission doc
- Homepage refocused: plugin-first story, real-user-data positioning
- Homepage pricing simplified to the single $299 one-time offer
- This restructure plan

### Phase 1: Plugin MVP (validate + RUM install)
- Scaffold `wp-plugin/` (PHP, minimal dependencies)
- Activation & validation handshake (evolve `wp-secret` → site claim + health check)
- RUM auto-injection replacing the manual snippet for new sites
- **Acceptance:** a WordPress site activates in under 5 minutes and shows live RUM
  data in the dashboard with no manual snippet.

### Phase 2: WordPress backend test suite
- Plugin-side probes (cache, autoload options, plugin weight, origin TTFB, media delivery)
- Ingestion endpoint + `wp_backend_tests` storage; pass/fail reasons
- Dashboard: validation & backend health panel
- **Acceptance:** every monitored site gets a scheduled backend report with
  pass/fail reasons.

### Phase 3: Issue detection engine (baked reasons)
- `issues` table + detection passes in the analytics cron
- RUM symptom ↔ backend cause correlation (e.g. slow TTFB ↔ cache miss)
- **Acceptance:** top issues per site are generated weekly with evidence and
  suggested fixes.

### Phase 4: One-price billing ($299 one-time, no subscriptions)
- Homepage & checkout show the single $299 one-time offer (no billing cycle toggle)
- Add an access window: `rum_access_until` = payment date + 12 months, driving
  RUM eligibility end to end (APIs + ingestion worker)
- Grandfather existing subscribers; retire the Starter/Basic subscription
  plans, the monthly/yearly toggle, and subscription webhook branches
- **Acceptance:** a new customer pays $299 once and gets a full year of RUM +
  the optimization service; no recurring billing anywhere in the funnel.

### Phase 5: Service channel integration
- Attach issues to managed-WP orders; expert queue views baked reasons
- Before/after RUM delta reporting (proof of fix)
- **Acceptance:** expert time-to-fix drops measurably vs. raw tickets.

### Phase 6: Cleanup & polish
- Remove dead "generic monitoring" copy/features; retire the manual snippet flow
- `/wordpress-optimization` flagship page rewrite; pricing aligned to outcomes
- Plugin published to the WordPress.org directory
- **Acceptance:** the whole funnel (site → plugin → data → issue → fix → verified win)
  runs end to end.

---

## 5. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Plugin review delays (WordPress.org) | Ship via direct .zip download first; directory submission in parallel |
| RUM injection conflicts (cache/optimizer plugins) | Server-side WP hook injection + health check + fallback snippet |
| Detection engine false positives | Confidence scoring + expert feedback loop on baked reasons |
| Expert queue starvation | Round-robin + SLA fallback already designed (see assignment doc) |
| Two pipelines (manual snippet vs plugin) during migration | Plugin-first for new sites; migrate existing sites in Phase 6 |

---

## 6. Decisions & open questions

**Decided (2026-10):** pricing is a **$299 one-time fee per site**: RUM and
the optimization service included for 1 year. No subscriptions, no auto-renewals.

Still open:

1. Site-key rotation policy between the plugin and RUM ingestion?
2. Should backend tests run on the plugin (PHP), via remote probes (worker), or both?
3. Separate repo for `wp-plugin/`, or keep it in this monorepo as a top-level path?
4. Refund policy for the one-time fee (e.g. 30-day guarantee)? And how exactly
   do we grandfather or migrate existing subscribers?


