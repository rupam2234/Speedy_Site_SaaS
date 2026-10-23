## Migration Phase 3: API Routes & Billing Overhaul (Week 2)

### 📋 Overview & Objectives
Retire recurring subscription API routes. Implement unified one-time checkout and idempotent Stripe webhook provisioning for Managed WordPress, modernize the session authentication gate, enforce service-level entitlements (including a 1-site free limit), and eliminate user IDOR vulnerabilities.

---

### ✅ Completed Tasks & Execution Logs

1. **Unified Checkout API (`POST /api/checkout`)**
   - Implemented Stripe Checkout in payment mode (one-time $299 charge for `managed_wp` service).
   - Embedded customer metadata and site domain directly in the checkout session.
   - Pending extension: `rum_renewal` renewal flow for existing services.

2. **Idempotent Stripe Webhook (`POST /api/webhook/stripe`)**
   - Configured signature verification via `STRIPE_WEBHOOK_SECRET`.
   - Idempotently provisions active `managed_wp` records in `user_services` (1-year license validity, default `site_limit = 1`) upon `checkout.session.completed`.
   - Triggers `newManagedOrder` transactional notification to customer.

3. **Retire Old Subscription APIs**
   - Deleted obsolete subscription routes under `/api/subscriptions/**`.
   - Rewrote `/api/wordpress/limits` to calculate entitlement quotas from `user_services`.
   - Ensured legacy external endpoints return clean HTTP `410 Gone` instead of `500 Internal Server Error`.

4. **Auth Gate Modernization (`/api/account/auth`)**
   - Rewritten to use cookie-based `getUser()` authentication via Supabase Auth helper.
   - Completely removed external `jose` JWT verification dependency.
   - Replaced old subscription database gating with active queries against `user_services`.

5. **Entitlement Enforcement & Security Hardening (Free Tier)**
   - Hardened `/api/orders/site-limit` and `/api/orders/newOrder` to derive `user_id` strictly from authenticated session cookies, resolving an IDOR vulnerability where request bodies passed arbitrary `user_id` values.
   - Added database-level unique index enforcement to guarantee only 1 free site order per user.

6. **Session Timeout Hardening**
   - Implemented cross-tab, reload-safe 2-hour client-side inactivity timer.
   - Supabase dashboard server-side inactivity timeout setting pending.

---

### 📦 Key Commits (Shipped on `work/api-cleanup`)
* `7cc8629`: Modernized auth gate, removed `jose`, introduced initial free-tier entitlement provisioning.
* `7f09677`: 1-site free tier limit enforcement, IDOR vulnerability fix in order routes.
* `6f308ef`: Unified one-time checkout API, idempotent Stripe webhook, and legacy cron retirement.
* `42c2401`: Client-side session timeout integration.

---

### 🔍 Verification & Curl Commands

```bash
# 1. Test checkout API (returns Stripe session URL)
curl -X POST https://app.speedy.site/api/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{"service":"managed_wp","domain":"example.com"}'

# 2. Test retired legacy subscription endpoint (returns 410 Gone)
curl -i https://app.speedy.site/api/subscriptions/plan
# HTTP/1.1 410 Gone

# 3. Simulate Stripe webhook locally via Stripe CLI
stripe listen --forward-to localhost:3000/api/webhook/stripe
stripe trigger checkout.session.completed
```

---

### 🏷️ Snapshot Tags
* `migration-checkout-new`: (Pending staging verification).
* `migration-webhook-new`: (Pending staging verification).
* `migration-old-apis-deleted`: (Pending final merge).
