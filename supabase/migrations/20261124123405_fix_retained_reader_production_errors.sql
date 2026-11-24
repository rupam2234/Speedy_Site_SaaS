-- Fix retained reader failures found by production parity probes.
-- The compile-time directive resolves PL/pgSQL output-name conflicts.
-- JSON expansion also skips historical entries that are not objects.

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
#variable_conflict use_column
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
#variable_conflict use_column
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

CREATE OR REPLACE FUNCTION public.analyze_lcp_by_device(domain_filter text)
RETURNS TABLE (
    device_type text,
    element_target text,
    page_url text,
    lcp_asset_url text,
    font_family text,
    font_weight text,
    font_size text,
    network_transfer_bytes numeric,
    memory_usage_bytes numeric,
    ttfb_ms numeric,
    loading_priority text,
    device_memory_gb text,
    occurrence_count bigint,
    avg_lcp_value numeric,
    p75_lcp_value numeric,
    avg_resource_load_delay numeric,
    avg_resource_load_duration numeric,
    avg_element_render_delay numeric,
    top_3_render_blockers text,
    good_count bigint,
    needs_improvement_count bigint,
    poor_count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    WITH candidates AS (
        SELECT *
        FROM public.rum_lcp_candidates(
            domain_filter,
            date_trunc('day', now()) - interval '7 days',
            now()
        )
        WHERE target IS NOT NULL
    ),
    aggregated AS (
        SELECT
            CASE
                WHEN device_type = 'mobile' THEN 'Mobile'
                WHEN device_type = 'desktop' THEN 'Desktop'
                WHEN device_type = 'tablet' THEN 'Tablet'
                ELSE 'Unknown'
            END AS device_type,
            target,
            current_page,
            max(asset_url) AS lcp_asset_url,
            max(font_family) AS font_family,
            max(COALESCE(font_weight, 'unknown')) AS font_weight,
            max(font_size) AS font_size,
            max(fetch_priority) AS loading_priority,
            max(device_memory_gb) AS device_memory_gb,
            count(*) AS occurrence_count,
            round(avg(lcp_value), 2) AS avg_lcp_value,
            round(percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp_value)::numeric, 2) AS p75_lcp_value,
            round(avg(transfer_bytes), 2) AS network_transfer_bytes,
            round(avg(decoded_bytes), 2) AS memory_usage_bytes,
            round(avg(candidate_ttfb_ms), 2) AS ttfb_ms,
            round(avg(resource_load_delay_ms), 2) AS avg_resource_load_delay,
            round(avg(resource_load_duration_ms), 2) AS avg_resource_load_duration,
            round(avg(element_render_delay_ms), 2) AS avg_element_render_delay,
            count(*) FILTER (WHERE lcp_rating = 'good') AS good_count,
            count(*) FILTER (WHERE lcp_rating = 'needs improvement') AS needs_improvement_count,
            count(*) FILTER (WHERE lcp_rating = 'poor') AS poor_count
        FROM candidates
        GROUP BY
            CASE
                WHEN device_type = 'mobile' THEN 'Mobile'
                WHEN device_type = 'desktop' THEN 'Desktop'
                WHEN device_type = 'tablet' THEN 'Tablet'
                ELSE 'Unknown'
            END,
            target,
            current_page
    )
    SELECT
        aggregated.device_type,
        aggregated.target,
        aggregated.current_page,
        aggregated.lcp_asset_url,
        aggregated.font_family,
        aggregated.font_weight,
        aggregated.font_size,
        aggregated.network_transfer_bytes,
        aggregated.memory_usage_bytes,
        aggregated.ttfb_ms,
        aggregated.loading_priority,
        aggregated.device_memory_gb,
        aggregated.occurrence_count,
        aggregated.avg_lcp_value,
        aggregated.p75_lcp_value,
        aggregated.avg_resource_load_delay,
        aggregated.avg_resource_load_duration,
        aggregated.avg_element_render_delay,
        candidates.render_blockers,
        aggregated.good_count,
        aggregated.needs_improvement_count,
        aggregated.poor_count
    FROM aggregated
    LEFT JOIN LATERAL (
        SELECT string_agg(value, E'\n') AS render_blockers
        FROM (
            SELECT DISTINCT candidate.render_blockers AS value
            FROM candidates
            WHERE candidates.target = aggregated.target
              AND candidates.current_page = aggregated.current_page
              AND candidates.render_blockers IS NOT NULL
        ) blockers
    ) blockers ON true
    WHERE aggregated.occurrence_count >= 5
    ORDER BY aggregated.p75_lcp_value DESC
    LIMIT 30;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_lcp_image_metrics(
    p_domain_name text DEFAULT NULL,
    p_start_date timestamptz DEFAULT NULL,
    p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
    period text,
    domain_name text,
    device_type text,
    image_url text,
    occurrence_count bigint,
    avg_lcp_ms numeric,
    min_lcp_ms numeric,
    max_lcp_ms numeric,
    p75_lcp_ms numeric,
    pct_exceeding_cwv numeric,
    avg_width numeric,
    avg_height numeric,
    pct_lazy numeric,
    avg_transfer_size numeric,
    avg_decoded_body_size numeric,
    avg_time_to_first_byte numeric,
    avg_resource_load_delay numeric,
    avg_element_render_delay numeric,
    avg_resource_load_duration numeric
)
LANGUAGE plpgsql
STABLE
AS $$
#variable_conflict use_column
DECLARE
    v_start_date timestamptz := coalesce(p_start_date, now() - interval '30 days');
    v_end_date timestamptz := coalesce(p_end_date, now());
    v_period text;
BEGIN
    IF v_start_date >= v_end_date THEN
        RAISE EXCEPTION 'p_start_date (%) must be before p_end_date (%)', v_start_date, v_end_date;
    END IF;

    v_period := to_char(v_start_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"')
        || ' to '
        || to_char(v_end_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"');

    RETURN QUERY
    WITH candidates AS (
        SELECT *
        FROM public.rum_lcp_candidates(p_domain_name, v_start_date, v_end_date)
        WHERE asset_url IS NOT NULL
          AND asset_url <> ''
    ),
    aggregated AS (
        SELECT
            domain_name,
            initcap(device_type) AS device_type,
            asset_url AS image_url,
            count(*) AS occurrence_count,
            round(avg(lcp_value), 2) AS avg_lcp_ms,
            min(lcp_value) AS min_lcp_ms,
            max(lcp_value) AS max_lcp_ms,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp_value)::numeric(10,2) AS p75_lcp_ms,
            round(100.0 * count(*) FILTER (WHERE lcp_value > 2500) / count(*), 2) AS pct_exceeding_cwv,
            round(avg(image_width), 2) AS avg_width,
            round(avg(image_height), 2) AS avg_height,
            round(100.0 * count(*) FILTER (WHERE is_lazy) / count(*), 2) AS pct_lazy,
            round(avg(transfer_bytes), 2) AS avg_transfer_size,
            round(avg(decoded_bytes), 2) AS avg_decoded_body_size,
            round(avg(candidate_ttfb_ms), 2) AS avg_time_to_first_byte,
            round(avg(resource_load_delay_ms), 2) AS avg_resource_load_delay,
            round(avg(element_render_delay_ms), 2) AS avg_element_render_delay,
            round(avg(resource_load_duration_ms), 2) AS avg_resource_load_duration
        FROM candidates
        GROUP BY domain_name, initcap(device_type), asset_url
    ),
    ranked AS (
        SELECT aggregated.*, row_number() OVER (
            PARTITION BY device_type ORDER BY occurrence_count DESC
        ) AS rank
        FROM aggregated
    )
    SELECT
        v_period,
        ranked.domain_name,
        ranked.device_type,
        ranked.image_url,
        ranked.occurrence_count,
        ranked.avg_lcp_ms,
        ranked.min_lcp_ms,
        ranked.max_lcp_ms,
        ranked.p75_lcp_ms,
        ranked.pct_exceeding_cwv,
        ranked.avg_width,
        ranked.avg_height,
        ranked.pct_lazy,
        ranked.avg_transfer_size,
        ranked.avg_decoded_body_size,
        ranked.avg_time_to_first_byte,
        ranked.avg_resource_load_delay,
        ranked.avg_element_render_delay,
        ranked.avg_resource_load_duration
    FROM ranked
    WHERE rank <= 10
    ORDER BY device_type, occurrence_count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.cls_elements(p_domain_name text)
RETURNS TABLE (
    current_page text,
    dev_type text,
    most_frequent_element text,
    occ_count bigint,
    cls_score numeric,
    time_avg numeric,
    l_mode text,
    impact_json jsonb,
    rect_json jsonb,
    shift_json jsonb,
    involved_elems jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    WITH shifts AS (
        SELECT * FROM public.rum_cls_shifts(p_domain_name)
    ),
    aggregated AS (
        SELECT
            current_page,
            device_type,
            mode() WITHIN GROUP (ORDER BY target) AS most_frequent_element,
            count(DISTINCT row_id) AS occ_count,
            round(avg(total_cls_value), 4) AS cls_score,
            round(avg(time_ms), 0) AS time_avg,
            mode() WITHIN GROUP (ORDER BY load_state) AS l_mode,
            jsonb_build_object(
                'areaDelta', round(avg(area_delta), 2),
                'distanceMoved', round(avg(distance_moved), 2),
                'viewportRatio', round(avg(viewport_ratio), 4)
            ) AS impact_json,
            jsonb_build_object(
                'current', jsonb_build_object(
                    'x', round(avg((current_rect->>'x')::numeric), 1),
                    'y', round(avg((current_rect->>'y')::numeric), 1),
                    'width', round(avg((current_rect->>'width')::numeric), 1),
                    'height', round(avg((current_rect->>'height')::numeric), 1)
                ),
                'previous', jsonb_build_object(
                    'x', round(avg((previous_rect->>'x')::numeric), 1),
                    'y', round(avg((previous_rect->>'y')::numeric), 1),
                    'width', round(avg((previous_rect->>'width')::numeric), 1),
                    'height', round(avg((previous_rect->>'height')::numeric), 1)
                )
            ) AS rect_json,
            jsonb_build_object(
                'dx', round(avg(dx), 2),
                'dy', round(avg(dy), 2)
            ) AS shift_json,
            (
                SELECT jsonb_agg(DISTINCT element)
                FROM jsonb_array_elements_text(shifts.involved_elements) element
                WHERE element <> '(unknown)'
            ) AS involved_elems
        FROM shifts
        GROUP BY current_page, device_type
    )
    SELECT * FROM aggregated
    ORDER BY cls_score DESC, occ_count DESC
    LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.page_performance_analysis(p_domain text DEFAULT NULL)
RETURNS TABLE (
    device_type text,
    current_page text,
    visit_count bigint,
    performance_group text,
    avg_lcp_ms numeric,
    avg_cls numeric,
    avg_inp_ms numeric,
    lcp_elements jsonb,
    cls_elements jsonb,
    inp_elements jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    WITH metric_rows AS (
        SELECT
            rm.id AS row_id,
            rm.current_page,
            COALESCE(rm.device_type, 'unknown') AS device_type,
            rm.lcp_ms::numeric AS lcp_value,
            rm.cls_value::numeric AS cls_value,
            rm.inp_ms::numeric AS inp_value,
            rm.diagnostic_evidence->'lcp'->0->>'target' AS lcp_target,
            rm.diagnostic_evidence->'cls_shifts'->0->>'target' AS cls_target,
            rm.diagnostic_evidence->'inp'->>'target' AS inp_target
        FROM public.rum_metrics rm
        WHERE rm.schema_version >= 2
          AND rm.created_at >= current_date - interval '7 days'
          AND (p_domain IS NULL OR rm.domain_name = p_domain)

        UNION ALL

        SELECT
            rm.id,
            rm.current_page,
            COALESCE((
                SELECT client->>'deviceType'
                FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client
                WHERE client->>'type' = 'client-info'
                LIMIT 1
            ), 'unknown'),
            (event->>'value')::numeric,
            CASE WHEN event->>'name' = 'CLS' THEN (event->>'value')::numeric END,
            CASE WHEN event->>'name' = 'INP' THEN (event->>'value')::numeric END,
            CASE WHEN event->>'name' = 'LCP' THEN event->'attribution'->>'target' END,
            CASE WHEN event->>'name' = 'CLS' THEN event->'attribution'->>'largestShiftTarget' END,
            CASE WHEN event->>'name' = 'INP' THEN event->'attribution'->>'target' END
        FROM public.rum_metrics rm
        CROSS JOIN LATERAL (
            SELECT DISTINCT ON (web_vital.web_vital_doc->>'name') web_vital.web_vital_doc AS event
            FROM (
                SELECT jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) AS web_vital_doc
            ) web_vital
            WHERE web_vital.web_vital_doc->>'type' = 'web-vital'
              AND web_vital.web_vital_doc->>'name' IN ('LCP', 'CLS', 'INP')
            ORDER BY web_vital.web_vital_doc->>'name', COALESCE(web_vital.web_vital_doc->>'timestamp', '0')::numeric DESC
        ) event
        WHERE (rm.schema_version IS NULL OR rm.schema_version < 2)
          AND rm.created_at >= current_date - interval '7 days'
          AND (p_domain IS NULL OR rm.domain_name = p_domain)
    ),
    page_stats AS (
        SELECT
            current_page,
            device_type,
            count(DISTINCT row_id) AS visits,
            avg(lcp_value) AS avg_lcp,
            avg(cls_value) AS avg_cls,
            avg(inp_value) AS avg_inp
        FROM metric_rows
        GROUP BY current_page, device_type
    ),
    top_pages AS (
        SELECT *
        FROM (
            SELECT page_stats.*, row_number() OVER (
                PARTITION BY device_type ORDER BY visits DESC
            ) AS page_rank
            FROM page_stats
        ) ranked
        WHERE page_rank <= 20
    ),

    targets AS (
        SELECT
            metric_rows.current_page,
            metric_rows.device_type,
            metric_name,
            target,
            count(*) AS count
        FROM metric_rows
        CROSS JOIN LATERAL (
            VALUES
                ('LCP', metric_rows.lcp_target),
                ('CLS', metric_rows.cls_target),
                ('INP', metric_rows.inp_target)
        ) target(metric_name, target)
        WHERE target IS NOT NULL
        GROUP BY metric_rows.current_page, metric_rows.device_type, metric_name, target
    ),
    top_elements AS (
        SELECT
            current_page,
            device_type,
            metric_name,
            jsonb_agg(jsonb_build_object('el', target, 'count', count) ORDER BY count DESC) AS elements
        FROM (
            SELECT targets.*, row_number() OVER (
                PARTITION BY current_page, device_type, metric_name ORDER BY count DESC
            ) AS element_rank
            FROM targets
        ) ranked
        WHERE element_rank <= 3
        GROUP BY current_page, device_type, metric_name
    )
    SELECT
        top_pages.device_type,
        top_pages.current_page,
        top_pages.visits::bigint,
        CASE
            WHEN top_pages.avg_lcp <= 2500 AND top_pages.avg_cls <= 0.1
                AND (top_pages.avg_inp <= 200 OR top_pages.avg_inp IS NULL) THEN 'Good'
            WHEN top_pages.avg_lcp > 4000 OR top_pages.avg_cls > 0.25 OR top_pages.avg_inp > 500 THEN 'Poor'
            ELSE 'Average'
        END AS performance_group,
        round(top_pages.avg_lcp, 0) AS avg_lcp_ms,
        round(top_pages.avg_cls, 3) AS avg_cls,
        round(top_pages.avg_inp, 0) AS avg_inp_ms,
        coalesce(lcp_top.elements, '[]'::jsonb) AS lcp_elements,
        coalesce(cls_top.elements, '[]'::jsonb) AS cls_elements,
        coalesce(inp_top.elements, '[]'::jsonb) AS inp_elements
    FROM top_pages
    LEFT JOIN top_elements lcp_top
      ON top_pages.current_page = lcp_top.current_page
     AND top_pages.device_type = lcp_top.device_type
     AND lcp_top.metric_name = 'LCP'
    LEFT JOIN top_elements cls_top
      ON top_pages.current_page = cls_top.current_page
     AND top_pages.device_type = cls_top.device_type
     AND cls_top.metric_name = 'CLS'
    LEFT JOIN top_elements inp_top
      ON top_pages.current_page = inp_top.current_page
     AND top_pages.device_type = inp_top.device_type
     AND inp_top.metric_name = 'INP'
    ORDER BY
        top_pages.device_type,
        CASE
            WHEN top_pages.avg_lcp > 4000 OR top_pages.avg_cls > 0.25 OR top_pages.avg_inp > 500 THEN 1
            WHEN top_pages.avg_lcp <= 2500 AND top_pages.avg_cls <= 0.1
                AND (top_pages.avg_inp <= 200 OR top_pages.avg_inp IS NULL) THEN 3
            ELSE 2
        END,
        top_pages.visits DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.rum_lcp_candidates(
    p_domain text,
    p_start timestamptz DEFAULT '-infinity'::timestamptz,
    p_end timestamptz DEFAULT 'infinity'::timestamptz
)
RETURNS TABLE (
    row_id bigint,
    domain_name text,
    current_page text,
    device_type text,
    device_memory_gb text,
    lcp_value numeric,
    lcp_rating text,
    target text,
    asset_url text,
    transfer_bytes numeric,
    decoded_bytes numeric,
    candidate_ttfb_ms numeric,
    image_width numeric,
    image_height numeric,
    is_lazy boolean,
    fetch_priority text,
    font_family text,
    font_weight text,
    font_size text,
    font_url text,
    font_transfer_bytes numeric,
    resource_load_delay_ms numeric,
    resource_load_duration_ms numeric,
    element_render_delay_ms numeric,
    render_blockers text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        rm.id,
        rm.domain_name,
        rm.current_page,
        COALESCE(rm.device_type, 'unknown') AS device_type,
        rm.device_memory_gb::text AS device_memory_gb,
        rm.lcp_ms::numeric AS lcp_value,
        REPLACE(COALESCE(rm.lcp_rating, ''), '-', ' ') AS lcp_rating,
        lcp.target AS target,
        lcp.url AS asset_url,
        lcp.transfer_bytes AS transfer_bytes,
        lcp.decoded_bytes AS decoded_bytes,
        lcp.candidate_ttfb_ms AS candidate_ttfb_ms,
        lcp.image_width AS image_width,
        lcp.image_height AS image_height,
        lcp.is_lazy AS is_lazy,
        lcp.fetch_priority AS fetch_priority,
        lcp.font->>'family' AS font_family,
        lcp.font->>'weight' AS font_weight,
        lcp.font->>'size' AS font_size,
        lcp.font->>'url' AS font_url,
        (lcp.font->>'transfer_bytes')::numeric AS font_transfer_bytes,
        lcp.resource_load_delay_ms AS resource_load_delay_ms,
        lcp.resource_load_duration_ms AS resource_load_duration_ms,
        lcp.element_render_delay_ms AS element_render_delay_ms,
        (
            SELECT string_agg(blocker.url || ' (' || blocker.finish_time_ms || 'ms)', E'\n' ORDER BY blocker.finish_time_ms DESC)
            FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(rm.diagnostic_evidence->'render_blockers') = 'array'
                    THEN rm.diagnostic_evidence->'render_blockers' ELSE '[]'::jsonb END
            ) blocker_doc
            CROSS JOIN LATERAL jsonb_to_recordset(
                CASE WHEN jsonb_typeof(blocker_doc) = 'object'
                    THEN jsonb_build_array(blocker_doc) ELSE '[]'::jsonb END
            ) blocker(url text, finish_time_ms numeric)
        ) AS render_blockers
    FROM public.rum_metrics rm
    CROSS JOIN LATERAL (
        SELECT candidate.*
        FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(rm.diagnostic_evidence->'lcp') = 'array'
                THEN rm.diagnostic_evidence->'lcp' ELSE '[]'::jsonb END
        ) candidate_doc
        CROSS JOIN LATERAL jsonb_to_recordset(
            CASE WHEN jsonb_typeof(candidate_doc) = 'object'
                THEN jsonb_build_array(candidate_doc) ELSE '[]'::jsonb END
        ) candidate(
            target text,
            url text,
            transfer_bytes numeric,
            decoded_bytes numeric,
            candidate_ttfb_ms numeric,
            image_width numeric,
            image_height numeric,
            is_lazy boolean,
            fetch_priority text,
            font jsonb,
            resource_load_delay_ms numeric,
            resource_load_duration_ms numeric,
            element_render_delay_ms numeric
        )
        WHERE candidate.target IS NOT NULL
        LIMIT 1
    ) lcp
    WHERE (p_domain IS NULL OR rm.domain_name = p_domain)
      AND rm.schema_version >= 2
      AND rm.created_at >= p_start
      AND rm.created_at < p_end

    UNION ALL


    SELECT
        rm.id,
        rm.domain_name,
        rm.current_page,
        COALESCE((
            SELECT client->>'deviceType'
            FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client
            WHERE jsonb_typeof(client) = 'object' AND client->>'type' = 'client-info'
            LIMIT 1
        ), 'unknown') AS device_type,
        (
            SELECT client->>'deviceMemory'
            FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client
            WHERE jsonb_typeof(client) = 'object' AND client->>'type' = 'client-info'
            LIMIT 1
        ) AS device_memory_gb,
        (event->>'value')::numeric AS lcp_value,
        REPLACE(COALESCE(event->>'rating', ''), '-', ' ') AS lcp_rating,
        event->'attribution'->>'target' AS target,
        COALESCE(
            event->'attribution'->>'url',
            event->'attribution'->'font'->'fontData'->0->>'url'
        ) AS asset_url,
        COALESCE(
            (event->'attribution'->>'transferSize')::numeric,
            (event->'attribution'->'font'->'fontData'->0->>'transferSize')::numeric
        ) AS transfer_bytes,
        (event->'attribution'->>'decodedBodySize')::numeric AS decoded_bytes,
        (event->'attribution'->>'timeToFirstByte')::numeric AS candidate_ttfb_ms,
        (event->'attribution'->>'width')::numeric AS image_width,
        (event->'attribution'->>'height')::numeric AS image_height,
        (event->'attribution'->>'isLazy')::boolean AS is_lazy,
        event->'attribution'->>'fetchPriority' AS fetch_priority,
        event->'attribution'->'font'->>'family' AS font_family,
        event->'attribution'->'font'->>'weight' AS font_weight,
        event->'attribution'->'font'->>'size' AS font_size,
        event->'attribution'->'font'->'fontData'->0->>'url' AS font_url,
        (event->'attribution'->'font'->'fontData'->0->>'transferSize')::numeric AS font_transfer_bytes,
        (event->'attribution'->>'resourceLoadDelay')::numeric AS resource_load_delay_ms,
        (event->'attribution'->>'resourceLoadDuration')::numeric AS resource_load_duration_ms,
        (event->'attribution'->>'elementRenderDelay')::numeric AS element_render_delay_ms,
        (
            SELECT string_agg(nested.url || ' (' || regexp_replace(nested.finish_time, 'ms$', '') || 'ms)', E'\n' ORDER BY regexp_replace(nested.finish_time, 'ms$', '')::numeric DESC)
            FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) top_event
            CROSS JOIN LATERAL jsonb_array_elements(
                CASE WHEN jsonb_typeof(top_event) = 'array' THEN top_event ELSE '[]'::jsonb END
            ) nested_doc
            CROSS JOIN LATERAL jsonb_to_recordset(
                CASE WHEN jsonb_typeof(nested_doc) = 'object'
                    THEN jsonb_build_array(nested_doc) ELSE '[]'::jsonb END
            ) nested(url text, finish_time text, type text)
            WHERE nested.type = 'render-blocking-scripts'
        ) AS render_blockers
    FROM public.rum_metrics rm
    CROSS JOIN LATERAL (
        SELECT DISTINCT ON (web_vital_doc->>'name')
            web_vital_doc AS event
        FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) web_vital_doc
        WHERE jsonb_typeof(web_vital_doc) = 'object'
          AND web_vital_doc->>'type' = 'web-vital'
          AND web_vital_doc->>'name' = 'LCP'
        ORDER BY web_vital_doc->>'name', COALESCE(web_vital_doc->>'timestamp', '0')::numeric DESC
    ) lcp
    WHERE (p_domain IS NULL OR rm.domain_name = p_domain)
      AND (rm.schema_version IS NULL OR rm.schema_version < 2)
      AND rm.created_at >= p_start
      AND rm.created_at < p_end
      AND lcp.event->'attribution'->>'target' IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.rum_lcp_candidates(text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rum_lcp_candidates(text, timestamptz, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.rum_lcp_candidates(text, timestamptz, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rum_lcp_candidates(text, timestamptz, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.ttfb_contributors(p_domain text)
RETURNS TABLE (
    page_path text,
    device_type text,
    occurrence_count bigint,
    p75_ttfb numeric,
    p75_dns numeric,
    p75_tcp numeric,
    p75_server numeric,
    origin_hit_rate numeric,
    avg_rtt numeric,
    avg_downlink numeric,
    top_country text,
    top_isp text
)
LANGUAGE plpgsql
STABLE
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    WITH base AS (
        SELECT
            rm.current_page AS page_path,
            rm.device_type,
            rm.ttfb_ms::numeric AS ttfb_ms,
            rm.dns_ms::numeric AS ttfb_dns,
            rm.connect_ms::numeric AS ttfb_tcp,
            rm.backend_response_ms::numeric AS ttfb_server,
            rm.origin_hit,
            rm.network_rtt_ms::numeric AS rtt,
            rm.network_downlink_mbps::numeric AS downlink,
            rm.country,
            rm.provider AS isp
        FROM public.rum_metrics rm
        WHERE rm.domain_name = p_domain
          AND rm.schema_version >= 2
          AND rm.created_at >= current_date - interval '7 days'

        UNION ALL

        SELECT
            rm.current_page,
            COALESCE((
                SELECT client->>'deviceType'
                FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client
                WHERE client->>'type' = 'client-info'
                LIMIT 1
            ), 'unknown'),
            (event->>'value')::numeric,
            (event->'attribution'->>'dnsLookup')::numeric,
            (event->'attribution'->>'tcpConnection')::numeric,
            (event->'attribution'->>'requestStart')::numeric,
            (
                SELECT CASE lower(origin->>'originHit')
                    WHEN 'true' THEN true
                    WHEN '1' THEN true
                    WHEN 'yes' THEN true
                    WHEN 'false' THEN false
                    WHEN '0' THEN false
                    WHEN 'no' THEN false
                    ELSE NULL
                END
                FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) origin
                WHERE jsonb_typeof(origin) = 'object'
                  AND origin->>'type' = 'origin-info'
                LIMIT 1
            ),
            (SELECT client->'connection'->>'rtt'::numeric FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client WHERE client->>'type' = 'client-info' LIMIT 1),
            (SELECT client->'connection'->>'downlink'::numeric FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client WHERE client->>'type' = 'client-info' LIMIT 1),
            (SELECT geo->>'country' FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) geo WHERE geo->>'type' = 'geo-info' LIMIT 1),
            (SELECT geo->>'provider' FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) geo WHERE geo->>'type' = 'geo-info' LIMIT 1)
        FROM public.rum_metrics rm
        CROSS JOIN LATERAL (
            SELECT DISTINCT ON (web_vital.web_vital_doc->>'name') web_vital.web_vital_doc AS event
            FROM (
                SELECT jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) AS web_vital_doc
            ) web_vital
            WHERE web_vital.web_vital_doc->>'type' = 'web-vital' AND web_vital.web_vital_doc->>'name' = 'TTFB'
            ORDER BY web_vital.web_vital_doc->>'name', COALESCE(web_vital.web_vital_doc->>'timestamp', '0')::numeric DESC
        ) event
        WHERE rm.domain_name = p_domain
          AND (rm.schema_version IS NULL OR rm.schema_version < 2)
          AND rm.created_at >= current_date - interval '7 days'
    )
    SELECT
        page_path,
        device_type,
        count(*) AS occurrence_count,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY ttfb_ms)::numeric(10,2) AS p75_ttfb,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY ttfb_dns)::numeric(10,2) AS p75_dns,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY ttfb_tcp)::numeric(10,2) AS p75_tcp,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY ttfb_server)::numeric(10,2) AS p75_server,
        round(100.0 * count(*) FILTER (WHERE origin_hit = true) / nullif(count(*), 0), 1) AS origin_hit_rate,
        round(avg(rtt), 0) AS avg_rtt,
        round(avg(downlink), 1) AS avg_downlink,
        mode() WITHIN GROUP (ORDER BY country) AS top_country,
        mode() WITHIN GROUP (ORDER BY isp) AS top_isp
    FROM base
    WHERE ttfb_ms IS NOT NULL
    GROUP BY page_path, device_type
    HAVING count(*) >= 2
       AND percentile_cont(0.75) WITHIN GROUP (ORDER BY ttfb_ms) > 800
    ORDER BY p75_ttfb DESC;
END;
$$;
