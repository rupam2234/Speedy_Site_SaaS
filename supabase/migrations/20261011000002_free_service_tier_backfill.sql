-- ============================================================================
-- Free service tier (Part 2: backfill existing users)
-- Runs in its own transaction AFTER the enum value from part 1 has committed,
-- so 'free' is usable here. Idempotent.
-- ============================================================================



-- STEP 1: Profiles for any legacy user missing one
-- (previously only email-confirmation signups created a profile;
-- password sign-ins skipped it)
INSERT INTO profiles (id, email)
SELECT u.id, u.email
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- STEP 2: Free service for accounts with no services at all.
-- Paying users keep only their paid services (grandfathered).
INSERT INTO user_services (user_id, service_type, status, metadata)
SELECT u.id, 'free'::service_type_enum, 'active',
       '{"plan": "Free", "max_sites": 1, "features": ["crux"]}'::jsonb
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_services us WHERE us.user_id = u.id
);
