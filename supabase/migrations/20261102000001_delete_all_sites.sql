-- ============================================================================
-- Delete all sites and related data
-- This migration removes all site data from the database to start fresh
-- with the new WP plugin integration flow.
-- ============================================================================

-- Disable RLS temporarily for service role to allow deletions
-- (Service role bypasses RLS anyway, but this is explicit)

-- Step 1: Delete from child tables referencing user_services
DELETE FROM wp_scans;
DELETE FROM optimization_tasks;

-- Step 2: Delete from user_services (references orders.order_id and auth.users)
DELETE FROM user_services;

-- Step 3: Delete from tables referencing orders
DELETE FROM cloudflare_auth;
DELETE FROM wordpress_cred;
DELETE FROM email_reporting;
DELETE FROM order_assignments;
DELETE FROM wp_key;

-- Step 4: Delete from RUM tables referencing orders.website_name
DELETE FROM rum_daily_distributions;
DELETE FROM rum_history_new;
DELETE FROM rum_origin_hits_agg;
DELETE FROM rum_metrics WHERE domain_name IS NOT NULL;

-- Step 5: Delete from website_metadata (if any orphaned records)
DELETE FROM website_metadata;

-- Step 6: Finally delete all orders (sites)
DELETE FROM orders;

-- Verify deletion
SELECT 'orders' as table_name, count(*) as remaining FROM orders
UNION ALL
SELECT 'user_services', count(*) FROM user_services
UNION ALL
SELECT 'cloudflare_auth', count(*) FROM cloudflare_auth
UNION ALL
SELECT 'wordpress_cred', count(*) FROM wordpress_cred
UNION ALL
SELECT 'email_reporting', count(*) FROM email_reporting
UNION ALL
SELECT 'order_assignments', count(*) FROM order_assignments
UNION ALL
SELECT 'wp_key', count(*) FROM wp_key
UNION ALL
SELECT 'wp_scans', count(*) FROM wp_scans
UNION ALL
SELECT 'optimization_tasks', count(*) FROM optimization_tasks
UNION ALL
SELECT 'rum_daily_distributions', count(*) FROM rum_daily_distributions
UNION ALL
SELECT 'rum_history_new', count(*) FROM rum_history_new
UNION ALL
SELECT 'rum_origin_hits_agg', count(*) FROM rum_origin_hits_agg
UNION ALL
SELECT 'rum_metrics', count(*) FROM rum_metrics
UNION ALL
SELECT 'website_metadata', count(*) FROM website_metadata;