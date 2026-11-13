## Migration Phase 5: UI & Billing

### ✅ Completed Tasks
1. **Delete legacy subscription UI**
   - Removed `/account/subscription` page and legacy subscription management views.
   - Removed cancellation, downgrade, and recurring payment method UI components.
2. **Implement service-based plan validation**
   - Implemented `validatePlan()` (`src/components/utils/planValidation/activePlan.ts`) reading directly from `user_services` via browser client and Supabase RLS.
   - Dashboard layout dynamically resolves plan tier ("Managed WP" vs "Free") without hopping through legacy `/api/subscriptions/plan`.

### ⬜ Pending Tasks
1. **Full billing page rewrite**
   - Build replacement billing page under `/dashboard/billing` or `/account/billing` showcasing active one-time services and licenses.
   - Display days-to-expiry and renewal action for Managed WP sites (annual service renewal).
   - Display invoice history linked to Stripe payment receipts.
2. **Feature flag deprecation**
   - Remove `NEXT_PUBLIC_NEW_CHECKOUT` flag once new billing and checkout interfaces are fully hardened in production.

### Notes
* All plan entitlements are derived from `user_services.service_type` (`free` or `managed_wp`).
* Direct RLS reads from `user_services` eliminate cold API hops during dashboard shell load.
