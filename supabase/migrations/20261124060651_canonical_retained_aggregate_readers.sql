-- Canonical v2 reader cutover for retained aggregate and filter RPCs.
-- Version 2 rows use typed columns only. Historical rows keep a deduplicated
-- legacy event fallback until the final destructive events migration.

CREATE OR REPLACE FUNCTION public.rum_metric_readings(
    p_domain text,
    p_start timestamptz,
    p_end timestamptz DEFAULT NULL
)
RETURNS TABLE (
    row_id bigint,
    report_date date,
    current_page text,
    device_type text,
    network_effective_type text,
    metric_name text,
    metric_value numeric,
    rating text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        rm.id,
        rm.created_at::date,
        rm.current_page,
        COALESCE(rm.device_type, 'unknown') AS device_type,
        rm.network_effective_type,
        metric.metric_name,
        metric.metric_value::numeric,
        REPLACE(COALESCE(metric.rating, ''), '-', ' ') AS rating
    FROM public.rum_metrics rm
    CROSS JOIN LATERAL (
        VALUES
            ('FCP', rm.fcp_ms, rm.fcp_rating),
            ('LCP', rm.lcp_ms, rm.lcp_rating),
            ('CLS', rm.cls_value, rm.cls_rating),
            ('INP', rm.inp_ms, rm.inp_rating),
            ('TTFB', rm.ttfb_ms, rm.ttfb_rating)
    ) AS metric(metric_name, metric_value, rating)
    WHERE (
        p_domain IS NULL
        OR lower(CASE WHEN rm.domain_name LIKE 'www.%' THEN substring(rm.domain_name from 5) ELSE rm.domain_name END)
            = lower(CASE WHEN p_domain LIKE 'www.%' THEN substring(p_domain from 5) ELSE p_domain END)
    )
      AND rm.schema_version >= 2
      AND rm.created_at >= p_start
      AND (p_end IS NULL OR rm.created_at < p_end)
      AND metric.metric_value IS NOT NULL

    UNION ALL

    SELECT
        rm.id,
        rm.created_at::date,
        rm.current_page,
        COALESCE((
            SELECT client->>'deviceType'
            FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client
            WHERE client->>'type' = 'client-info'
            ORDER BY client->>'deviceType' NULLS LAST
            LIMIT 1
        ), 'unknown') AS device_type,
        (
            SELECT client->'connection'->>'effectiveType'
            FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client
            WHERE client->>'type' = 'client-info'
            ORDER BY client->>'deviceType' NULLS LAST
            LIMIT 1
        ) AS network_effective_type,
        event.metric_name,
        event.metric_value::numeric,
        REPLACE(COALESCE(event.metric_rating, ''), '-', ' ') AS rating
    FROM public.rum_metrics rm
    CROSS JOIN LATERAL (
        SELECT DISTINCT ON (web_vital->>'name')
            web_vital->>'name' AS metric_name,
            web_vital->>'value' AS metric_value,
            web_vital->>'rating' AS metric_rating
        FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) web_vital
        WHERE web_vital->>'type' = 'web-vital'
          AND web_vital->>'name' IN ('FCP', 'LCP', 'CLS', 'INP', 'TTFB')
          AND web_vital->>'value' IS NOT NULL
        ORDER BY
            web_vital->>'name',
            COALESCE(web_vital->>'timestamp', '0')::numeric DESC,
            COALESCE(web_vital->>'value', '0')::numeric DESC
    ) event
    WHERE (
        p_domain IS NULL
        OR lower(CASE WHEN rm.domain_name LIKE 'www.%' THEN substring(rm.domain_name from 5) ELSE rm.domain_name END)
            = lower(CASE WHEN p_domain LIKE 'www.%' THEN substring(p_domain from 5) ELSE p_domain END)
    )
      AND (rm.schema_version IS NULL OR rm.schema_version < 2)
      AND rm.created_at >= p_start
      AND (p_end IS NULL OR rm.created_at < p_end);
$$;

REVOKE ALL ON FUNCTION public.rum_metric_readings(text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rum_metric_readings(text, timestamptz, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.rum_metric_readings(text, timestamptz, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rum_metric_readings(text, timestamptz, timestamptz) TO service_role;


CREATE OR REPLACE FUNCTION public.cwv_dist_by_connection(
    p_metric text,
    p_domain text,
    p_start timestamptz,
    p_end timestamptz
)
RETURNS TABLE (
    connection_type text,
    desktop_good bigint,
    desktop_poor bigint,
    desktop_needs_improvement bigint,
    mobile_good bigint,
    mobile_poor bigint,
    mobile_needs_improvement bigint,
    tablet_good bigint,
    tablet_poor bigint,
    tablet_needs_improvement bigint,
    other_good bigint,
    other_poor bigint,
    other_needs_improvement bigint
)
LANGUAGE sql
STABLE
AS $$
    WITH readings AS (
        SELECT
            COALESCE(network_effective_type, '<unknown>') AS connection_type,
            CASE
                WHEN device_type IN ('desktop', 'pc') THEN 'desktop'
                WHEN device_type IN ('mobile', 'phone') THEN 'mobile'
                WHEN device_type IN ('tablet', 'pad') THEN 'tablet'
                ELSE 'other'
            END AS device,
            rating
        FROM public.rum_metric_readings(p_domain, p_start, p_end)
        WHERE metric_name = upper(p_metric)
          AND current_page IS NOT NULL
          AND current_page <> ''
    )
    SELECT
        connection_type,
        count(*) FILTER (WHERE device = 'desktop' AND rating = 'good') AS desktop_good,
        count(*) FILTER (WHERE device = 'desktop' AND rating = 'poor') AS desktop_poor,
        count(*) FILTER (WHERE device = 'desktop' AND rating = 'needs improvement') AS desktop_needs_improvement,
        count(*) FILTER (WHERE device = 'mobile' AND rating = 'good') AS mobile_good,
        count(*) FILTER (WHERE device = 'mobile' AND rating = 'poor') AS mobile_poor,
        count(*) FILTER (WHERE device = 'mobile' AND rating = 'needs improvement') AS mobile_needs_improvement,
        count(*) FILTER (WHERE device = 'tablet' AND rating = 'good') AS tablet_good,
        count(*) FILTER (WHERE device = 'tablet' AND rating = 'poor') AS tablet_poor,
        count(*) FILTER (WHERE device = 'tablet' AND rating = 'needs improvement') AS tablet_needs_improvement,
        count(*) FILTER (WHERE device = 'other' AND rating = 'good') AS other_good,
        count(*) FILTER (WHERE device = 'other' AND rating = 'poor') AS other_poor,
        count(*) FILTER (WHERE device = 'other' AND rating = 'needs improvement') AS other_needs_improvement
    FROM readings
    GROUP BY connection_type
    ORDER BY count(*) DESC NULLS LAST;
$$;


CREATE OR REPLACE FUNCTION public.get_web_vital_counts_by_url(
    p_domain text,
    p_metric text,
    p_limit integer DEFAULT 15
)
RETURNS TABLE (url text, good bigint, poor bigint, needs_improvement bigint)
LANGUAGE sql
STABLE
AS $$
    WITH base AS (
        SELECT *
        FROM public.rum_metric_readings(p_domain, '-infinity'::timestamptz, 'infinity'::timestamptz)
        WHERE current_page IS NOT NULL
          AND current_page <> ''
    ),
    top_urls AS (
        SELECT current_page AS url, count(DISTINCT row_id) AS visits
        FROM base
        GROUP BY current_page
        ORDER BY visits DESC
        LIMIT p_limit
    ),
    latest AS (
        SELECT DISTINCT ON (row_id)
            row_id,
            current_page AS url,
            rating
        FROM base
        WHERE metric_name = upper(p_metric)
        ORDER BY row_id, COALESCE(metric_value, 0) DESC
    )
    SELECT
        top_urls.url,
        count(latest.row_id) FILTER (WHERE latest.rating = 'good') AS good,
        count(latest.row_id) FILTER (WHERE latest.rating = 'poor') AS poor,
        count(latest.row_id) FILTER (WHERE latest.rating = 'needs improvement') AS needs_improvement
    FROM top_urls
    LEFT JOIN latest ON latest.url = top_urls.url
    GROUP BY top_urls.url
    ORDER BY count(latest.row_id) DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.get_web_vital_counts_by_url(
    p_domain text,
    p_metric text,
    p_device_type text DEFAULT NULL,
    p_start timestamptz DEFAULT (now() - '1 mon'::interval),
    p_end timestamptz DEFAULT now(),
    p_limit integer DEFAULT 15
)
RETURNS TABLE (url text, good bigint, poor bigint, needs_improvement bigint)
LANGUAGE sql
STABLE
AS $$
    WITH base AS (
        SELECT *
        FROM public.rum_metric_readings(p_domain, p_start, p_end)
        WHERE current_page IS NOT NULL
          AND current_page <> ''
          AND (p_device_type IS NULL OR device_type = p_device_type)
    ),
    top_urls AS (
        SELECT current_page AS url, count(DISTINCT row_id) AS visits
        FROM base
        GROUP BY current_page
        ORDER BY visits DESC
        LIMIT p_limit
    ),
    latest AS (
        SELECT DISTINCT ON (row_id)
            row_id,
            current_page AS url,
            rating
        FROM base
        WHERE metric_name = upper(p_metric)
        ORDER BY row_id, COALESCE(metric_value, 0) DESC
    )
    SELECT
        top_urls.url,
        count(latest.row_id) FILTER (WHERE latest.rating = 'good') AS good,
        count(latest.row_id) FILTER (WHERE latest.rating = 'poor') AS poor,
        count(latest.row_id) FILTER (WHERE latest.rating = 'needs improvement') AS needs_improvement
    FROM top_urls
    LEFT JOIN latest ON latest.url = top_urls.url
    GROUP BY top_urls.url
    ORDER BY count(latest.row_id) DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.analyze_fcp_by_device(
    domain_filter text DEFAULT NULL,
    time_range text DEFAULT '7days'
)
RETURNS TABLE (
    device_type text,
    connection_type text,
    occurrence_count bigint,
    avg_fcp_value numeric,
    min_fcp_value numeric,
    max_fcp_value numeric,
    p75_fcp_value numeric,
    p90_fcp_value numeric,
    p95_fcp_value numeric,
    good_count bigint,
    needs_improvement_count bigint,
    poor_count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    time_interval interval;
BEGIN
    CASE
        WHEN time_range = '24hours' THEN time_interval := interval '24 hours';
        WHEN time_range = '7days' THEN time_interval := interval '7 days';
        WHEN time_range = '30days' THEN time_interval := interval '30 days';
        WHEN time_range = '90days' THEN time_interval := interval '90 days';
        ELSE time_interval := interval '7 days';
    END CASE;

    RETURN QUERY
    WITH readings AS (
        SELECT
            device_type,
            CASE
                WHEN network_effective_type IS NOT NULL AND network_effective_type <> ''
                    THEN network_effective_type
                ELSE 'unknown'
            END AS connection_type,
            metric_value AS fcp_value,
            rating AS fcp_rating
        FROM public.rum_metric_readings(domain_filter, now() - time_interval, now())
        WHERE metric_name = 'FCP'
    )
    SELECT
        device_type,
        connection_type,
        count(*) AS occurrence_count,
        round(avg(fcp_value), 1) AS avg_fcp_value,
        round(min(fcp_value), 1) AS min_fcp_value,
        round(max(fcp_value), 1) AS max_fcp_value,
        round(percentile_cont(0.75) WITHIN GROUP (ORDER BY fcp_value)::numeric, 1) AS p75_fcp_value,
        round(percentile_cont(0.90) WITHIN GROUP (ORDER BY fcp_value)::numeric, 1) AS p90_fcp_value,
        round(percentile_cont(0.95) WITHIN GROUP (ORDER BY fcp_value)::numeric, 1) AS p95_fcp_value,
        count(*) FILTER (WHERE fcp_rating = 'good') AS good_count,
        count(*) FILTER (WHERE fcp_rating = 'needs improvement') AS needs_improvement_count,
        count(*) FILTER (WHERE fcp_rating = 'poor') AS poor_count
    FROM readings
    GROUP BY device_type, connection_type
    ORDER BY device_type, connection_type;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_rum_web_vitals_metrics(
    p_domain_name text,
    p_date_range text DEFAULT '30days'
)
RETURNS TABLE (
    report_date date,
    device_category text,
    fcp_samples bigint, fcp_avg numeric, fcp_min numeric, fcp_max numeric,
    fcp_p50 numeric, fcp_p75 numeric, fcp_p90 numeric, fcp_p95 numeric, fcp_p99 numeric,
    lcp_samples bigint, lcp_avg numeric, lcp_min numeric, lcp_max numeric,
    lcp_p50 numeric, lcp_p75 numeric, lcp_p90 numeric, lcp_p95 numeric, lcp_p99 numeric,
    cls_samples bigint, cls_avg numeric, cls_min numeric, cls_max numeric,
    cls_p50 numeric, cls_p75 numeric, cls_p90 numeric, cls_p95 numeric, cls_p99 numeric,
    inp_samples bigint, inp_avg numeric, inp_min numeric, inp_max numeric,
    inp_p50 numeric, inp_p75 numeric, inp_p90 numeric, inp_p95 numeric, inp_p99 numeric,
    ttfb_samples bigint, ttfb_avg numeric, ttfb_min numeric, ttfb_max numeric,
    ttfb_p50 numeric, ttfb_p75 numeric, ttfb_p90 numeric, ttfb_p95 numeric, ttfb_p99 numeric
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_interval interval;
    v_start_date date;
    v_end_date date := current_date;
    v_normalized_domain text;
BEGIN
    v_normalized_domain := CASE
        WHEN lower(p_domain_name) LIKE 'www.%' THEN substring(lower(p_domain_name) from 5)
        ELSE lower(p_domain_name)
    END;

    CASE lower(p_date_range)
        WHEN '24hours' THEN v_interval := interval '24 hours';
        WHEN '7days' THEN v_interval := interval '7 days';
        WHEN '30days' THEN v_interval := interval '30 days';
        WHEN '90days' THEN v_interval := interval '90 days';
        ELSE v_interval := interval '30 days';
    END CASE;

    v_start_date := v_end_date - v_interval;

    RETURN QUERY
    WITH readings AS (
        SELECT
            report_date,
            device_type,
            metric_name,
            metric_value
        FROM public.rum_metric_readings(
            v_normalized_domain,
            v_start_date::timestamptz,
            (v_end_date + 1)::timestamptz
        )
        WHERE current_page IS NOT NULL
    ),
    daily_metrics AS (
        SELECT
            report_date,
            device_type,
            metric_name,
            count(*) AS samples,
            round(avg(metric_value), 2) AS avg,
            round(min(metric_value), 2) AS min,
            round(max(metric_value), 2) AS max,
            round(percentile_cont(0.50) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p50,
            round(percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p75,
            round(percentile_cont(0.90) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p90,
            round(percentile_cont(0.95) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p95,
            round(percentile_cont(0.99) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p99
        FROM readings
        GROUP BY report_date, device_type, metric_name
    )

    SELECT
        daily_metrics.report_date,
        daily_metrics.device_type,
        max(daily_metrics.samples) FILTER (WHERE metric_name = 'FCP') AS fcp_samples,
        max(daily_metrics.avg) FILTER (WHERE metric_name = 'FCP') AS fcp_avg,
        max(daily_metrics.min) FILTER (WHERE metric_name = 'FCP') AS fcp_min,
        max(daily_metrics.max) FILTER (WHERE metric_name = 'FCP') AS fcp_max,
        max(daily_metrics.p50) FILTER (WHERE metric_name = 'FCP') AS fcp_p50,
        max(daily_metrics.p75) FILTER (WHERE metric_name = 'FCP') AS fcp_p75,
        max(daily_metrics.p90) FILTER (WHERE metric_name = 'FCP') AS fcp_p90,
        max(daily_metrics.p95) FILTER (WHERE metric_name = 'FCP') AS fcp_p95,
        max(daily_metrics.p99) FILTER (WHERE metric_name = 'FCP') AS fcp_p99,
        max(daily_metrics.samples) FILTER (WHERE metric_name = 'LCP') AS lcp_samples,
        max(daily_metrics.avg) FILTER (WHERE metric_name = 'LCP') AS lcp_avg,
        max(daily_metrics.min) FILTER (WHERE metric_name = 'LCP') AS lcp_min,
        max(daily_metrics.max) FILTER (WHERE metric_name = 'LCP') AS lcp_max,
        max(daily_metrics.p50) FILTER (WHERE metric_name = 'LCP') AS lcp_p50,
        max(daily_metrics.p75) FILTER (WHERE metric_name = 'LCP') AS lcp_p75,
        max(daily_metrics.p90) FILTER (WHERE metric_name = 'LCP') AS lcp_p90,
        max(daily_metrics.p95) FILTER (WHERE metric_name = 'LCP') AS lcp_p95,
        max(daily_metrics.p99) FILTER (WHERE metric_name = 'LCP') AS lcp_p99,
        max(daily_metrics.samples) FILTER (WHERE metric_name = 'CLS') AS cls_samples,
        max(daily_metrics.avg) FILTER (WHERE metric_name = 'CLS') AS cls_avg,
        max(daily_metrics.min) FILTER (WHERE metric_name = 'CLS') AS cls_min,
        max(daily_metrics.max) FILTER (WHERE metric_name = 'CLS') AS cls_max,
        max(daily_metrics.p50) FILTER (WHERE metric_name = 'CLS') AS cls_p50,
        max(daily_metrics.p75) FILTER (WHERE metric_name = 'CLS') AS cls_p75,
        max(daily_metrics.p90) FILTER (WHERE metric_name = 'CLS') AS cls_p90,
        max(daily_metrics.p95) FILTER (WHERE metric_name = 'CLS') AS cls_p95,
        max(daily_metrics.p99) FILTER (WHERE metric_name = 'CLS') AS cls_p99,
        max(daily_metrics.samples) FILTER (WHERE metric_name = 'INP') AS inp_samples,
        max(daily_metrics.avg) FILTER (WHERE metric_name = 'INP') AS inp_avg,
        max(daily_metrics.min) FILTER (WHERE metric_name = 'INP') AS inp_min,
        max(daily_metrics.max) FILTER (WHERE metric_name = 'INP') AS inp_max,
        max(daily_metrics.p50) FILTER (WHERE metric_name = 'INP') AS inp_p50,
        max(daily_metrics.p75) FILTER (WHERE metric_name = 'INP') AS inp_p75,
        max(daily_metrics.p90) FILTER (WHERE metric_name = 'INP') AS inp_p90,
        max(daily_metrics.p95) FILTER (WHERE metric_name = 'INP') AS inp_p95,
        max(daily_metrics.p99) FILTER (WHERE metric_name = 'INP') AS inp_p99,
        max(daily_metrics.samples) FILTER (WHERE metric_name = 'TTFB') AS ttfb_samples,
        max(daily_metrics.avg) FILTER (WHERE metric_name = 'TTFB') AS ttfb_avg,
        max(daily_metrics.min) FILTER (WHERE metric_name = 'TTFB') AS ttfb_min,
        max(daily_metrics.max) FILTER (WHERE metric_name = 'TTFB') AS ttfb_max,
        max(daily_metrics.p50) FILTER (WHERE metric_name = 'TTFB') AS ttfb_p50,
        max(daily_metrics.p75) FILTER (WHERE metric_name = 'TTFB') AS ttfb_p75,
        max(daily_metrics.p90) FILTER (WHERE metric_name = 'TTFB') AS ttfb_p90,
        max(daily_metrics.p95) FILTER (WHERE metric_name = 'TTFB') AS ttfb_p95,
        max(daily_metrics.p99) FILTER (WHERE metric_name = 'TTFB') AS ttfb_p99
    FROM daily_metrics
    GROUP BY daily_metrics.report_date, daily_metrics.device_type
    HAVING count(*) FILTER (WHERE metric_name IN ('FCP', 'LCP', 'CLS', 'INP', 'TTFB')) > 0
    ORDER BY daily_metrics.report_date DESC, daily_metrics.device_type;
END;
$$;

