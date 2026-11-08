-- ============================================================================
-- User onboarding flow: site_onboarding state + HMAC binding columns on wp_key
-- Plan: docs/DESIGN-user-onboarding-flow.md
-- Idempotent.
-- ============================================================================

-- STEP 1: onboarding state per user + site (card state, checks, tour progress)
CREATE TABLE IF NOT EXISTS public.site_onboarding (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    website_name text NOT NULL,
    status text NOT NULL DEFAULT 'checks_pending',
    current_step int NOT NULL DEFAULT 0,
    public_checks jsonb,
    opt_in_at timestamptz,
    tour jsonb NOT NULL DEFAULT '{}'::jsonb,
    stripe_session_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT site_onboarding_status_check
        CHECK (status IN ('checks_pending', 'checks_done', 'opted_in', 'tour_complete', 'dismissed')),
    CONSTRAINT site_onboarding_step_range CHECK (current_step >= 0 AND current_step <= 5),
    -- Link to the orders row for this site; enforced in app code as well.
    CONSTRAINT site_onboarding_website_name_fkey
        FOREIGN KEY (website_name)
        REFERENCES public.orders(website_name)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_site_onboarding_user_site
    ON public.site_onboarding (user_id, website_name);

-- Composite index for fast lookups of a user's onboarding rows by site.
CREATE INDEX IF NOT EXISTS idx_site_onboarding_user_site
    ON public.site_onboarding (user_id, website_name);

CREATE INDEX IF NOT EXISTS idx_site_onboarding_user_status
    ON public.site_onboarding (user_id, status);

ALTER TABLE public.site_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_onboarding_select_own" ON public.site_onboarding;
CREATE POLICY "site_onboarding_select_own"
    ON public.site_onboarding FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "site_onboarding_insert_own" ON public.site_onboarding;
CREATE POLICY "site_onboarding_insert_own"
    ON public.site_onboarding FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "site_onboarding_update_own" ON public.site_onboarding;
CREATE POLICY "site_onboarding_update_own"
    ON public.site_onboarding FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- STEP 2: HMAC signature binding next to the existing per-domain plugin secret,
-- so wp_key stays the single source of truth for "is this domain bound".
ALTER TABLE public.wp_key ADD COLUMN IF NOT EXISTS hmac_signature text;
ALTER TABLE public.wp_key ADD COLUMN IF NOT EXISTS hmac_expires_at timestamptz;
ALTER TABLE public.wp_key ADD COLUMN IF NOT EXISTS hmac_verified_at timestamptz;
ALTER TABLE public.wp_key ADD COLUMN IF NOT EXISTS rum_assigned_at timestamptz;
