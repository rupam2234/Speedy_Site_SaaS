# DESIGN: site-metadata worker (RUM entitlement KV)

> Phase 2 of the migration tracker, updated for the plugin-install model.
> Read with `docs/GOALS.md` and `docs/plans/2026-10-10_000000_restructure_plan.md`.

## Problem

`event-buffer.validateDomain()` gates RUM event ingestion through the
`SUBSCRIPTION_METADATA` KV, which `sub-kv-metadata` fed from the dropped
`subscriptions` table. New domains never enter that KV, so ingestion returns
403 for every new customer: the plugin installs the script, but no events are
collected.

The plugin is now the script installer (`rum-injector` in the restructure
plan): it injects `https://rum.speedy.site/rum.js?id={orderPrefix}` directly.
Workers are ingestion and analytics only. So Phase 2 is about **entitlement at
the ingestion edge**, not script serving.

## Entitlement rules

RUM is a paid feature. Free tier is CrUX only (product decision, 2026-10-11).

A domain is RUM-entitled when at least one service satisfies all of:

- `service_type` in the paid set (default: `managed_wp` only)
- `status` = `active`
- `expires_at` is null or in the future

A domain stops being entitled the moment any condition fails. Two independent
enforcement points make the 1-year expiry airtight:

- the hourly cron removes the key from KV
- the edge ALSO checks `expiresAt` on every request, so a site that crosses its
  1-year mark is rejected immediately, even between cron runs

## Protection layers (what the KV guards)

This KV is the protection layer that stops the workers from collecting data for
sites that never paid or no longer pay. Three layers, each independent:

1. **Installation**: the plugin only installs the script on connected sites
2. **Entitlement mirror**: `site-metadata` writes a domain into KV only while a
   paid service covers it; expiry removes it within the hour
3. **Ingestion gate**: `event-buffer` rejects any event whose domain is missing
   from KV or whose `expiresAt` has passed (403, fail closed)

Layer 3 is the real one. The script tag is public: anyone can copy
`<script src="https://rum.speedy.site/rum.js?id=X">` from a customer's HTML,
so the `id` parameter is NOT an authorization signal. The edge must derive the
domain from the request itself (Origin/Referer host, which a browser cannot
spoof) and match it against KV. A payload-supplied domain is never trusted for
authorization.

## Renewal (later, optional)

Renewal is out of scope for Phase 2. The design is renewal-ready: extending a
plan is one UPDATE to `expires_at` (or a new `managed_wp` row); the next cron
sync re-enters the domain and the edge logic never changes. A renewal nudge
belongs in the Phase 5 billing UI (days-to-expiry display).

## New worker: `site-metadata`

Single responsibility: mirror RUM entitlements from Supabase into KV.

- **Schedule**: cron, hourly by default (see Open decisions)
- **Read**: one batched query, `user_services` where `status = 'active'`
  (service-role key, index on `status` exists)
- **Write**: KV `SITE_METADATA`, key `domain:{website_name}`, value
  `{ serviceId, status, expiresAt, pageviewLimit }`. Writes are
  compare-before-write (only changed keys, the pattern sub-kv-metadata already
  used), and the value holds only slow-changing fields, so daily KV writes stay
  in the low double digits on the free plan
- **Delete**: keys whose domain is no longer entitled (KV list + diff, batched)
- **Manual trigger**: authenticated POST with a `CRON_SECRET` for on-demand
  syncs and debugging
- **Config**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as wrangler
  secrets, never in `wrangler.jsonc` (one is currently committed in the repo;
  rotate it)

## event-buffer changes

- Binding `SITE_METADATA` replaces `SUBSCRIPTION_METADATA`
- `validateDomain()` reads the new shape: `status === 'active'` and
  `expiresAt` in the future
- the validated domain is derived from the request Origin/Referer at the edge;
  the collector's `id` query param and any payload-supplied domain are
  informational only, never authorization
- structured ingestion logs record schema version, accepted and rejected row
  counts, and Supabase latency without recording collector payloads
- Subscription-era fields (`period_starts_at`, `degradation_policy`,
  `current_usage`, `usage_limit`) are dropped; pageview limits return with the
  metering rebuild
- Fail policy stays fail-closed: unknown or expired domain means 403

## Sharding (random is right; right-size the count, add time-based flush)

The router picks one of N shards with `Math.random()`. For short-lived DO
requests like these (validate, append, maybe flush), random is the correct
policy: stateless, hot-site-proof, zero coordination. Least-connections would
need a shared load table (an extra DO hop per request) for near-zero gain, and
domain-keyed affinity bottlenecks a busy site onto one single-threaded DO while
buying nothing: the buffer is just a write-ahead log to Supabase.

Two changes worth making:

- shard count becomes configuration (`SHARD_COUNT`, default 4 for current
  scale) instead of a magic 20: fewer shards mean bigger flush batches, sooner
  adaptive thresholds, and less DO duration
- add a time-based flush with DO alarms: after appending, a shard with a
  non-empty buffer sets an alarm roughly 30s out; the alarm handler flushes
  whatever is buffered. This bounds data latency regardless of traffic, drains
  partial buffers that would otherwise sit for hours on quiet shards, and makes
  future shard-count changes safe

## Cleanup (same PR)

- [x] Delete `cloudflare-workers/sub-kv-metadata/` — done in the repo; the live
  worker and its KV namespace are still to be removed on Cloudflare
- [x] Remove `SUBSCRIPTION_METADATA` binding; the existing namespace is reused by
  `SITE_METADATA`, so the first sync deletes its stale keys (no new namespace
  needed)
- [x] Delete the commented-out backup block in `cloudflare-workers/rum/src/index.js`
  (AGENTS.md rule 1)
- [x] Remove dead code and the commented temp line in `event-buffer/src/index.js`
  (AGENTS.md rule 1); tighten CORS (echo origin without credentials)
- [x] Verify the `DB` (D1) binding in event-buffer is actually used; remove if
  dead — no `env.DB` reference in event-buffer and no `[[d1_databases]]` left in
  `wrangler.toml`, so it is already gone
- Move the committed service key to a wrangler secret, then rotate it in Supabase ✅ (2026-10-13: rotated in Supabase, synced to all 4 workers, RUM ingestion verified)
- Remove dead code and the commented temp line in `event-buffer/src/index.js`
  (AGENTS.md rule 1); tighten CORS (echo origin without credentials)
- Verify the `DB` (D1) binding in event-buffer is actually used; remove if dead

### Secrets to configure before deploying (user actions)

```
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # both workers, rotated key
npx wrangler secret put CRON_SECRET                 # site-metadata only
```

Rotate the key in Supabase first: it was committed in the old wrangler configs.
`SHARD_COUNT` ships as a wrangler var (4).

## Rollout order (no 403 gap)

1. [x] Apply the `rum_metrics` pageview-id migration to staging (done 2026-10-11)
2. Deploy `site-metadata`, run one sync, confirm KV contents
3. Deploy `event-buffer` reading `SITE_METADATA` (KV is already seeded)
4. Delete `sub-kv-metadata` and its namespace
5. Verify: plugin-installed script loads from `rum.speedy.site/rum.js`; events
   for an entitled domain return 200; an unknown domain returns 403

Steps 2-5 need Cloudflare access and are tracked in `docs/migration/README.md`
2.1/2.2. The prerequisite that used to block them was tracking, not code: the
root `.gitignore` ignored the whole `/cloudflare-workers` directory, so
`site-metadata/` and `event-buffer/wrangler.toml` existed on disk but could never
be committed or deployed from CI. That ignore is now scoped to `.wrangler/`,
`node_modules/` and `.dev.vars`.

## Scale audit: free plan budget (2026-10-11)

Hard caps on the CF free plan: Workers 100k requests/day, Durable Objects
100k requests/day, KV 100k reads/day and 1k writes/day. Supabase has no row
cap but 500MB DB on its free tier.

Cost of one pageview today: 1 Worker request + 1 DO shard request + up to 1
RealtimeHub DO request + 1 KV read. Practical ceiling: roughly 30 to 50k
pageviews/day across all sites before the request caps bite.

Findings and fixes folded into Phase 2:

1. **Ingestion gate trusts the payload**: `data.siteDomain` is client
   controlled, so a copied script tag plus curl can write into a victim's
   metrics. Fix: derive the domain from Origin/Referer at the edge (see
   Protection layers)
2. **Unbounded payloads**: the events array has no size cap; an oversized
   buffer breaks the 128KiB DO value limit and silently loses the whole shard
   buffer. Layered fix with zero data loss for real users:
   - the collector chunks beacons over ~48KB into multiple sends sharing the
     same sessionId. Today the browser silently drops oversized beacons: both
     `navigator.sendBeacon` and `fetch` with `keepalive` enforce a ~64KB
     client-side limit, so a huge pageview is already lost before the edge
     ever sees it. Chunking fixes that existing loss
   - the edge rejects bodies over 64KB (413): post-chunking, only malformed
     or abusive traffic can exceed it
   - a single normalized payload that cannot fit the DO buffer flushes
     directly instead of being buffered, so the 128KiB failure is impossible
   - strip unknown fields at the edge
   - every beacon carries a `pageview_id` (UUID, generated once per pageview);
     `rum_metrics` gets a partial-unique `pageview_id` and the flush switches
     to an upsert RPC that merges `events` on conflict. Continuation beacons
     merge into the same row, so analytics always sees exactly one row per
     pageview with zero query changes

### Storage change: one row per pageview (Phase 2 migration)

New migration on `rum_metrics`: nullable `pageview_id text`, partial unique
index, and an upsert RPC (security definer, execute granted to service_role
only):

```sql
insert into rum_metrics (pageview_id, session_id, domain_name, current_page,
                         previous_page, events, created_at)
values (...)
on conflict (pageview_id) where pageview_id is not null do update
  set events = rum_metrics.events || excluded.events
```

Existing rows keep `pageview_id` null and are untouched. This replaces the
plain `POST /rest/v1/rum_metrics` insert in `flushToSupabase`.

### Storage change: compact canonical facts (Phase 1 migration)

The compact telemetry migration adds nullable canonical columns for geography,
device, network, navigation, Core Web Vitals, resource totals, and error
counts. It also adds `schema_version`, normalized `referrer_domain`, and a
`diagnostic_evidence` JSONB object constrained to 4 KiB. Legacy `events`
remain readable and append across continuations.

The `upsert_rum_metrics_batch(jsonb)` RPC merges by the existing partial unique
`pageview_id` index. It retains the first non-null first-party context, allows
later non-null metric observations to supersede earlier values, appends legacy
events, and shallow-merges diagnostic evidence by top-level section. A null
canonical value means the fact was not observed or is unavailable, not zero.
The RPC applies each payload in a batch as a separate statement, so retries or
continuations that share a `pageview_id` cannot trigger PostgreSQL's
"ON CONFLICT DO UPDATE command cannot affect row a second time" error. The
internal single-payload helper and public wrapper are both restricted to
`service_role`. The migration and a follow-up grant hardening migration were
applied to the linked live database on 2026-11-23. The public-key probe was
denied with HTTP 401; service-role execution passed. The duplicate-safe RPC
migration was applied and verified in production on 2026-11-24.

### Collector and Worker canonicalization (Phase 2)

The browser collector now emits `schema_version: 2` from a stable `pageview_id`.
Shared pure modules under `src/lib/rum/` normalize page paths, external referrer
hostnames, capability-based device class, coarse browser and OS families,
navigation timings, Web Vitals, resource totals, and bounded diagnostic evidence.
Raw user agents, hardware concurrency, URL credentials, fragments, unsafe query
values, and complete error stacks never cross the Worker boundary.

The event-buffer Worker accepts version 1 and version 2 during rollout. It
derives `domain_name` from the authenticated Origin or Referer, checks actual
request bytes against the 64 KiB limit, rejects unknown versions and malformed
typed values, and normalizes version 2 before persistence. Cloudflare's raw
organization string is discarded and replaced only by a known coarse provider
label.

Version 2 writes typed canonical columns and bounded `diagnostic_evidence`. The
Worker also creates a compact legacy `events` projection so current dashboards
continue to work. A continuation beacon contains only newly observed INP facts
and evidence; the existing RPC merges it into the same pageview row.

### Focused reader cutover and retirement flow

ADR-0005 limits the retained customer product surfaces to Web Vitals, Page
Groups, Images, and Fonts. Retained aggregate and filter readers will use typed
canonical columns. Retained element and asset readers will use bounded
`diagnostic_evidence`. LCP evidence must preserve image and font diagnostics,
and CLS evidence must preserve movement and bounded involved-element context.

The legacy `events` projection is a temporary compatibility output, not a
permanent second source of truth. Trace, generic Analytics, Global UX, and
Cloudflare Enhancements may be removed only after retained readers pass legacy
versus canonical parity checks. New version 2 rows will stop receiving the
projection after that gate. Historical `events` values remain unchanged until a
separate destructive migration is approved and tested.

3. **Realtime broadcast cost**: at low traffic every collect triggers a Hub DO
   request even with zero dashboard viewers. Fix: per-shard broadcast cap
   (max 1 per second) and skip when the hub has no viewers
4. **KV write budget**: covered via compare-before-write and slow-changing
   values only
5. **Growth path**: the 5-dollar Workers plan removes the 100k/day caps; add a
   Supabase retention job for raw `rum_metrics` rows (keep aggregates) before
   the 500MB free DB fills

## Open decisions (defaults proposed, confirm before implementation)

1. **Cron cadence**: hourly (default) so expired sites stop collecting within
   the hour; daily is cheaper but slower to revoke
2. **`rum_renewal` services**: excluded from RUM entitlement (default), since
   renewals are legacy subscription-era artifacts
3. **Domain identity**: KV keyed on `orders.website_name`, matching the
   plugin's `id={orderPrefix}` today. Switching to the `wp-secret` site key is
   more robust but changes the plugin contract; proposed as a later step
4. **Collector domain resolution**: confirm the collector reports the host that
   equals `website_name` (today the id is the order prefix; the edge uses the
   domain for validation)
5. **Data retention**: expired or non-entitled sites stop collection only
   (default); purging already-stored data is deferred to a later slice
