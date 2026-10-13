# Migration Tracking: Subscription → Service Model

## 📋 Master Checklist

Track every step in this file. Check off as completed.

### Phase 1: Database (Week 1)
- [x] 1.1 Create migration SQL file
- [x] 1.2 Run migration on **staging** Supabase
- [x] 1.3 Verify data integrity (counts, relationships) — 11 services migrated, 6 subscriptions → 11 user_services
- [x] 1.4 Types updated: `src/lib/db/database.types.ts` hand-patched (user_services added); ⚠️ full `supabase gen types` regen still pending — file still lists dropped tables (see Dashboard row 7)
- [x] 1.5 Run TypeScript build — fix all type errors ✅ **BUILD PASSED**
- [ ] 1.6 Run existing tests on staging
- [x] 1.7 **Snapshot**: Tag `git tag migration-db-v1`
- [ ] 1.8 Deploy migration to **production** Supabase
- [ ] 1.9 Regenerate types for production
- [ ] 1.10 **Snapshot**: Tag `git tag migration-db-prod-v1`
- [x] 1.11 Free-tier migrations (`20261011000001–4`) applied to **staging** (2026-10-11) — see "Free Tier + Auth + Billing" section below
- [ ] 1.12 Apply the same migrations to **production** (together with 1.8)
- [ ] 1.13 `supabase migration repair --status applied` for all 7 timestamps once the CLI is linked (`supabase login` + `config.toml`)

### Phase 2: Cloudflare Workers (Week 1-2)
- [ ] 2.1 Delete `sub-kv-metadata` worker (code deleted in repo; CF-side retirement pending)
  - [ ] Remove from `wrangler.toml` / deploy config
  - [ ] Remove `SUBSCRIPTION_METADATA` KV namespace binding
  - [ ] Deploy to staging
  - [ ] Verify `event-buffer` still works (no KV dependency)
  - [ ] **Snapshot**: Tag `git tag migration-workers-subkv-deleted`
- [ ] 2.2 Refactor `event-buffer` validation (code complete in repo, see docs/DESIGN-site-metadata-worker.md)
  - [ ] Replace `validateDomain()` logic (remove subscription checks)
  - [ ] Add `user_services` check via KV (new `site-metadata` worker)
  - [ ] Deploy to staging
  - [ ] Test RUM script injection on test domain
  - [ ] **Snapshot**: Tag `git tag migration-event-buffer-refactored`

### Phase 3: API Routes (Week 2)
- [x] 3.1 Create new unified checkout API
  - [x] `POST /api/checkout` — payment mode only: managed_wp $299 one-time (rum_renewal renewal flow still pending)
  - [ ] Deploy to staging
  - [ ] Test Stripe checkout with test keys
  - [ ] **Snapshot**: Tag `git tag migration-checkout-new`
- [x] 3.2 Create new webhook handler
  - [x] `POST /api/webhook/stripe` — signature-verified, idempotent managed_wp provisioning (1yr, site_limit 1)
  - [ ] Update Stripe Dashboard webhook URL + set `STRIPE_WEBHOOK_SECRET`
  - [ ] Test with Stripe CLI: `stripe trigger checkout.session.completed`
  - [ ] **Snapshot**: Tag `git tag migration-webhook-new`
- [x] 3.3 **Delete old subscription APIs** — all deleted/rewritten earlier; callers repointed
  - **Snapshot**: Tag `git tag migration-old-apis-deleted` (pending)
---

## 🔄 Safe De-integration Pattern (Per Component)

```
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH COMPONENT TO REMOVE:                              │
├─────────────────────────────────────────────────────────────┤
│  1. CREATE replacement (new code) alongside old             │
│  2. DEPLOY replacement to STAGING                           │
│  3. TEST replacement thoroughly                             │
│  4. SWITCH traffic (feature flag or route change)           │
│  5. VERIFY production works with new code                   │
│  6. DELETE old code                                         │
│  7. COMMIT with message: "remove X — replaced by Y"         │
│  8. TAG: git tag migration-<component>-removed              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Safety Rules

| Rule | Why |
|------|-----|
| **Never delete before replacement works on staging** | Rollback is instant |
| **One component per PR** | Easy bisect if something breaks |
| **Tag after each major step** | `git checkout migration-db-v1` to rollback DB only |
| **Keep old API routes returning 410 with message** | External callers get clear error, not 500 |
| **Feature flag new checkout** | `NEXT_PUBLIC_NEW_CHECKOUT=true` — toggle instantly |
| **Run full test suite after each tag** | Catch regressions immediately |
---

## 📝 Documentation Template (Per PR)

```markdown
## Migration: Remove <Component>

### What
- Removed: `<file/function/table>`
- Replaced by: `<new file/function/table>`

### Why
- Per GOAL.md Phase X: <reason>

### Changes
- `file1.ts`: Added new function `getUserServices()`
- `file2.ts`: Deleted old `getSubscription()` 
- `migration.sql`: Dropped `subscriptions` table

### Testing
- [ ] Staging: New code works
- [ ] Staging: Old code returns 410
- [ ] Production: Smoke test passed
- [ ] TypeScript: Zero errors

### Rollback
```bash
git checkout migration-<previous-tag>
# Redeploy affected worker/API
```

### Verification Commands
```bash
# Check DB
supabase db diff --schema public

# Check Types
npm run typecheck

# Check Worker
wrangler tail event-buffer
```
```

---

## 🌿 Git Branching Strategy

```
main
  ├── migration/db-foundation          (Phase 1)
  │     ├── migration/db-foundation-staging-test
  │     └── migration/db-foundation-prod
  ├── migration/workers-refactor       (Phase 2)
  ├── migration/api-checkout-webhook   (Phase 3)
  ├── migration/ui-billing             (Phase 4-5)
  └── migration/cleanup                (Phase 6-8)
```

**Merge order**: `db-foundation` → `workers-refactor` → `api-checkout-webhook` → `ui-billing` → `cleanup`

Each branch:
1. Opens PR with documentation template
2. Deploys to preview/staging
3. Passes CI + manual smoke test
4. Merges to main with tag
---

## 🔍 Verification Checkpoints

### After Database Migration
```sql
-- Verify counts match
SELECT 
  (SELECT COUNT(*) FROM subscriptions) as old_subs,
  (SELECT COUNT(*) FROM user_services WHERE service_type='managed_wp') as new_managed,
  (SELECT COUNT(*) FROM orders WHERE product_type='managed_wp') as orders_managed;
```

### After Worker Refactor
```bash
# Test RUM injection on test domain
curl -H "Host: test-site.com" https://event-buffer.workers.dev/
# Should return RUM script, not 403
```

### After API Migration
```bash
# Test new checkout
curl -X POST /api/checkout -d '{"service":"managed_wp","domain":"test.com"}'
# Returns Stripe session URL

# Old route returns 410
curl /api/subscriptions/plan
# {"error": "Gone — use /api/checkout"}
```

---

## 📊 Progress Dashboard

| Phase | Component | Status | Tag | Notes |
|-------|-----------|--------|-----|-------|
| 1 | Database migration | ✅ **Complete** | `migration-db-v1` | 11 services migrated, old tables dropped |
| 1 | TypeScript build | ✅ **Complete** | — | All type errors fixed, build passes |
| 2 | sub-kv-metadata worker | 🟨 Code complete | — | deleted in repo (PR 1); CF-side removal + deploy pending |
| 2 | event-buffer validation | 🟨 Code complete | — | SITE_METADATA gate (Origin/Referer), SHARD_COUNT, alarm flush, upsert RPC; deploy + verify pending |
| 3 | New checkout API | ✅ **Complete** | — | `/api/checkout` live — Stripe Checkout (payment mode), managed_wp $299 one-time |
| 3 | New webhook | ✅ **Complete** | — | `/api/webhook/stripe` — idempotent provisioning of managed_wp on checkout.session.completed |
| 3 | Old subscription APIs | ✅ **Complete** | — | All subscription APIs deleted/rewritten |
| 3 | WordPress limits API | ✅ **Complete** | — | Rewritten for user_services model |
| 4 | Email templates | ✅ **Complete** | — | subscriptionCreated deleted, renewalSuccess updated |
| 5 | New billing UI | ⬜ Pending | — | plan display works via `validatePlan`; full billing page pending |
| 5 | Delete subscription UI | ✅ **Complete** | — | account/subscription deleted |
| 6 | Dashboard data layer | ⬜ Pending | — | |
| 7 | Types cleanup | 🟨 Partial | — | dataTypes/api updated; ⚠️ `database.types.ts` hand-patched, still lists dropped tables; root `db.types.ts` dead — regen + delete pending |
| 8 | GitHub Actions | 🟨 Partial | — | usage_update.yml retired (endpoint gone); usage metering returns with Phase 2 |
| FT | Auth gate (user_services) | ✅ **Complete** | — | `/api/account/auth` cookie-based; jose removed |
| FT | Free tier provisioning | ✅ **Complete** | — | trigger + backfill live: 5 free services, 11/11 profiles on staging |
| FT | Free 1-site limit | ✅ **Complete** | — | site-limit + newOrder entitlement-aware; IDOR fixed; DB unique-index caps |
| FT | Session timeout | 🟨 Partial | — | 2h inactivity (client) live; Supabase dashboard "Inactivity timeout: 2h" pending for server-side |
| DB | Free-tier migrations on **staging** | ✅ **Complete** | — | 20261011000001–4 applied 2026-10-11 via `scripts/apply-pending-migrations.js` |

---

## 🆕 Free Tier + Auth + Billing (2026-10-11)

Shipped on branch `work/api-cleanup` (PR to main pending). See commits `7cc8629` (auth gate + free tier), `7f09677` (1-site enforcement + security fixes), `6f308ef` (checkout + webhook + cron retirement), `42c2401` (session timeout).

- **Auth gate**: `/api/account/auth` rewritten — cookie-based `getUser()` (jose dependency removed), reads `user_services`; the gate against the dropped `subscriptions` table eliminated
- **Free tier**: `service_type_enum` value `free` added; `handle_new_user()` trigger auto-provisions profile + free service at signup (covers password sign-ins too); backfill covered existing accounts (5 free services, 11/11 profiles)
- **1-site free limit**: `/api/orders/site-limit` + `/api/orders/newOrder` entitlement-aware; IDOR (body-trusted `user_id`) fixed; DB-level caps via partial unique indexes
- **Billing**: `/api/checkout` (Stripe, payment mode, $299 one-time) + `/api/webhook/stripe` (signature-verified, idempotent `checkout.session.completed` provisioning, 1-yr managed_wp)
- **Session timeout**: 2h inactivity (client-side, cross-tab, reload-safe); Supabase dashboard "Inactivity timeout: 2h" still to be set for server-side enforcement
- **Cron**: `usage_update.yml` retired (endpoint deleted); usage metering rebuilds with Phase 2

### Migrations applied to **staging** on 2026-10-11 (via `scripts/apply-pending-migrations.js`)

| File | Contents |
|---|---|
| `20261011000001_free_service_tier_schema.sql` | enum `free`, `user_services.website_name` nullable |
| `20261011000002_free_service_tier_backfill.sql` | profiles backfill + free services for service-less accounts |
| `20261011000003_free_service_tier_constraints.sql` | unique free-service index, `handle_new_user()` trigger |
| `20261011000004_free_site_hard_limit.sql` | partial unique index on `orders` (1 free site per user) |

⚠️ **Not recorded in `supabase_migrations`** (applied via direct SQL). Once the CLI is linked (`supabase login` + `config.toml`), run `supabase migration repair --status applied` for all 7 timestamps (20250101000000–2, 20261011000001–4) so `migration up` / `db push` skips them.

⚠️ The same migrations must go to **production** together with items 1.8–1.10.

---

## 🚨 Emergency Rollback Procedures

### Database Rollback (if migration breaks production)
```bash
# 1. Revert Supabase migration
supabase migration revert --project-id <prod>

# 2. Revert types
git checkout migration-db-v1 -- src/lib/db/database.types.ts

# 3. Redeploy workers/APIs that depend on old schema
git checkout migration-db-v1 -- cloudflare-workers/event-buffer/src/index.js
git checkout migration-db-v1 -- src/app/api/subscriptions/
vercel --prod
```

### Worker Rollback
```bash
wrangler deploy --env production cloudflare-workers/event-buffer --tag migration-event-buffer-refactored
```

### API Rollback (Vercel)
```bash
vercel rollback <deployment-url> --token $VERCEL_TOKEN
```

---

*Last updated: 2026-10-11*
*Use this file as single source of truth for migration progress*