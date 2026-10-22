## Migration Phase 2: Cloudflare Workers (Week 1‑2)

### ✅ Done (code, in repo)

- **Delete `sub‑kv‑metadata` worker** – code removed; CF‑side retirement still pending
  * Removed from `wrangler.toml` / deployment config
  * `SUBSCRIPTION_METADATA` KV namespace binding removed
  * `cloudflare-workers/sub-kv-metadata/` deleted
  * Root `.gitignore` no longer blanket‑ignores `/cloudflare-workers`, so the
    replacement `cloudflare-workers/site-metadata/` and
    `cloudflare-workers/event-buffer/wrangler.toml` are actually tracked
  * Commented‑out backup block deleted from `rum/src/index.js`
  * Dead D1 `DB` binding + commented temp line removed from `event-buffer`

- **Refactor `event‑buffer` validation** – see `docs/DESIGN-site-metadata-worker.md`
  * `validateDomain()` no longer checks subscriptions
  * Entitlement read from KV `SITE_METADATA`, domain derived from Origin/Referer
  * New `site‑metadata` worker reads `user_services` through `services_with_domains`

### ✅ Deployed and verified on production (2026-10-22)

- Deployed `site‑metadata` (worker + `CRON_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` secrets were already prepared); one manual sync seeded KV `SITE_METADATA` with 9 keys, equal to the 9 active `managed_wp` services in the database
- Deleted the live `sub‑kv‑metadata` worker first: its code and source table were gone (see IMPACT-LOG 2026-10-22) and it was the only other writer of the shared KV namespace, so it had to go before anything was seeded. Its KV namespace (titled `subscription-data`, id `deb4358e164a44fe93dc81a4ef4033b1`) was **not** deleted: it is now the `SITE_METADATA` namespace both workers bind to
- Deployed `event‑buffer`; verified live: `/collect` returned 202 "Data buffered" for a seeded domain (jasper-lab.com), 403 "Domain not found" for an unknown domain, and the alarm flush landed a row in `rum_metrics`
- Deleted the stale `site‑metadata‑staging` / `event‑buffer‑staging` workers (dev leftovers from 2026-10-20): their `[env.staging]` config had nothing unique (same `SUPABASE_URL`, same KV id, same bindings), so staging can be re-created with `npx wrangler deploy --env staging`
- **Snapshot tags**: `migration-workers-subkv-deleted`, `migration-event-buffer-refactored` (both pushed to origin)

### Notes
* The worker cleanup is part of the de‑integration pattern – replace first, deploy, test, switch, verify, delete.
* No API route changes in this phase.