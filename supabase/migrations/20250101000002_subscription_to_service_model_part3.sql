-- ============================================================================
-- PHASE 1: Subscription → Service Model Migration (Part 3: Views & RLS)
-- ============================================================================

-- STEP 9: Update cloudflare_kv_tracking view to use user_services
DROP VIEW IF EXISTS cloudflare_kv_tracking;

CREATE VIEW cloudflare_kv_tracking AS
SELECT 
    o.order_id,
    o.website_name,
    o.user_id,
    o.order_date,  -- orders uses order_date, not created_at
    o.order_status,
    o.favicon_file,
    o.report_email,
    o.rum_connection,
    o.usage_by_site,
    o.website_address,
    o.weekly_report,
    o.product_type,
    -- Service data from user_services
    us.id AS service_id,
    us.service_type,
    us.status AS service_status,
    us.purchased_at,
    us.expires_at,
    us.metadata,
    -- Cloudflare auth data
    ca.token,
    ca.config_backup,
    ca.status AS cf_status
FROM orders o
LEFT JOIN user_services us ON us.website_name = o.website_name  -- JOIN on website_name (both text)
LEFT JOIN cloudflare_auth ca ON ca.site_id = o.order_id;

-- STEP 10: Update v_cf_zone_per_site view (references cloudflare_kv_tracking)
DROP VIEW IF EXISTS v_cf_zone_per_site;

CREATE VIEW v_cf_zone_per_site AS
SELECT 
    ckt.order_id,
    ckt.website_name,
    ckt.user_id,
    ckt.token,
    ckt.config_backup,
    ckt.cf_status AS status,
    ckt.order_status
FROM cloudflare_kv_tracking ckt
WHERE ckt.token IS NOT NULL;

-- STEP 11: Grant permissions
GRANT SELECT ON user_services TO anon, authenticated;
GRANT SELECT ON wp_scans TO anon, authenticated;
GRANT SELECT ON optimization_tasks TO anon, authenticated;
GRANT SELECT ON cloudflare_kv_tracking TO anon, authenticated;
GRANT SELECT ON v_cf_zone_per_site TO anon, authenticated;

-- STEP 12: Enable RLS on new tables
ALTER TABLE user_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_services
CREATE POLICY "Users can view their own services" ON user_services
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all services" ON user_services
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for wp_scans
CREATE POLICY "Users can view scans for their services" ON wp_scans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_services us 
            WHERE us.id = wp_scans.user_service_id 
            AND us.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all scans" ON wp_scans
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for optimization_tasks
CREATE POLICY "Users can view tasks for their services" ON optimization_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_services us 
            WHERE us.id = optimization_tasks.user_service_id 
            AND us.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all tasks" ON optimization_tasks
    FOR ALL USING (auth.role() = 'service_role');