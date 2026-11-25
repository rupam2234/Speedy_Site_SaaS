-- Retire SQL readers that existed only for Trace, generic Analytics, and
-- Global UX. Historical rum_metrics rows remain unchanged.

DROP FUNCTION IF EXISTS public.recent_requests(text, integer);
DROP FUNCTION IF EXISTS public.traffic_source();
DROP FUNCTION IF EXISTS public.get_daily_web_metrics(date);
DROP FUNCTION IF EXISTS public.user_happiness_dist(text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.ux_map_data(text);
