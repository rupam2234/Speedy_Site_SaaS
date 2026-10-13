# IMPACT-LOG: Track Record of Major Changes

> **Purpose:** a short, interview-ready record of the most impactful
> engineering changes to speedy.site. Newest first.
> **Entry rules (AGENT.md rule 8):** only major, measurable changes (cost,
> security, performance, reliability, product); each entry states problem,
> changes, before/after impact, and where to verify; link details instead of
> duplicating them.
> **Last updated:** 2026-10-13

---

## 2026-10-13 · Analytics pipeline: ~95% free-tier quota bleed eliminated

**Problem:** both analytics workers sat near Cloudflare free-tier ceilings
(~95%) while serving a handful of dashboard users. Bots could trigger the
whole pipeline through unauthenticated endpoints; writes were N+1 against a
D1 database with zero indexes; reads bypassed every cache layer we own.

**Changes (details: `docs/DESIGN-analytics-refactor.md`):**
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

**Changes (details: `MIGRATION_TRACKER.md`):** database migrated to
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
