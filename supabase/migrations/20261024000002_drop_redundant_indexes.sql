-- ============================================================================
-- Cleanup: Drop redundant/unused indexes
-- Safe to drop: 0% usage, 0 index scans, or duplicates
-- ============================================================================

-- 1. Old unique index from free tier v1 (replaced by trigger in 20261024000001)
DROP INDEX IF EXISTS uniq_user_services_free_per_user;

-- 2. Duplicate FK index on orders.user_id (covered by idx_orders_user_id_website_name which has 10K+ scans)
DROP INDEX IF EXISTS idx_orders_user_id;

-- 3. Unique constraint on orders.website_address never queried (not referenced by FKs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_website_address_key'
      AND contype = 'u'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_constraint pk ON c.confrelid = pk.conrelid AND c.confkey = pk.conkey
      WHERE pk.conname = 'orders_website_address_key'
    ) THEN
      ALTER TABLE orders DROP CONSTRAINT orders_website_address_key;
    END IF;
  END IF;
END $$;

-- 4. Unused FK/column indexes on user_services
DROP INDEX IF EXISTS idx_user_services_order_id;
DROP INDEX IF EXISTS idx_user_services_status;
DROP INDEX IF EXISTS idx_user_services_service_type;

-- 5. Indexes/constraints on empty tables (no rows ever inserted)
-- Use DO blocks for constraints that back indexes

-- website_metadata.url unique constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'website_metadata_url_key'
      AND contype = 'u'
  ) THEN
    ALTER TABLE website_metadata DROP CONSTRAINT website_metadata_url_key;
  END IF;
END $$;

-- email_reporting_pkey is a PK constraint - can't drop plain index
-- wp_scans_pkey is a PK constraint - can't drop plain index
-- Keep PK constraints for table structure

-- wp_scans secondary indexes
DROP INDEX IF EXISTS idx_wp_scans_status;
DROP INDEX IF EXISTS idx_wp_scans_scan_type;

-- optimization_tasks secondary indexes
DROP INDEX IF EXISTS idx_optimization_tasks_category;
DROP INDEX IF EXISTS idx_optimization_tasks_status;

-- Note: PK constraints on empty tables (wp_key, optimization_tasks, etc.) kept
-- as they're required for table structure and will be used when features launch.

-- Note: rum_metrics indexes (idx_rum_resource_summary 101MB, etc.) NOT dropped here.
-- Those require investigation - they may be hyperloglog/approximate indexes.
-- If confirmed unused, they should be dropped in a separate migration with verification.