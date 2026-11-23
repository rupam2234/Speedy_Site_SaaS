# DESIGN: analytics refactor (quota bleed fix)

> **Status:** Draft v1 · **Owner:** Speedy Site · **Last updated:** 2026-10-13
> **Scope:** Fix the free-tier quota bleed in the analytics pipeline
> (`analytics-cron`, `traffic-source-cron`, D1 mirror), then decide its
> long-term fate: keep refactored, or retire into the issue detection engine.
> Read with `docs/GOALS.md` and `docs/plans/2026-10-10_000000_restructure_plan.md`.

---

## Problem

Both analytics workers sit near the free-tier ceilings (~95%) while serving a
handful of dashboard users. The cause is architectural, not load: the pipeline
recomputes and re-reads the same rows many times per day, several endpoints are
public and let anyone trigger the whole pipeline per request, and the read path
bypasses every cache layer we own.

## Current architecture

```
Supabase (rum_metrics)
   │  hourly RPC: get_daily_web_metrics / traffic_source
   v
analytics-cron + traffic-source-cron  (workers.dev)
   │  N+1 upserts: SELECT 1 + UPDATE/INSERT per record
   v
D1 (web_metrics, traffic_source)
   ^  dashboard client components fetch workers.dev directly
   │
browser (src/app/(dashboard)/dashboard/rum/analytics/cf-apis/calls.ts)
```

Daily cost today, where N = rows per cron run (domains × device types):

- 24 cron runs × (1 Supabase RPC + 3N D1 queries)
- every dashboard view: 3 worker invocations + 3 D1 query sets
- every bot hit on a workers.dev URL: one full cron run (see finding 1)

## Audit findings (ranked by quota impact)

### 1. Unauthenticated cron triggers (critical, most likely cause)

- `analytics-cron/src/index.ts`: `/` and `/test` run the full cron job with
  **no auth check**
- `traffic-source-cron/src/index.ts`: `/run-job` runs the full cron job with
  **no auth check**; `API_SECRET` only guards `/get-source`
- workers.dev URLs are crawled by bots constantly; each hit burns
  1 Supabase RPC + 3N D1 queries

### 2. N+1 D1 writes in both crons

Per record: `SELECT 1` existence check, then `UPDATE` or `INSERT` as two more
round trips, in a loop, hourly. No `env.DB.batch()`, no
`INSERT ... ON CONFLICT DO UPDATE`. If the lookup keys are unindexed, each
`SELECT 1` is a table scan, and 24 runs/day multiply it.

### 3. Cache-Control is decorative on workers.dev

Both read endpoints set `Cache-Control: public, max-age=3600`, but Cloudflare's
CDN does not cache `*.workers.dev` responses by default. Every dashboard poll
is a fresh invocation + D1 queries.

### 4. Dashboard client components hit workers.dev directly

`calls.ts` (client bundle) fetches `/metrics`, `/country-breakdown`, and
`/get-source` straight from the browser. No Next.js server route, no
`revalidate`, no consolidation. Every dashboard view costs 3 worker requests.

### 5. Reads are public; secrets leak

- `/metrics` and `/country-breakdown`: no auth at all, `Access-Control-Allow-Origin: *`
- the `API_SECRET` for `/get-source` is passed from the client bundle, so it is
  public knowledge; the value itself (`secret_for_speedy_site`) is committed in
  `wrangler.jsonc`
- `SUPABASE_SERVICE_ROLE_KEY` is committed as a plain var in both analytics
  `wrangler.jsonc` files; rotation is already required per
  `docs/systems/site-metadata-worker.md`

### 6. Hourly full recompute

Both crons re-upsert all of today's rows every hour regardless of change, and
the Supabase RPCs re-scan `rum_metrics` (which grows unbounded) each run.

---

## Options

### A: Quick wins (stop the bleed, keep the architecture)

1. Delete the public trigger paths (`/`, `/test`, `/run-job`) or gate them
   behind a secret header
2. Require a secret header on `/metrics`, `/country-breakdown`, `/get-source`;
   stop passing the secret from the client bundle
3. Replace the N+1 loop with one `env.DB.batch()` of
   `INSERT ... ON CONFLICT DO UPDATE` statements (1 round trip, no existence
   checks)
4. Verify indexes exist on the lookup keys
   (`date_collected, domain_name, device_type` /
   `day, domain, device_type, referral_domain`)
5. Drop cron frequency to every 4 to 6 hours (the data is daily aggregates)

### B: Supabase-direct reads (recommended refactor)

Remove the D1 mirror and both workers from the read path entirely:

- `src/app/api/rum/analytics/**` routes query Supabase directly (service role,
  server-side) with `revalidate: 3600`
- dashboard components call our own API routes instead of workers.dev
- the crons lose their only remaining job (the D1 mirror) and are retired, or
  reduced to aggregate maintenance only

This removes: 24 hourly cron runs, 3N D1 writes/day, all dashboard worker
requests, and the public worker surface. Supabase read load is capped by
Next.js revalidate caching instead of by D1.

### C: Retire analytics into the issue detection engine

Per `docs/GOALS.md`, analytics only earns its cost if it feeds baked reasons
for the service channel. Strategic options already noted by the team:

- scrap generic analytics rollups; keep only what the issue engine consumes
- LLM traffic angle (data already exists: `web_metrics.llm_traffic`,
  `llm_traffic_percentage`, and AI referrers arrive naturally in
  `traffic_source.referral_domain`): detect "AI crawler impact" as an issue
  type with evidence and a suggested fix (cache warm, bot rules, robots.txt)

## Recommendation

Phase 1 (quick wins) immediately: the bleed is live regardless of the strategic
decision. Then decide between B and C. B is the safe refactor if the dashboard
analytics views stay; C is the endgame if the issue detection engine (Phase 3
of the restructure plan) replaces generic analytics views. B and C compose:
do B now, fold the views into C as the engine lands.

## Phased plan

### Phase 1: stop the bleed (do regardless of A/B/C)

- [x] Remove unauthenticated `/`, `/test`, `/run-job` triggers from both
      workers (code 2026-10-13: all endpoints behind `Authorization: Bearer
      API_SECRET`; public `/health` added; authenticated `/run-job` kept for
      debugging)
- [x] Gate all read endpoints behind a secret header; move the secret server
      side (code 2026-10-13: new proxy routes
      `src/app/api/rum/analytics/{overview,country-breakdown,traffic-source}`
      via shared `src/lib/analytics/workers.ts`; `calls.ts` repointed to our
      routes; the client-bundle secret and the dead buggy old
      traffic-source route removed)
- [x] Replace N+1 upsert loops with one keys-read + one `env.DB.batch()`
      (3N queries per run down to 2; explicit `ON CONFLICT` upsert deferred
      until the D1 unique constraints are verified)
- [x] Verify/add indexes on the lookup keys (2026-10-13: D1 had zero indexes,
      not even unique constraints, so every UPDATE was a full table scan;
      created `idx_web_metrics_key` and `idx_traffic_source_key` via
      `wrangler d1 execute`; unique-index upgrade deferred with the ON
      CONFLICT switch until duplicates are checked)
- [x] Rotate the committed `SUPABASE_SERVICE_ROLE_KEY` into a wrangler secret
      (2026-10-13: removed from both wrangler.jsonc, uploaded as secret to
      all 4 workers (analytics-cron, traffic-source-cron, event-buffer, site-metadata);
      Supabase-side rotation completed 2026-10-13; RUM ingestion verified end-to-end)
- [x] Reduce cron frequency to every 4 hours (`0 */4 * * *`, both wrangler.jsonc)
- [x] Deploy: both workers deployed 2026-10-13 (versions 3289aeda, fdc774f4);
      verified live: `/health` 200 public, no-auth reads 401, authed reads
      200, `/run-job` executes the batched pipeline successfully;
      `ANALYTICS_API_SECRET` set in Vercel (production, preview, development)
- [ ] Acceptance: worker request volume drops to cron-only + proxied reads;
      public triggers return 401/404; no client-bundle secrets
      (partially verified 2026-10-13: production deployed with the new proxy
      routes; live smoke test passed, all three routes return 200 through the
      authenticated worker chain; 48h quota watch pending)

Deploy steps for the changed workers (user actions):

```
cd cloudflare-workers/analytics/analytics-cron
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # rotated key
npx wrangler secret put API_SECRET                  # same value as ANALYTICS_API_SECRET in Vercel
npx wrangler deploy

cd ../traffic-source-cron
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # rotated key
npx wrangler secret put API_SECRET                  # same value as above
npx wrangler deploy
```

Also set `ANALYTICS_API_SECRET` in Vercel (same value as the workers'
`API_SECRET`), and verify the D1 indexes once:

```
npx wrangler d1 execute speedy_site_rum --remote --command "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index'"
# If missing, create:
#   CREATE INDEX IF NOT EXISTS idx_web_metrics_key ON web_metrics (date_collected, domain_name, device_type);
#   CREATE INDEX IF NOT EXISTS idx_traffic_source_key ON traffic_source (day, domain, device_type, referral_domain);
```

### Phase 2: read path refactor (option B)

- [ ] Add Supabase-direct queries with `revalidate` to
      `src/app/api/rum/analytics/**` (overview, country breakdown, traffic
      source)
- [ ] Repoint dashboard components from `calls.ts` (workers.dev) to the API
      routes; delete `calls.ts`
- [ ] Retire both analytics workers and the D1 tables, or keep them solely for
      aggregate maintenance if the issue engine needs it
- [ ] Acceptance: zero worker invocations on dashboard views; Supabase reads
      capped by revalidate; quota usage back to single-digit percent

### Phase 3: LLM traffic as baked reasons (option C, aligns with restructure Phase 3)

- [ ] Issue type `ai_bot_impact`: evidence from `llm_traffic` +
      `traffic_source` AI referrers, suggested fix (cache, bot rules)
- [ ] surfaced through the issue detection engine, not a standalone dashboard

## Rollout order (no quota gap)

1. Phase 1 items 1-3 first (kills the public triggers and the N+1 loop)
2. Deploy both workers, watch usage for 48h
3. Phase 2 behind normal deploys; repoint views one component at a time
4. Retire D1 tables only after the issue engine decision (Phase 3 of
   restructure)

## Open decisions

1. Keep the D1 mirror at all, or go Supabase-direct immediately (B)?
2. Cron frequency after the fix: 4h vs 6h vs daily?
3. Does the issue detection engine need `web_metrics` rollups, or does it read
   `rum_metrics` directly?
4. LLM traffic: which crawler user-agents count (GPTBot, ClaudeBot,
   PerplexityBot, Google-Extended), and is detection RUM-side (referrer) or
   server-side (user-agent via backend tests)?
