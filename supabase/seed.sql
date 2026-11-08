-- ============================================================================
-- STARTER SEED DATA FOR LOCAL DEVELOPMENT
-- Loads via: supabase db reset  (when db.seed is set in config.toml)
-- Or manually: psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
-- ============================================================================

-- Use deterministic UUIDs so IDs are stable across resets

\set ON_ERROR_STOP on

-- -----------------------------------------------------------------------------
-- 1. Test user (mirrors what auth.users would have after signup)
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'dev@example.com',
  crypt('devpassword123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Profile (auto-created by handle_new_user trigger, but explicit is fine)
-- -----------------------------------------------------------------------------
INSERT INTO public.profiles (id, email, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'dev@example.com', 'user')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- -----------------------------------------------------------------------------
-- 3. No free service: the free tier is gone, a site only exists behind an
--    active managed_wp entitlement (see migration 20261108000001).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 4. Sample paid order (managed_wp)
-- -----------------------------------------------------------------------------
INSERT INTO public.orders (
  order_id,
  user_id,
  website_name,
  website_address,
  order_date,
  order_status,
  product_type,
  favicon_file,
  report_email,
  rum_connection,
  usage_by_site,
  weekly_report
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'demo-site',
  'https://demo-site.example.com',
  now(),
  true,
  'managed_wp',
  null,
  'dev@example.com',
  false,
  0,
  false
) ON CONFLICT (order_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. Paid user_service linked to the order
-- -----------------------------------------------------------------------------
INSERT INTO public.user_services (
  id,
  user_id,
  order_id,
  website_name,
  service_type,
  status,
  metadata,
  purchased_at,
  expires_at
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'demo-site',
  'managed_wp',
  'active',
  '{"rum_pageview_limit": 50000, "scans_completed": 0, "plan_name": "Pro"}'::jsonb,
  now(),
  null
) ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. WP key for the demo site (used by plugin auth)
-- -----------------------------------------------------------------------------
INSERT INTO public.wp_key (domain, wp_secret)
VALUES ('demo-site.example.com', 'sk_test_' || encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (domain) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. Sample RUM metrics (so charts have data immediately)
-- -----------------------------------------------------------------------------
INSERT INTO public.rum_metrics (pageview_id, session_id, domain_name, current_page, previous_page, events, created_at)
VALUES
  ('pv-001', 'sess-abc', 'demo-site.example.com', '/', null, '[{"name":"CLS","value":0.05},{"name":"LCP","value":1200}]'::jsonb, now() - interval '1 hour'),
  ('pv-002', 'sess-abc', 'demo-site.example.com', '/about', '/', '[{"name":"CLS","value":0.02},{"name":"INP","value":85}]'::jsonb, now() - interval '50 minutes'),
  ('pv-003', 'sess-def', 'demo-site.example.com', '/', null, '[{"name":"LCP","value":1800},{"name":"TTFB","value":350}]'::jsonb, now() - interval '30 minutes'),
  ('pv-004', 'sess-ghi', 'demo-site.example.com', '/blog/post-1', '/blog', '[{"name":"LCP","value":2100},{"name":"CLS","value":0.1}]'::jsonb, now() - interval '10 minutes'),
  ('pv-005', 'sess-jkl', 'demo-site.example.com', '/pricing', '/', '[{"name":"INP","value":120},{"name":"LCP","value":950}]'::jsonb, now() - interval '5 minutes')
ON CONFLICT (pageview_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. Sample optimization tasks for the managed_wp service
-- -----------------------------------------------------------------------------
INSERT INTO public.optimization_tasks (user_service_id, title, description, category, status, impact_score, assigned_to)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'Enable Redis object cache', 'Install and configure Redis for persistent object caching', 'caching', 'planned', 8, 'expert@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'Optimize hero image', 'Convert hero image to WebP/AVIF and add proper sizing', 'images', 'planned', 7, null),
  ('44444444-4444-4444-4444-444444444444', 'Defer non-critical JS', 'Move analytics and chat widgets to load after FCP', 'third_party', 'in_progress', 6, 'expert@example.com')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. Sample admin user (for dashboard testing)
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('adminpassword123', gen_salt('bf')),
  now(),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, role)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@example.com', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- -----------------------------------------------------------------------------
-- 10. Sample expert in the pool (for assignment testing)
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'authenticated',
  'authenticated',
  'expert@example.com',
  crypt('expertpassword123', gen_salt('bf')),
  now(),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, role)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'expert@example.com', 'expert')
ON CONFLICT (id) DO UPDATE SET role = 'expert';

INSERT INTO public.experts_pool (expert_id, capacity, is_available, rr_position)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 10, true, 0)
ON CONFLICT (expert_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 11. Cloudflare auth placeholder (for KV tracking view)
-- -----------------------------------------------------------------------------
INSERT INTO public.cloudflare_auth (site_id, token, status, user_id)
VALUES ('33333333-3333-3333-3333-333333333333', 'cf_test_token_' || encode(gen_random_bytes(16), 'hex'), 'active', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (site_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Done
-- -----------------------------------------------------------------------------
\echo 'Seed data loaded successfully'
\echo 'Test accounts:'
\echo '  dev@example.com / devpassword123  (regular user with free + managed_wp site)'
\echo '  admin@example.com / adminpassword123  (admin)'
\echo '  expert@example.com / expertpassword123  (expert in pool)'