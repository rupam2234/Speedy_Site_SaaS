-- ============================================================================
-- PHASE 1: Subscription → Service Model Migration (Part 2: Data Migration & Cleanup)
-- ============================================================================

-- STEP 5: Migrate data from subscriptions → user_services
-- Insert managed_wp services from existing subscriptions
INSERT INTO user_services (
    user_id,
    order_id,
    website_name,
    service_type,
    status,
    purchased_at,
    expires_at,
    metadata,
    created_at,
    updated_at
)
SELECT 
    s.user_id,  -- already UUID
    s.stripe_customer_id,  -- Use stripe_customer_id as order_id reference (text, stored in VARCHAR)
    COALESCE(o.website_name, 'unknown'),
    'managed_wp'::service_type_enum,
    CASE 
        WHEN s.status = 'active' THEN 'active'
        WHEN s.status = 'canceled' THEN 'cancelled'
        WHEN s.status = 'incomplete' THEN 'pending'
        ELSE 'expired'
    END,
    s.created_at,
    CASE 
        WHEN s.period_ends_at IS NOT NULL THEN s.period_ends_at + INTERVAL '12 months'
        ELSE NULL
    END,
    jsonb_build_object(
        'rum_pageview_limit', COALESCE(sl.usage_limit, 50000),
        'scans_completed', 0,
        'plan_name', s.plan,
        'original_subscription_id', s.stripe_subscription_id
    ),
    s.created_at,
    s.updated_at
FROM subscriptions s
LEFT JOIN orders o ON o.user_id = s.user_id  -- JOIN on user_id (both UUID)
LEFT JOIN subscription_with_limit sl ON sl.user_id = s.user_id;

-- STEP 6: Add product_type to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_type VARCHAR;

-- Update existing orders: map to managed_wp (legacy subscription orders)
UPDATE orders 
SET product_type = 'managed_wp'
WHERE product_type IS NULL;

-- STEP 7: Drop foreign key constraints referencing dropped tables
-- Drop FK from one_time_orders to plan_metadata
ALTER TABLE one_time_orders DROP CONSTRAINT IF EXISTS one_time_orders_plan_fkey;

-- Drop FK from subscriptions to plan_metadata
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_fkey;

-- Drop FK from wordpress_cred referencing one_time_orders
ALTER TABLE wordpress_cred DROP CONSTRAINT IF EXISTS wordpress_cred_payment_id_fkey;

-- STEP 8: Drop old tables and views (CASCADE to handle dependencies)
DROP VIEW IF EXISTS subscription_with_limit CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plan_metadata CASCADE;
DROP TABLE IF EXISTS one_time_orders CASCADE;