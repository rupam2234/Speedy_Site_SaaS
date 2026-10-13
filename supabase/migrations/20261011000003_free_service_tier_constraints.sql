-- ============================================================================
-- Free service tier (Part 3: constraints + auto-provision trigger)
-- Uses the 'free' enum value — must run in its own transaction AFTER part 1
-- committed it (Postgres forbids using a new enum value in the adding
-- transaction). Idempotent.
-- ============================================================================

-- STEP 1: Exactly one free service per user, ever
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_services_free_per_user
    ON user_services (user_id)
    WHERE service_type = 'free';

-- STEP 2: Auto-provision profile + free service at signup.
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
