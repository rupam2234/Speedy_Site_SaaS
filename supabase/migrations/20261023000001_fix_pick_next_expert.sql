-- ============================================================================
-- Fix pick_next_expert() (follow-up to 20261022000001, which shipped a broken
-- function: it referenced experts_pool.active_load, a column that exists only
-- on the experts_pool_live view, so auto-assignment failed at runtime with
-- 42703 "column e.active_load does not exist"). Compute the active load inline
-- via CROSS JOIN LATERAL and keep FOR UPDATE OF e SKIP LOCKED so the capacity
-- check stays atomic. Idempotent.
-- ============================================================================

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
    CROSS JOIN LATERAL (
        SELECT count(*)::bigint AS active_load
        FROM public.order_assignments a
        WHERE a.expert_id = e.expert_id
          AND a.is_active
          AND a.status IN ('pending','accepted','in_progress')
    ) load
    WHERE e.is_available
      AND load.active_load < e.capacity
    ORDER BY e.rr_position ASC, e.last_assigned_at ASC NULLS FIRST
    FOR UPDATE OF e SKIP LOCKED
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