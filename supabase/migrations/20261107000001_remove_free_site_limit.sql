-- ============================================================================
-- Free tier: remove the connected-site cap entirely
-- The setup/onboarding page is now the single gateway for adding sites, so a
-- free account can connect any number of sites (CrUX web vitals each). The
-- paid `managed_wp` metadata site_limit is untouched.
-- Idempotent.
-- ============================================================================

-- The cap was a BEFORE INSERT trigger on orders: detach it and drop the
-- function so it cannot be re-attached by a re-run of an older migration.
DROP TRIGGER IF EXISTS enforce_free_site_limit ON orders;
DROP FUNCTION IF EXISTS public.enforce_free_site_limit();

-- Keep auto-provisioning new users with the free service, but with no site cap
-- in the metadata (max_sites: null == unlimited).
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
           '{"plan": "Free", "max_sites": null, "features": ["crux"]}'::jsonb
    WHERE NOT EXISTS (
        SELECT 1 FROM user_services
        WHERE user_id = NEW.id AND service_type = 'free'
    );

    RETURN NEW;
END;
$$;

-- Existing free rows keep whatever metadata they already have; null max_sites
-- means "no cap" and nothing reads it for free accounts anymore.
UPDATE user_services
SET metadata = jsonb_set(metadata, '{max_sites}', 'null'::jsonb)
WHERE service_type = 'free'
  AND metadata ? 'max_sites';
