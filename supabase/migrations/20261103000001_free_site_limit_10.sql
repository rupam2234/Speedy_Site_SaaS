-- ============================================================================
-- Free tier: increase hard cap from 3 to 10 connected 'free' sites per user
-- Updates the BEFORE INSERT trigger function on orders table
-- and the handle_new_user auto-provisioning function for auth.users
-- ============================================================================

-- Drop the old unique index in case it still exists in any environment
DROP INDEX IF EXISTS uniq_orders_free_per_user;

-- Create/replace the BEFORE INSERT trigger function to enforce max 10 free sites per user
CREATE OR REPLACE FUNCTION public.enforce_free_site_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  free_count int;
BEGIN
  -- Only enforce on free product_type inserts
  IF NEW.product_type = 'free' THEN
    SELECT count(*) INTO free_count
    FROM orders
    WHERE user_id = NEW.user_id
      AND product_type = 'free';

    IF free_count >= 10 THEN
      RAISE EXCEPTION 'Free plan allows up to 10 connected sites. Upgrade to add more.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached to orders table
DROP TRIGGER IF EXISTS enforce_free_site_limit ON orders;
CREATE TRIGGER enforce_free_site_limit
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_site_limit();

-- Update the auto-provision trigger function so new users get max_sites: 10 in metadata
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
           '{"plan": "Free", "max_sites": 10, "features": ["crux"]}'::jsonb
    WHERE NOT EXISTS (
        SELECT 1 FROM user_services
        WHERE user_id = NEW.id AND service_type = 'free'
    );

    RETURN NEW;
END;
$$;
