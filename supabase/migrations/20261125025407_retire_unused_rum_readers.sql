-- Remove unused legacy RUM readers after the canonical dashboard cutover.
-- The distributions reader now reads canonical and historical raw facts directly.

CREATE OR REPLACE FUNCTION public.rum_distributions_all_metrics(
    p_domain_name text,
    p_start date,
    p_end date
)
RETURNS TABLE (
    device_type text,
    metric text,
    good_count bigint,
    needs_improvement_count bigint,
    poor_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH readings AS (
        SELECT
            metric.device_type,
            metric.metric_name,
            lower(replace(metric.rating, '-', ' ')) AS rating
        FROM public.rum_metric_readings(
            p_domain_name,
            p_start::timestamp AT TIME ZONE 'UTC',
            (p_end + 1)::timestamp AT TIME ZONE 'UTC'
        ) metric
        WHERE metric.current_page IS NOT NULL
          AND metric.metric_name IN ('LCP', 'INP', 'CLS', 'TTFB', 'FCP')
    )
    SELECT
        readings.device_type,
        readings.metric_name AS metric,
        count(*) FILTER (WHERE readings.rating = 'good') AS good_count,
        count(*) FILTER (WHERE readings.rating = 'needs improvement') AS needs_improvement_count,
        count(*) FILTER (WHERE readings.rating = 'poor') AS poor_count
    FROM readings
    GROUP BY readings.device_type, readings.metric_name
    ORDER BY readings.device_type, readings.metric_name;
$$;

REVOKE ALL ON FUNCTION public.rum_distributions_all_metrics(text, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rum_distributions_all_metrics(text, date, date) FROM anon;
REVOKE ALL ON FUNCTION public.rum_distributions_all_metrics(text, date, date) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rum_distributions_all_metrics(text, date, date) TO service_role;

DROP FUNCTION IF EXISTS public.analyze_web_vitals_by_page(text, text);
DROP FUNCTION IF EXISTS public.cache_analysis(text);
DROP FUNCTION IF EXISTS public.get_ai_citation(text);
DROP FUNCTION IF EXISTS public.get_analytics_by_device_and_country(text, text);
DROP FUNCTION IF EXISTS public.get_web_vitals_metrics(text);
DROP FUNCTION IF EXISTS public.get_web_vitals_metrics(text, text);
DROP FUNCTION IF EXISTS public.lcp_attribution_by_device(text, text, timestamptz, timestamptz, numeric);
DROP FUNCTION IF EXISTS public.third_party_domains(text, text);
DROP FUNCTION IF EXISTS public.top_landing_page(text, text);
DROP FUNCTION IF EXISTS public.user_happiness(text, text);
DROP FUNCTION IF EXISTS public.web_vitals(text, text);
DROP FUNCTION IF EXISTS public.delete_old_rum_hits();
DROP FUNCTION IF EXISTS public.refresh_rum_daily_distributions(date);
