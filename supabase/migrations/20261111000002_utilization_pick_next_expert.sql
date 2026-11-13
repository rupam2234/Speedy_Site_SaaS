-- ============================================================================
-- Update pick_next_expert() to balance workload by utilization ratio
-- (active_load / capacity) instead of raw rr_position alone.
-- Tie-breakers: lowest active_load, oldest last_assigned_at (NULLS FIRST),
-- then lowest rr_position. Keeps FOR UPDATE OF e SKIP LOCKED for concurrency.
-- Idempotent.
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
    ORDER BY
        (load.active_load::numeric / GREATEST(e.capacity, 1)) ASC,
        load.active_load ASC,
        e.last_assigned_at ASC NULLS FIRST,
        e.rr_position ASC
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
