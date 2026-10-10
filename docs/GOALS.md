# Speedy Site: Product Goals

> Single source of truth for what we are building and why.
> **Read this before implementing anything** (see `AGENT.md`, rule 4).

---

## The refocus (October 2026)

Speedy Site began as a **WordPress performance optimization service**. Over time the
product drifted into a generic "website performance & UX monitoring" platform, and we
lost our focus. We are returning to our core:

> **Speedy Site is a WordPress performance optimization service that relies on
> real user data and WordPress backend tests.**

We are not a generic RUM tool. RUM is our *evidence engine*; the service (finding and
fixing WordPress performance issues) is the product.

## The product loop (memorize this)

```
Single WordPress plugin
        │
        v
Site validation (ownership, environment, compatibility)
        │
        v
RUM script auto-installed → real user data collection
(Core Web Vitals, UX, device / browser / network / geo, per-page, per-element)
        │
        v
Issue detection engine
(real user insights + creative WordPress backend tests)
        │
        v
Service channel: issues arrive with "baked reasons"
(pre-diagnosed: what, where, why, suggested fix)
        │
        v
Experts fix real issues faster → measurable Core Web Vitals / speed wins
```

## Principles

1. **Real user data beats synthetic tests.** Lab scores are hints; real visitor data
   is evidence. We fix what real users actually experience.
2. **One plugin, zero friction.** Validation, RUM installation, and data collection
   happen from a single WordPress plugin: no manual snippets, no guesswork.
   In customer-facing copy, frame it as "connect your site", never "install a plugin".
3. **Baked reasons over raw data.** Every issue that reaches our experts must arrive
   pre-diagnosed (asset, page, plugin, cause, suggested fix) so fixes are fast.
4. **WordPress backend tests complete the picture.** RUM shows symptoms on the
   frontend; backend probes (plugin weight, cache efficiency, slow queries, server
   config) find the WordPress-side causes.
5. **Performance is the product.** If a change does not make customer sites (or our
   own) faster, easier, or more reliable, it does not ship.
6. **Customers monitor; we analyze and fix.** The platform is not a self-serve
   AI analysis tool. Customers monitor site performance and follow every
   optimization with its measured impact, for full transparency.

## What this means for priorities

| Priority | Direction |
|---|---|
| 1 | WordPress plugin: validate → auto-install RUM → collect |
| 2 | Issue detection engine: RUM + backend tests → baked reasons |
| 3 | Service channel: expert queue powered by baked reasons |
| 4 | Dashboard: focused on WordPress performance, not generic UX analytics |

## Business model (decided)

**One price, one payment: $299 one-time per site. No subscriptions.**

- $299 covers a full year from purchase: plugin, site validation, unlimited
  real user data collection, issue diagnosis with baked reasons, expert
  optimization, and weekly reports.
- Renewal means paying $299 again for another year. Never automatic, never recurring.
- The existing `one_time_orders` flow (Stripe `mode: "payment"`) is the only
  billing path we keep. Subscription plans, prices, and webhook branches are
  deprecated; existing subscribers are grandfathered.

## Non-goals (for now)

- Being a general-purpose RUM platform for non-WordPress sites
- Competing with generic observability / monitoring tools
- Shipping more side tools that dilute the WordPress optimization focus
- Recurring subscription billing (replaced by the $299 one-time model)
- A self-serve "AI analysis" tool where customers diagnose issues themselves

## Related docs

- `docs/RESTRUCTURE-PLAN.md`: the phased plan reshaping speedy.site
- `docs/DESIGN-managed-wp-order-assignment.md`: expert assignment for managed WP orders
