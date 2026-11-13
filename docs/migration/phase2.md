## Migration Phase 2: Cloudflare Workers (Week 1‑2)

### 📋 Overview & Objectives
Retire legacy subscription-based KV synchronization workers. Replace `sub-kv-metadata` with `site-metadata`, update `event-buffer` domain validation to verify active entitlements via KV against `user_services`, and reuse the existing KV namespace without downtime.

---

### ✅ Completed Tasks & Execution Logs

1. **Retire `sub-kv-metadata` Worker**
   - Removed worker code from `cloudflare-workers/sub-kv-metadata/`.
   - Removed legacy `SUBSCRIPTION_METADATA` binding from `wrangler.toml`.
   - Scoped the root `.gitignore` to allow tracking `cloudflare-workers/site-metadata/` and `cloudflare-workers/event-buffer/wrangler.toml` (which had previously been blanket-ignored).
   - Removed dead D1 database bindings and commented-out legacy code blocks from `event-buffer`.

2. **KV Namespace Reuse & Seeding**
   - The original KV namespace titled `subscription-data` (id: `deb4358e164a44fe93dc81a4ef4033b1`) was preserved and rebound as `SITE_METADATA`.
   - The live `sub-kv-metadata` worker was deleted from Cloudflare before seeding to eliminate conflicting writers.
   - Deployed `site-metadata` worker with `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`.
   - Executed initial manual sync: successfully seeded KV `SITE_METADATA` with 9 keys corresponding to active `managed_wp` services in Supabase.

3. **Refactor & Deploy `event-buffer` Validation**
   - Rewrote `validateDomain()` logic to drop subscription checks and validate active entitlements directly from KV `SITE_METADATA`.
   - Derived ingest domain dynamically from HTTP `Origin` and `Referer` headers.
   - Cleaned up stale staging workers (`site-metadata-staging` and `event-buffer-staging`) deployed during testing.

4. **Production Verification (2026-10-22)**
   - Ingestion gate test passed end-to-end:
     - Seeded entitled domain (`jasper-lab.com`): `POST /collect` returned HTTP `202 Accepted` ("Data buffered").
     - Unknown / non-entitled domain: returned HTTP `403 Forbidden` ("Domain not found").
     - Background alarm flush verified: telemetry row successfully written to `rum_metrics` table.

---

### 🔍 Live Verification Commands

```bash
# 1. Test ingestion for an entitled site (returns 202)
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "Origin: https://jasper-lab.com" \
  -H "Content-Type: application/json" \
  -d '{"event":"pageview"}' \
  https://event-buffer.workers.dev/collect

# 2. Test ingestion for an unknown site (returns 403)
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "Origin: https://unknown-unregistered-site.com" \
  -H "Content-Type: application/json" \
  -d '{"event":"pageview"}' \
  https://event-buffer.workers.dev/collect
```

---

### 🏷️ Snapshot Tags
* `migration-workers-subkv-deleted`: Tagged after removing legacy sub-kv-metadata worker and reconciling git tracking.
* `migration-event-buffer-refactored`: Tagged following live production deployment and verification of the new ingestion gate.
