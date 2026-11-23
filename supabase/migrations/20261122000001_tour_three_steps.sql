-- Collapse orders.tour to the three setup steps that mirror the onboarding
-- progress bar: site_selected -> plugin_verified -> service_active.
--
-- Legacy keys (signature_bound, plugin_installed, signature_verified,
-- rum_assigned) fold into plugin_verified; payment (order_status) becomes
-- service_active. setup_step is re-clamped to the 3-step scale (1..3).

UPDATE public.orders
SET
  tour = jsonb_build_object(
    'site_selected', true,
    'plugin_verified', COALESCE((tour ->> 'signature_verified') = 'true', false),
    'service_active', order_status = true
  ),
  setup_step = CASE
    WHEN order_status = true THEN 3
    WHEN (tour ->> 'signature_verified') = 'true' THEN 2
    ELSE 1
  END;
