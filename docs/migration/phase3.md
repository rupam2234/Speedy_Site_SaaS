## Migration Phase 3: API Routes (Week 2)

### ✅ Completed Tasks
1. **Create new unified checkout API** – `POST /api/checkout` (payment mode only: managed_wp $299 one‑time)
2. **Create new webhook handler** – `POST /api/webhook/stripe` (signature‑verified, idempotent provisioning – 1 yr, site_limit 1)
3. **Delete old subscription APIs** – all removed/rewritten earlier; callers repointed

### Pending Tasks
- Deploy new `checkout` API to staging
- Test Stripe checkout with test keys
- Snapshot `migration-checkout-new`
- Deploy new webhook to staging
- Update Stripe Dashboard webhook URL + set `STRIPE_WEBHOOK_SECRET`
- Test with Stripe CLI: `stripe trigger checkout.session.completed`
- Snapshot `migration-webhook-new`
- Snapshot `migration-old-apis-deleted` (pending)

### Notes
* The new APIs replace all legacy subscription endpoints.
* Ensure `NEXT_PUBLIC_NEW_CHECKOUT` feature flag is toggled for production.