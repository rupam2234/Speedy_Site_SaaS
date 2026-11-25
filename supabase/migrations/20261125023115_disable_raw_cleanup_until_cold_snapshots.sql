-- Raw cleanup stays disabled until verified cold snapshots exist for every deleted day.
CREATE OR REPLACE FUNCTION public.delete_old_rum_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Raw RUM cleanup is disabled until verified cold snapshots are available';
END;
$$;

REVOKE ALL ON FUNCTION public.delete_old_rum_metrics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_old_rum_metrics() FROM anon;
REVOKE ALL ON FUNCTION public.delete_old_rum_metrics() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_old_rum_metrics() TO service_role;
