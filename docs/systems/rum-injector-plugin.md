# DESIGN: WordPress plugin RUM auto-injector

> **Status:** Draft v1 · **Owner:** Speedy Site · **Last updated:** 2026-10-23
> **Scope:** Architecture and decisions for the `rum-injector` module of the
> Speedy Site WordPress plugin. No implementation code. Read with
> `docs/GOALS.md`, `docs/plans/2026-10-10_000000_restructure_plan.md` (Phase 1, §2.1) and
> `docs/systems/site-metadata-worker.md`.

---

## 1. Problem

The paid product promise (`docs/GOALS.md`) is: one $299 payment unlocks real user
monitoring (RUM) plus the expert optimization service. Today the collector and the
ingestion gate already exist and work, but nothing installs the collector on a
customer's WordPress site automatically.

What exists today:

- The collector `scripts/extended-rum.js` is built by `npm run build:extended-vitals`
  and served publicly, with no auth, at `rum.speedy.site/rum.js` by the `rum`
  worker (`cloudflare-workers/rum/src/index.js`). It derives the site domain from
  `location.hostname` and beacons to `buffer.speedy.site/collect`.
- Ingestion is entitlement-gated fail-closed: the `site-metadata` worker mirrors
  only active paid domains into the `SITE_METADATA` KV, and `event-buffer` rejects
  any Origin/Referer domain that is missing or expired (403). Verified 2026-10-22
  (`docs/IMPACT-LOG.md`, `docs/systems/site-metadata-worker.md`).
- A companion-plugin blueprint ships from the dashboard
  (`src/app/(dashboard)/dashboard/wordpress-plugin-analysis/companionPlugin.tsx`):
  it bakes a per-domain secret as `SPEEDY_SITE_AUTH_KEY`, registers the
  `speedy-site/v1` REST namespace, and is zipped for manual upload.

The gaps:

1. There is no `wp-plugin/` package and no `rum-injector` module. Payment
   (`/api/webhook/stripe`) grants the entitlement and `/api/orders/managed/add`
   creates the order, but neither installs the collector.
2. RUM installation is still a manual paste-a-`<script>` step in the UI
   (`src/components/theme/addSite.tsx`, `.../dashboard/settings/integrations.tsx`).
   This contradicts the "one plugin, zero friction" and "free tier is CrUX only"
   decisions in `docs/GOALS.md`, and a pasted free-site snippet would only 403 at
   the edge.

Net effect: a paying customer gets no automatic real-user data, so the issue
detection engine and the expert service have no input. This is the product's
Priority 1 loop (`docs/GOALS.md`, "What this means for priorities").

---

## 2. Goals and non-goals

Goals:

- Paid sites get the collector installed automatically, with no manual snippet,
  and only while the entitlement is active.
- Free and non-entitled domains stay CrUX-only: the injector is a no-op for them.
- Entitlement is reflected by our API (source of truth) and independently enforced
  at the ingestion edge. The injector is UX, not the security boundary.
- The decision is stateless and pull-based, matching how `check-connection` already
  probes a customer site.

Non-goals (out of scope here):

- The issue detection engine and backend test probes (RESTRUCTURE Phase 2 and 3).
- Renewal UI, billing, and the `rum_renewal` path.
- Publishing to the WordPress.org directory (RESTRUCTURE Phase 6).
- Serving the script from the plugin, or any change to how the collector works.

---

## 3. Entitlement model (who is entitled)

Unchanged and authoritative:

- Paid = a `user_services` row with `service_type = 'managed_wp'`,
  `status = 'active'`, and `expires_at` in the future or null.
- An entitled domain is one whose normalized host matches `user_services.website_name`
  on a `managed_wp` row. This is exactly the field the `site-metadata` worker reads to
  build the `SITE_METADATA` KV gate, so the injector and the edge share one source of
  truth. The collector reports the same label (`location.hostname`).
- Free = CrUX only; the injector must not run.

This mirrors the entitlement mirror in `docs/systems/site-metadata-worker.md` and
reuses the same seat of data (`user_services`) that drives `activePlan.ts`,
`site-limit`, and `newOrder`.

### 3.1 Domain matching

`user_services.website_name` is written at order creation on both paid paths:
`newOrder` (paid branch, `website_name: insertedOrder.website_name`, mirroring the
free branch) and `managed/add` (`website_name: selectedSite`, alongside `order_id`).
It preserves `www` and subdomains (`extractRootDomain` keeps them). The plugin reports
the host it actually serves on (`home_url()` host). Both sides are normalized with the
same rule the ingestion gate uses (`normalizeDomain`: trim, lowercase, strip one leading
`www.`), so apex-vs-`www` never mismatches.

## 4. Target flow

```
Paid customer on WordPress, plugin active
        |
        v
Plugin rum-injector (server-side, transient-cached):
   POST /api/wordpress/injection  { domain, key }
        |
        v
Speedy API: verify key (wp_key) + paid entitlement (user_services.website_name)
        |
        +-- entitled  --> { inject: true,  scriptUrl }
        |                    plugin enqueues https://rum.speedy.site/rum.js
        v
   Collector runs -> beacon to buffer.speedy.site/collect
        |
        v
event-buffer: domain in SITE_METADATA and not expired ? 202 : 403  (fail closed)
        |
        +-- not entitled / expired / unknown key / API error
               --> { inject: false }  --> plugin no-op (CrUX only)
```

Note the layering: the plugin decides *whether to show* the collector; the edge
decides *whether to accept* the data. Both derive the same domain, and both fail
closed.

---

## 5. New API: `POST /api/wordpress/injection`

Single responsibility: answer "should this domain run the collector?".

Auth and inputs:

- `domain`: the host the plugin serves on (from `home_url()`).
- `key`: the per-domain secret (`SPEEDY_SITE_AUTH_KEY`, optionally stored in the WP
  option `speedy_site_secret_key` and mirrored in our `wp_key` table by
  `plugin-key`). Verified against the stored `wp_key.wp_secret` with a
  constant-time compare.

Server logic:

1. Verify the domain has a matching `wp_key` secret. Unknown key: treat as not
   entitled (as `check-connection` treats a 404 as "no plugin").
2. Check entitlement: a managed_wp `user_services` (active, `expires_at` future or
   null) whose normalized `website_name` matches the normalized request domain,
   mirroring `site-metadata`'s `buildDesiredMap`. v1 skips the Upstash cache (an
   in-memory per-domain limiter guards abuse); the indexed query is cheap enough.
3. Fail closed: any error, timeout, or missing data returns the not-entitled shape.

Response:

```json
{ "inject": true,  "scriptUrl": "https://rum.speedy.site/rum.js" }  // entitled: enqueue scriptUrl
{ "inject": false }                                                 // free / not-entitled / not-connected: no-op
```

Notes:

- Rate-limit per domain (reuse the existing rate limiter) to blunt abuse.
- The collector URL carries no secret and no `id`. Per
  `docs/systems/site-metadata-worker.md`, the `id` is not an authz signal, and
  `extended-rum.js` derives the domain from `location.hostname`, so `id` is not
  needed. Existing traffic continuity is preserved because events are keyed by
  `domain_name` from the host, not by `id`.
- Reads `user_services` (indexed by `status`, `user_id`); costs one small indexed
  query per cache window. No N+1.

---

## 6. Plugin side: the `rum-injector` module

Promote the current single-file blueprint
(`companionPlugin.tsx`) into a real `wp-plugin/` package (see Open decisions on repo
location) and add the injector as one small module.

Behavior:

- Hook `wp_enqueue_scripts`. Compute `home_url()` host.
- Decide once per TTL using a WP transient so the outbound call is not made on
  every page view; cache an entitled decision for 5 minutes and a negative
  decision for 30 seconds, so a payment completed after a pre-payment check
  becomes active promptly. Store `{ inject, checked_at }` per host.
- If entitled: enqueue `https://rum.speedy.site/rum.js` in the document header on
  every frontend page. The admin section is excluded.
- Expose `GET /wp-json/speedy-site/v1/status`. Its presence proves the plugin is
  active; it also returns the current RUM injection decision so the SaaS can
  update plugin and RUM status together.
- If not entitled, cache says no, or the call fails or times out (short timeout,
  ~0.5s): do nothing. The site stays CrUX-only.
- Free tier path is a genuine no-op; there is no snippet to leak.

Trade-off and fallback:

- Transient cache means a cache-miss does one short blocking call. This is bounded
  by the TTL and acceptable for now. If page-render latency on cache-miss proves
  unacceptable, the fallback is a tiny local loader stub that enqueues always and
  fetches the injection decision asynchronously, appending `rum.js` only when
  `inject:true`. Prefer the server-side decision for its simplicity; keep the stub
  as a documented option.

The module stays tiny and non-blocking, consistent with `AGENTS.md` rule 2 (the
collector and its install path must not add measurable page weight or blocking work).

---

## 7. Security model

- The collector script is public and unauthenticated (served by the `rum` worker).
  Do not put any secret in the page or the script URL.
- Ingestion is the real gate: `event-buffer` derives the domain from Origin/Referer
  and rejects non-entitled domains (403, fail closed). A copied script tag cannot
  write into another site's metrics because the payload domain is never trusted
  (`docs/systems/site-metadata-worker.md`, "Protection layers").
- The injection API is authenticated per domain by the existing secret so it cannot
  be used to enumerate or spam entitlement lookups. It fails closed. Its answer is
  a UX signal, not an authorization decision; a wrong "inject" still cannot produce
  data because the edge rejects it.

## 8. Failure modes and edge cases

| Case | Behavior |
|---|---|
| Plugin not installed | `check-connection` returns 404; dashboard prompts "connect your site" |
| Free domain | Injection API returns `inject:false`; no script; RUM page stays behind UpgradeFallback |
| Paid, first page after transient expiry | One short blocking call, then transient warm |
| Injection API down or slow | Plugin no-ops (no script); free of blocking beyond the short timeout |
| Entitlement expires (1 year) | Injection API flips to false; `site-metadata` cron also drops the KV key; edge 403s existing beacons. Two independent revokes |
| `orders.website_name` mismatch (apex vs `www`) | Root-domain compare prevents false negatives; see Open decisions |
| Existing subscribers (grandfathered) | Legacy subscription rows do not map to managed_wp; they are handled separately, not by this flow |

---

## 9. UI changes (retire the manual snippet)

This is the product-facing payoff and it also removes the free-tier inconsistency.

- `src/components/theme/addSite.tsx`: remove the post-add "Quick RUM
  Configuration" and the `<script src="…rum.js…id=…">` snippet. After connecting a
  site, show "Install the Speedy Site plugin to start collecting" instead.
- `src/app/(dashboard)/dashboard/settings/integrations.tsx`: replace the
  copy-this-snippet panel with a plugin connection status (install/enabled,
  collecting, entitlement) driven by `check-connection` and the injection state.
- Keep the companion-plugin download as the short-term distribution path until a
  real installable `wp-plugin/` ships (see Open decisions).
- RUM dashboard pages keep the `UpgradeFallback` gate for free plans
  (`.../dashboard/rum/layout.tsx`); no change needed there.

---

## 10. Acceptance criteria

1. Fresh WordPress install, plugin uploaded, secret set: `check-connection` reports
   the plugin present; a free domain gets `inject:false` and no script.
2. After a $299 payment and `/api/orders/managed/add` for that domain: the injection
   API returns `inject:true`, `rum.js` is enqueued on the site, beacons reach
   `buffer.speedy.site/collect` (202), and data appears in the RUM dashboard.
3. Expiring or revoking the managed_wp entitlement flips `inject:false` and the
   edge rejects beacons (403); no new data is stored.
4. No manual `<script>` snippet is offered anywhere in the product; free sites show
   CrUX only.
5. A cache-miss or API outage does not block page render beyond the short timeout
   and does not inject the script.

---

## 11. Phased rollout

| Slice | Deliverables | Depends on |
|---|---|---|
| A | `POST /api/wordpress/injection` (auth + entitlement, cache, rate-limit), unit tested | none |
| B | `wp-plugin/` package (promote `companionPlugin.tsx`) with `rum-injector`, transient cache | A |
| C | Remove legacy manual snippet in `addSite.tsx` and `integrations.tsx`; plugin-install prompts and collecting status | B |
| D (defer) | Publish to WordPress.org; backend test probes; issue engine | later phases |

Slices A and B are independently useful: A can ship and be exercised by the existing
companion plugin's `check-connection` before the injector lands.

---

## 12. Open decisions

1. Repo layout: top-level `wp-plugin/` in this monorepo, versus a standalone repo
   (`docs/plans/2026-10-10_000000_restructure_plan.md` §6). A monorepo path keeps install/auth contracts in
   one change; a standalone repo eases WordPress.org publishing.
2. Distribution: continue zip-download from the dashboard until Phase 6, or ship a
   real installable `.zip` now.
3. Domain identity: match on root (registered) domain to survive apex vs `www`, or
   exact host. `docs/systems/site-metadata-worker.md` also lists the order-prefix vs
   `wp-secret` site key as an open choice; this doc assumes exact host with a
   root-domain fallback.
4. Cache TTLs: injection-API cache (default 60s) and plugin transient (default 5
   min). Longer TTLs widen the expiry-revocation window, which the edge still closes
   independently.
5. Legacy self-serve RUM: do we backfill a plugin/injector for sites that only ever
   used the manual snippet, or leave them on the legacy script until expiry?

---

## Related docs

- `docs/GOALS.md`: product loop and the one-plugin, zero-friction principle.
- `docs/plans/2026-10-10_000000_restructure_plan.md`: Phase 1 plugin scope and §2.1 `rum-injector`.
- `docs/systems/site-metadata-worker.md`: entitlement mirror and the ingestion gate.
- `docs/systems/managed-wp-order-assignment.md`: expert assignment (unchanged here).
