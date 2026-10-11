-- ============================================================================
-- Free service tier (Part 1: schema + auto-provision trigger)
-- Product rule: every account can connect ONE site and see CrUX web vitals.
-- Purchasing managed_wp unlocks the other features.
-- ============================================================================
-- NOTE: the newly added enum value cannot be USED in this same transaction,
-- which is why the backfill for existing users lives in the next migration.

-- STEP 1: Allow 'free' as a service type
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'free';

-- STEP 2: The free entitlement exists before a site is connected, so
-- website_name (required for paid services) becomes optional
ALTER TABLE user_services ALTER COLUMN website_name DROP NOT NULL;

-- STEP 3: Exactly one free service per user, ever
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_services_free_per_user
    ON user_services (user_id)
    WHERE service_type = 'free';

-- STEP 4: Auto-provision profile + free service at signup.
-- SECURITY DEFINER so it bypasses RLS. This covers ALL auth paths:
-- email-confirmation callback AND direct password sign-in.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO user_services (user_id, service_type, status, metadata)
    SELECT NEW.id, 'free'::service_type_enum, 'active',
           '{"plan": "Free", "max_sites": 1, "features": ["crux"]}'::jsonb
    WHERE NOT EXISTS (
        SELECT 1 FROM user_services
        WHERE user_id = NEW.id AND service_type = 'free'
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
