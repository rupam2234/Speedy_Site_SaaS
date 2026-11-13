-- ============================================================================
-- Free tier: increase hard cap from 1 to 3 connected 'free' sites per user
-- Replaces the unique index with a trigger-based check (unique index only supports 1)
-- ============================================================================

-- Drop the old unique index that enforced exactly 1 free order per user
DROP INDEX IF EXISTS uniq_orders_free_per_user;

-- Create a BEFORE INSERT trigger function to enforce max 3 free sites per user
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

    IF free_count >= 3 THEN
      RAISE EXCEPTION 'Free plan allows up to three connected sites. Upgrade to add more.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to orders table
DROP TRIGGER IF EXISTS enforce_free_site_limit ON orders;
CREATE TRIGGER enforce_free_site_limit
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_site_limit();