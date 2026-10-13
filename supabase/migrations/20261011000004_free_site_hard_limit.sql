-- ============================================================================
-- Free tier: hard cap of ONE connected 'free' site per user, enforced at the
-- database level so concurrent requests can never exceed the limit
-- (the app-level count check alone is race-prone).
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_free_per_user
    ON orders (user_id)
    WHERE product_type = 'free';
