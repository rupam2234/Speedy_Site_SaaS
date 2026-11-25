-- Restrict the RUM batch upsert to the trusted ingestion role.
REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_rum_metrics_batch(jsonb) TO service_role;

