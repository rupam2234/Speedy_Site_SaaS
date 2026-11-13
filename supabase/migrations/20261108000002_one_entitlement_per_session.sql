-- ============================================================================
-- One managed_wp entitlement per Stripe checkout session
--
-- Provisioning (Stripe webhook + /api/checkout/reconcile) is deliberately
-- callable more than once: Stripe retries deliveries, and a customer can return
-- from checkout repeatedly. The check-then-insert in application code is racy,
-- so this unique expression index is what actually guarantees a payment can
-- never grant two entitlements.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Repair existing duplicates first: keep the earliest active row per session.
-- (a reconcile race created several rows for one session)
-- ---------------------------------------------------------------------------
DELETE FROM public.user_services u
USING public.user_services keep
WHERE u.id <> keep.id
  AND u.metadata->>'stripe_session_id' IS NOT NULL
  AND u.metadata->>'stripe_session_id' = keep.metadata->>'stripe_session_id'
  AND u.service_type = keep.service_type
  AND u.status = keep.status
  AND u.purchased_at > keep.purchased_at;

-- Rows without a session id (legacy / backfilled) stay unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_services_stripe_session
    ON public.user_services ((metadata->>'stripe_session_id'))
    WHERE metadata->>'stripe_session_id' IS NOT NULL;
