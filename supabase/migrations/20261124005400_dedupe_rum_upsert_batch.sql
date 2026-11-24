-- Apply each RUM payload as a separate upsert so a batch may safely contain
-- continuation or retry payloads that share the same pageview_id.

ALTER FUNCTION public.upsert_rum_metrics_batch(jsonb)
    RENAME TO upsert_rum_metrics_batch_single;

CREATE OR REPLACE FUNCTION public.upsert_rum_metrics_batch(payloads jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    payload jsonb;
BEGIN
    FOR payload IN
        SELECT value FROM jsonb_array_elements(payloads)
    LOOP
        PERFORM public.upsert_rum_metrics_batch_single(jsonb_build_array(payload));
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_rum_metrics_batch(jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch_single(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch_single(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch_single(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_rum_metrics_batch_single(jsonb) TO service_role;
