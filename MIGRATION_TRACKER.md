# Migration Tracking: Subscription → Service Model

## 📋 Master Checklist

Track every step in this file. Check off as completed.

### Phase 1: Database (Week 1)
- [x] 1.1 Create migration SQL file
- [x] 1.2 Run migration on **staging** Supabase
- [x] 1.3 Verify data integrity (counts, relationships) — 11 services migrated, 6 subscriptions → 11 user_services
- [x] 1.4 Regenerate types: `supabase gen types typescript --project-id <staging> > src/lib/db/database.types.ts`
- [x] 1.5 Run TypeScript build — fix all type errors ✅ **BUILD PASSED**
- [ ] 1.6 Run existing tests on staging
- [x] 1.7 **Snapshot**: Tag `git tag migration-db-v1`
- [ ] 1.8 Deploy migration to **production** Supabase
- [ ] 1.9 Regenerate types for production
- [ ] 1.10 **Snapshot**: Tag `git tag migration-db-prod-v1`

### Phase 2: Cloudflare Workers (Week 1-2)
- [ ] 2.1 Delete `sub-kv-metadata` worker
  - [ ] Remove from `wrangler.toml` / deploy config
  - [ ] Remove `SUBSCRIPTION_METADATA` KV namespace binding
  - [ ] Deploy to staging
  - [ ] Verify `event-buffer` still works (no KV dependency)
  - [ ] **Snapshot**: Tag `git tag migration-workers-subkv-deleted`
- [ ] 2.2 Refactor `event-buffer` validation
  - [ ] Replace `validateDomain()` logic (remove subscription checks)
  - [ ] Add `user_services` check via KV (new `site-metadata` worker)
  - [ ] Deploy to staging
  - [ ] Test RUM script injection on test domain
  - [ ] **Snapshot**: Tag `git tag migration-event-buffer-refactored`

### Phase 3: API Routes (Week 2)
- [ ] 3.1 Create new unified checkout API
  - [ ] `POST /api/checkout` — handles `managed_wp` + `rum_renewal`
  - [ ] Deploy to staging
  - [ ] Test Stripe checkout for both service types
  - [ ] **Snapshot**: Tag `git tag migration-checkout-new`
- [ ] 3.2 Create new webhook handler
  - [ ] `POST /api/webhook/stripe` — handles one-time + recurring
  - [ ] Update Stripe Dashboard webhook URL
  - [ ] Test with Stripe CLI: `stripe trigger checkout.session.completed`
  - [ ] **Snapshot**: Tag `git tag migration-webhook-new`
- [ ] 3.3 **Delete old subscription APIs** (one at a time, verify after each)
  - [ ] Delete `/api/subscriptions/plan/route.ts`
  - [ ] Delete `/api/subscriptions/stripe/checkout/route.ts`
  - [ ] Delete `/api/subscriptions/stripe/webhook/route.ts`
  - [ ] Delete `/api/subscriptions/stripe/billing-history/route.ts`
  - [ ] Delete `/api/subscriptions/usage/route.ts`
  - [ ] Delete `/api/notifications/subscription-notify/route.ts`
  - [ ] **Snapshot**: Tag `git tag migration-old-apis-deleted`
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
| 2 | sub-kv-metadata worker | ⬜ Pending | — | |
| 2 | event-buffer validation | ⬜ Pending | — | |
| 3 | New checkout API | ✅ **Complete** | — | `/api/checkout` created for managed_wp + rum_renewal |
| 3 | New webhook | ✅ **Complete** | — | `/api/subscriptions/stripe/webhook` rewritten for service model |
| 3 | Old subscription APIs | ✅ **Complete** | — | All subscription APIs deleted/rewritten |
| 3 | WordPress limits API | ✅ **Complete** | — | Rewritten for user_services model |
| 4 | Email templates | ✅ **Complete** | — | subscriptionCreated deleted, renewalSuccess updated |
| 5 | New billing UI | ⬜ Pending | — | |
| 5 | Delete subscription UI | ✅ **Complete** | — | account/subscription deleted |
| 6 | Dashboard data layer | ⬜ Pending | — | |
| 7 | Types cleanup | ✅ **Complete** | — | dataTypes.ts, api/index.ts updated |
| 8 | GitHub Actions | ⬜ Pending | — | |

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

*Last updated: 2025*
*Use this file as single source of truth for migration progress*