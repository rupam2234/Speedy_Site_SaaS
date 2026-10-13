-- ============================================================================
-- Free service tier (Part 1: type change only)
-- Product rule: every account can connect ONE site and see CrUX web vitals.
-- Purchasing managed_wp unlocks the other features.
-- ============================================================================
-- IMPORTANT: Postgres forbids USING a newly added enum value in the same
-- transaction that adds it (index predicates / function bodies count as
-- usage). The objects that reference 'free' therefore live in the next
-- migration files, which run in their own transactions.

-- STEP 1: Allow 'free' as a service type
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'free';

-- STEP 2: The free entitlement exists before a site is connected, so
-- website_name (required for paid services) becomes optional
ALTER TABLE user_services ALTER COLUMN website_name DROP NOT NULL;

