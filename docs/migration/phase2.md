## Migration Phase 2: Cloudflare Workers (Week 1‑2)

### ✅ Pending Tasks
- **Delete `sub‑kv‑metadata` worker** – code already deleted in repo; CF‑side retirement pending
  * Remove from `wrangler.toml` / deployment config
  * Remove `SUBSCRIPTION_METADATA` KV namespace binding
  * Deploy to staging
  * Verify `event‑buffer` still works (no KV dependency)
  * **Snapshot** – tag `migration-workers-subkv-deleted`

- **Refactor `event‑buffer` validation** – code complete in repo; see `docs/DESIGN-site-metadata-worker.md`
  * Replace `validateDomain()` logic (remove subscription checks)
  * Add `user_services` check via KV (new `site‑metadata` worker)
  * Deploy to staging
  * Test RUM script injection on test domain
  * **Snapshot** – tag `migration-event-buffer-refactored`

### Notes
* The worker cleanup is part of the de‑integration pattern – replace first, deploy, test, switch, verify, delete.
* No API route changes in this phase.