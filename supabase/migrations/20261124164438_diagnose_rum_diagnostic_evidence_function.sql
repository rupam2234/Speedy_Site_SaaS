-- Temporary service-role-only diagnostic for the installed evidence validator.
CREATE OR REPLACE FUNCTION public.diagnose_rum_diagnostic_evidence_function()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT pg_catalog.pg_get_functiondef('public.rum_diagnostic_evidence_is_valid(jsonb)'::regprocedure);
$$;

REVOKE ALL ON FUNCTION public.diagnose_rum_diagnostic_evidence_function() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.diagnose_rum_diagnostic_evidence_function() FROM anon;
REVOKE ALL ON FUNCTION public.diagnose_rum_diagnostic_evidence_function() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_rum_diagnostic_evidence_function() TO service_role;
