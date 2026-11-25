-- Read live Web Vitals history directly from canonical and historical facts.
-- The materialized history table can lag behind newly collected pageviews.

CREATE OR REPLACE FUNCTION public.get_rum_history(
    p_domain text,
    p_from date,
    p_to date
)
RETURNS TABLE (
    day date,
    cls jsonb,
    fcp jsonb,
    inp jsonb,
    lcp jsonb,
    ttfb jsonb
)
LANGUAGE sql
STABLE
AS $$
    WITH readings AS (
        SELECT
            metric.report_date,
            metric.device_type,
            metric.metric_name,
            metric.metric_value
        FROM public.rum_metric_readings(
            p_domain,
            p_from::timestamptz,
            (p_to + 1)::timestamptz
        ) metric
        WHERE metric.current_page IS NOT NULL
    ),
    device_stats AS (
        SELECT
            report_date,
            device_type,
            metric_name,
            count(*) AS samples,
            round(percentile_cont(0.50) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p50,
            round(percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p75,
            round(percentile_cont(0.90) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p90,
            round(percentile_cont(0.95) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p95,
            round(percentile_cont(0.99) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p99
        FROM readings
        GROUP BY report_date, device_type, metric_name
    ),
    metric_stats AS (
        SELECT
            report_date,
            metric_name,
            jsonb_object_agg(
                device_type,
                jsonb_build_object(
                    'p50', p50,
                    'p75', p75,
                    'p90', p90,
                    'p95', p95,
                    'p99', p99,
                    'samples', samples
                )
            ) AS devices
        FROM device_stats
        GROUP BY report_date, metric_name
    ),
    daily_stats AS (
        SELECT
            report_date,
            jsonb_object_agg(metric_name, devices) AS metrics
        FROM metric_stats
        GROUP BY report_date
    )
    SELECT
        daily_stats.report_date AS day,
        COALESCE(daily_stats.metrics->'cls', '{}'::jsonb) AS cls,
        COALESCE(daily_stats.metrics->'fcp', '{}'::jsonb) AS fcp,
        COALESCE(daily_stats.metrics->'inp', '{}'::jsonb) AS inp,
        COALESCE(daily_stats.metrics->'lcp', '{}'::jsonb) AS lcp,
        COALESCE(daily_stats.metrics->'ttfb', '{}'::jsonb) AS ttfb
    FROM daily_stats
    WHERE daily_stats.report_date BETWEEN p_from AND p_to
    ORDER BY daily_stats.report_date;
$$;

REVOKE ALL ON FUNCTION public.get_rum_history(text, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_rum_history(text, date, date) FROM anon;
REVOKE ALL ON FUNCTION public.get_rum_history(text, date, date) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_rum_history(text, date, date) TO service_role;
