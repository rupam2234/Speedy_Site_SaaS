-- The retained canonical readers use typed facts and JSONPath fallbacks, not GIN containment.
DROP INDEX IF EXISTS public.idx_rum_resource_summary;
