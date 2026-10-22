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

### ⏳ Pending (Cloudflare + verification — needs `npx wrangler deploy` access)

- Deploy `site‑metadata`, run one sync, confirm KV contents
- Deploy `event‑buffer` reading `SITE_METADATA` (KV must be seeded first)
- Verify `event‑buffer` still works (no KV dependency)
- Test RUM script injection on test domain
- **Snapshot** – tag `migration-workers-subkv-deleted`
- Delete the live `sub‑kv‑metadata` worker and its KV namespace
- **Snapshot** – tag `migration-event-buffer-refactored`

### Notes
* The worker cleanup is part of the de‑integration pattern – replace first, deploy, test, switch, verify, delete.
* No API route changes in this phase.