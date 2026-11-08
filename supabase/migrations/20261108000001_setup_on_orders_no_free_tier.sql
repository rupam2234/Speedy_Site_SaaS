-- ============================================================================
-- Setup flow consolidation (supersedes 20261107000001_remove_free_site_limit)
--
-- 1. `orders` becomes the single table for site management + setup progress
--    (the site_onboarding table is folded into it).
-- 2. There is no free tier any more: a site only exists behind an active
--    `managed_wp` entitlement, so free services are sunset and signup no longer
--    auto-provisions one.
-- 3. The old free-site cap trigger/function is removed for good, whether or not
--    the previous migration ran (this file is self-sufficient).
--
-- Idempotent / safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. orders gains the setup columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS setup_step integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tour jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz;

-- Lookup index for the per-site setup writes (user + website_name).
CREATE INDEX IF NOT EXISTS idx_orders_user_website
    ON public.orders (user_id, website_name);

-- One row per site per user: orders is now the site table, so duplicates would
-- make the setup writes ambiguous. Only created when the data already honours
-- it, so this migration can never fail on legacy rows.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.orders
        GROUP BY user_id, website_name
        HAVING count(*) > 1
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_user_website
            ON public.orders (user_id, website_name);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Fold site_onboarding into orders, then drop the table
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'site_onboarding'
    ) THEN
        UPDATE public.orders o
        SET tour = COALESCE(o.tour, '{}'::jsonb) || COALESCE(s.tour, '{}'::jsonb),
            setup_step = GREATEST(o.setup_step, COALESCE(s.current_step, 0)),
            setup_completed_at = CASE
                WHEN s.status = 'tour_complete' THEN COALESCE(o.setup_completed_at, now())
                ELSE o.setup_completed_at
            END
        FROM public.site_onboarding s
        WHERE s.website_name = o.website_name
          AND s.user_id = o.user_id;

        DROP TABLE public.site_onboarding;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. No free tier: sunset free services, stop auto-provisioning them
-- ---------------------------------------------------------------------------
UPDATE public.user_services
SET status = 'expired',
    updated_at = now()
WHERE service_type = 'free'
  AND status = 'active';

-- Signup provisions profiles only. A service row appears when the account buys
-- the managed service, which is also what now unlocks adding a site.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Free-site cap: trigger, function and legacy index gone for good
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS enforce_free_site_limit ON orders;
DROP FUNCTION IF EXISTS public.enforce_free_site_limit();
DROP INDEX IF EXISTS uniq_orders_free_per_user;
DROP INDEX IF EXISTS uniq_user_services_free_per_user;
