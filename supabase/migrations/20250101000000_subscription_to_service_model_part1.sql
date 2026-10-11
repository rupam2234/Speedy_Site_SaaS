-- ============================================================================
-- PHASE 1: Subscription → Service Model Migration (Part 1: New Tables)
-- ============================================================================

-- STEP 1: Create ENUM for service types
CREATE TYPE service_type_enum AS ENUM ('managed_wp', 'rum_renewal');

-- STEP 2: Create user_services table (core replacement for subscriptions)
CREATE TABLE user_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id VARCHAR,                    -- Links to orders table
    website_name VARCHAR NOT NULL,
    service_type service_type_enum NOT NULL,
    status VARCHAR DEFAULT 'active',     -- active, completed, expired, cancelled
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,              -- NULL for managed_wp (lifetime), set for rum_renewal
    metadata JSONB DEFAULT '{}',         -- {rum_pageview_limit: 50000, scans_completed: 3}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_user_services_user_id ON user_services(user_id);
CREATE INDEX idx_user_services_website_name ON user_services(website_name);
CREATE INDEX idx_user_services_order_id ON user_services(order_id);
CREATE INDEX idx_user_services_status ON user_services(status);
CREATE INDEX idx_user_services_service_type ON user_services(service_type);

-- Note: update_updated_at_column function doesn't exist in this DB
-- Trigger removed - updated_at will be managed by application layer

-- STEP 3: Create wp_scans table (scan history)
CREATE TABLE wp_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_service_id UUID NOT NULL REFERENCES user_services(id) ON DELETE CASCADE,
    scan_type VARCHAR NOT NULL,          -- 'baseline', 'during_optimization', 'post_verification'
    status VARCHAR DEFAULT 'pending',    -- pending, running, completed, failed
    results JSONB,                       -- Full AI analysis output
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wp_scans_user_service_id ON wp_scans(user_service_id);
CREATE INDEX idx_wp_scans_status ON wp_scans(status);
CREATE INDEX idx_wp_scans_scan_type ON wp_scans(scan_type);

-- STEP 4: Create optimization_tasks table (progress tracking)
CREATE TABLE optimization_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_service_id UUID NOT NULL REFERENCES user_services(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,                    -- 'caching', 'images', 'database', 'third_party', 'code'
    status VARCHAR DEFAULT 'planned',    -- planned, in_progress, review, completed, skipped
    impact_score INT,                    -- 1-10 estimated CWV impact
    actual_impact JSONB,                 -- {lcp_before: 4.2, lcp_after: 1.8, ...}
    assigned_to VARCHAR,                 -- team member
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_optimization_tasks_user_service_id ON optimization_tasks(user_service_id);
CREATE INDEX idx_optimization_tasks_status ON optimization_tasks(status);
CREATE INDEX idx_optimization_tasks_category ON optimization_tasks(category);