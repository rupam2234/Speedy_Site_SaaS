-- ============================================================================
-- Admin console & service experts (Phase 1 of DESIGN-admin-expert-management)
-- Extends profiles.role with 'expert', adds order_assignments + experts_pool,
-- RLS policies, and a capacity-aware round-robin Postgres function.
-- Idempotent.
-- ============================================================================

-- STEP 1: protect profiles.role against typos
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'admin', 'expert'));

-- STEP 2: experts_pool (round-robin state, one row per expert)
CREATE TABLE IF NOT EXISTS public.experts_pool (
    expert_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    capacity         int NOT NULL DEFAULT 10 CHECK (capacity > 0),
    is_available     boolean NOT NULL DEFAULT true,
    rr_position      bigint NOT NULL DEFAULT 0,
    last_assigned_at timestamptz
);

ALTER TABLE public.experts_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage experts_pool" ON public.experts_pool;
CREATE POLICY "admins manage experts_pool" ON public.experts_pool
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

DROP POLICY IF EXISTS "experts read own pool row" ON public.experts_pool;
CREATE POLICY "experts read own pool row" ON public.experts_pool
    FOR SELECT USING (expert_id = auth.uid());

-- STEP 3: order_assignments (append-only history)
CREATE TABLE IF NOT EXISTS public.order_assignments (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     uuid NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    expert_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','in_progress','completed','skipped','reassigned')),
    assigned_at  timestamptz NOT NULL DEFAULT now(),
    accepted_at  timestamptz,
    completed_at timestamptz,
    assigned_by  uuid REFERENCES auth.users(id),
    skip_reason  text,
    is_active    boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_order_assignments_order
    ON public.order_assignments (order_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_expert
    ON public.order_assignments (expert_id);

-- exactly one active assignment per order
CREATE UNIQUE INDEX IF NOT EXISTS uniq_order_assignments_active_per_order
    ON public.order_assignments (order_id) WHERE is_active;

ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage assignments" ON public.order_assignments;
CREATE POLICY "admins manage assignments" ON public.order_assignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

DROP POLICY IF EXISTS "experts read own assignments" ON public.order_assignments;
CREATE POLICY "experts read own assignments" ON public.order_assignments
    FOR SELECT USING (expert_id = auth.uid());

DROP POLICY IF EXISTS "experts update own assignment status" ON public.order_assignments;
CREATE POLICY "experts update own assignment status" ON public.order_assignments
    FOR UPDATE USING (expert_id = auth.uid())
    WITH CHECK (expert_id = auth.uid());

-- customers must NOT see assignments (no policy grants them anything).

-- STEP 4: capacity-aware round-robin pick (atomic)
-- Returns the eligible expert with the lowest rr_position, or NULL.
CREATE OR REPLACE FUNCTION public.pick_next_expert()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    chosen uuid;
BEGIN
    SELECT e.expert_id INTO chosen
    FROM public.experts_pool e
    WHERE e.is_available
      AND e.active_load < e.capacity
    ORDER BY e.rr_position ASC, e.last_assigned_at ASC NULLS FIRST
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF chosen IS NOT NULL THEN
        UPDATE public.experts_pool
        SET rr_position = rr_position + 1,
            last_assigned_at = now()
        WHERE expert_id = chosen;
    END IF;

    RETURN chosen;
END;
$$;

-- active_load as a live derived count (no trigger needed for reads)
CREATE OR REPLACE VIEW public.experts_pool_live AS
SELECT p.*,
       (SELECT count(*) FROM public.order_assignments a
        WHERE a.expert_id = p.expert_id
          AND a.is_active
          AND a.status IN ('pending','accepted','in_progress')) AS active_load
FROM public.experts_pool p;
