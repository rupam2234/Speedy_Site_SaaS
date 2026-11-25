-- Restrict raw-row cleanup to controlled service-role execution and bound each transaction.
CREATE OR REPLACE FUNCTION public.delete_old_rum_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    rows_deleted integer;
BEGIN
    LOOP
        DELETE FROM public.rum_metrics
        WHERE id IN (
            SELECT id
            FROM public.rum_metrics
            WHERE created_at < NOW() - INTERVAL '7 days'
            ORDER BY created_at
            LIMIT 5000
        );

        GET DIAGNOSTICS rows_deleted = ROW_COUNT;
        EXIT WHEN rows_deleted = 0;
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_old_rum_metrics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_old_rum_metrics() FROM anon;
REVOKE ALL ON FUNCTION public.delete_old_rum_metrics() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_old_rum_metrics() TO service_role;
