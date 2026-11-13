-- ============================================================================
-- STARTER SEED DATA FOR LOCAL DEVELOPMENT
-- Loads via: supabase db reset / supabase start
-- Or manually: psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
-- ============================================================================

-- Use deterministic UUIDs so IDs are stable across resets

-- -----------------------------------------------------------------------------
-- 1. Test users (mirrors auth.users + auth.identities for GoTrue login)
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
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  recovery_token,
  phone_change,
  phone_change_token,
  reauthentication_token
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'dev@example.com',
    crypt('devpassword123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'customer2@example.com',
    crypt('customerpassword123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('adminpassword123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'authenticated',
    'authenticated',
    'expert@example.com',
    crypt('expertpassword123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02',
    'authenticated',
    'authenticated',
    'expert2@example.com',
    crypt('expertpassword123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    '', '', '', '', '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"dev@example.com"}'::jsonb,
    'email',
    '11111111-1111-1111-1111-111111111111',
    now(), now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"customer2@example.com"}'::jsonb,
    'email',
    '22222222-2222-2222-2222-222222222222',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"admin@example.com"}'::jsonb,
    'email',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    now(), now(), now()
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","email":"expert@example.com"}'::jsonb,
    'email',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    now(), now(), now()
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02',
    '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02","email":"expert2@example.com"}'::jsonb,
    'email',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02',
    now(), now(), now()
  )
ON CONFLICT (provider_id, provider) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Profiles with distinct roles (user, admin, expert)
-- -----------------------------------------------------------------------------
INSERT INTO public.profiles (id, email, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'dev@example.com', 'user'),
  ('22222222-2222-2222-2222-222222222222', 'customer2@example.com', 'user'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@example.com', 'admin'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'expert@example.com', 'expert'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02', 'expert2@example.com', 'expert')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;

-- -----------------------------------------------------------------------------
-- 3. Sample paid orders (managed_wp)
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
  weekly_report,
  setup_step,
  tour,
  setup_completed_at
) VALUES
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'demo-site.example.com',
    'https://demo-site.example.com',
    now() - interval '2 hours',
    true,
    'managed_wp',
    null,
    'dev@example.com',
    true,
    0,
    false,
    4,
    '{"signature_verified": true}'::jsonb,
    now() - interval '1 hour'
  ),
  (
    '33333333-3333-3333-3333-333333333334',
    '22222222-2222-2222-2222-222222222222',
    'queued-shop.example.com',
    'https://queued-shop.example.com',
    now() - interval '2 hours',
    true,
    'managed_wp',
    null,
    'customer2@example.com',
    false,
    0,
    false,
    2,
    '{}'::jsonb,
    null
  ),
  (
    '33333333-3333-3333-3333-333333333335',
    '22222222-2222-2222-2222-222222222222',
    'urgent-blog.example.com',
    'https://urgent-blog.example.com',
    now() - interval '15 hours',
    true,
    'managed_wp',
    null,
    'customer2@example.com',
    false,
    0,
    false,
    1,
    '{}'::jsonb,
    null
  )
ON CONFLICT (order_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Paid user_services linked to orders
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
) VALUES
  (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'demo-site.example.com',
    'managed_wp',
    'active',
    '{"rum_pageview_limit": 50000, "scans_completed": 0, "plan_name": "Pro"}'::jsonb,
    now(),
    null
  ),
  (
    '44444444-4444-4444-4444-444444444445',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333334',
    'queued-shop.example.com',
    'managed_wp',
    'active',
    '{"rum_pageview_limit": 50000, "scans_completed": 0, "plan_name": "Pro"}'::jsonb,
    now(),
    null
  ),
  (
    '44444444-4444-4444-4444-444444444446',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333335',
    'urgent-blog.example.com',
    'managed_wp',
    'active',
    '{"rum_pageview_limit": 50000, "scans_completed": 0, "plan_name": "Pro"}'::jsonb,
    now() - interval '15 hours',
    null
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. WP key for the demo site (used by plugin auth)
-- -----------------------------------------------------------------------------
INSERT INTO public.wp_key (domain, wp_secret)
VALUES ('demo-site.example.com', 'sk_test_' || encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (domain) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. Sample RUM metrics (so charts have data immediately)
-- -----------------------------------------------------------------------------
INSERT INTO public.rum_metrics (pageview_id, session_id, domain_name, current_page, previous_page, events, created_at)
VALUES
  ('pv-001', 'sess-abc', 'demo-site.example.com', '/', null, '[{"name":"CLS","value":0.05},{"name":"LCP","value":1200}]'::jsonb, now() - interval '1 hour'),
  ('pv-002', 'sess-abc', 'demo-site.example.com', '/about', '/', '[{"name":"CLS","value":0.02},{"name":"INP","value":85}]'::jsonb, now() - interval '50 minutes'),
  ('pv-003', 'sess-def', 'demo-site.example.com', '/', null, '[{"name":"LCP","value":1800},{"name":"TTFB","value":350}]'::jsonb, now() - interval '30 minutes'),
  ('pv-004', 'sess-ghi', 'demo-site.example.com', '/blog/post-1', '/blog', '[{"name":"LCP","value":2100},{"name":"CLS","value":0.1}]'::jsonb, now() - interval '10 minutes'),
  ('pv-005', 'sess-jkl', 'demo-site.example.com', '/pricing', '/', '[{"name":"INP","value":120},{"name":"LCP","value":950}]'::jsonb, now() - interval '5 minutes')
ON CONFLICT (pageview_id) WHERE pageview_id IS NOT NULL DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. Sample optimization tasks for the managed_wp service
-- -----------------------------------------------------------------------------
INSERT INTO public.optimization_tasks (user_service_id, title, description, category, status, impact_score, assigned_to)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'Enable Redis object cache', 'Install and configure Redis for persistent object caching', 'caching', 'planned', 8, 'expert@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'Optimize hero image', 'Convert hero image to WebP/AVIF and add proper sizing', 'images', 'planned', 7, null),
  ('44444444-4444-4444-4444-444444444444', 'Defer non-critical JS', 'Move analytics and chat widgets to load after FCP', 'third_party', 'in_progress', 6, 'expert@example.com')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. Experts pool & initial active assignment
-- -----------------------------------------------------------------------------
INSERT INTO public.experts_pool (expert_id, capacity, is_available, rr_position, last_assigned_at)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 10, true, 1, now() - interval '2 hours'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02', 5, true, 0, null)
ON CONFLICT (expert_id) DO NOTHING;

INSERT INTO public.order_assignments (id, order_id, expert_id, status, assigned_at, assigned_by, is_active)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333333',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'in_progress',
  now() - interval '2 hours',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
) ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. Cloudflare auth placeholder (for KV tracking view)
-- -----------------------------------------------------------------------------
INSERT INTO public.cloudflare_auth (site_id, token, status, user_id)
VALUES ('33333333-3333-3333-3333-333333333333', 'cf_test_token_' || encode(gen_random_bytes(16), 'hex'), 'active', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (site_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. Sample notifications
-- -----------------------------------------------------------------------------
INSERT INTO public.notifications (id, user_id, type, message, link, read)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'assignment',
  'You have been assigned to optimize demo-site.example.com. 24h SLA window started.',
  '/dashboard/orders',
  false
) ON CONFLICT (id) DO NOTHING;
