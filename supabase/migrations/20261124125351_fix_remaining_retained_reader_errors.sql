-- Fix remaining retained reader errors found in production parity probes.
-- Relation names and historical numeric sentinels are handled explicitly.

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
LANGUAGE sql
STABLE
AS $$
    WITH lcp_candidates AS (
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
                WHEN lcp_candidates.device_type = 'mobile' THEN 'Mobile'
                WHEN lcp_candidates.device_type = 'desktop' THEN 'Desktop'
                WHEN lcp_candidates.device_type = 'tablet' THEN 'Tablet'
                ELSE 'Unknown'
            END AS device_type,
            lcp_candidates.target,
            lcp_candidates.current_page,
            max(lcp_candidates.asset_url) AS lcp_asset_url,
            max(lcp_candidates.font_family) AS font_family,
            max(COALESCE(lcp_candidates.font_weight, 'unknown')) AS font_weight,
            max(lcp_candidates.font_size) AS font_size,
            max(lcp_candidates.fetch_priority) AS loading_priority,
            max(lcp_candidates.device_memory_gb) AS device_memory_gb,
            count(*) AS occurrence_count,
            round(avg(lcp_candidates.lcp_value), 2) AS avg_lcp_value,
            round(percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp_candidates.lcp_value)::numeric, 2) AS p75_lcp_value,
            round(avg(lcp_candidates.transfer_bytes), 2) AS network_transfer_bytes,
            round(avg(lcp_candidates.decoded_bytes), 2) AS memory_usage_bytes,
            round(avg(lcp_candidates.candidate_ttfb_ms), 2) AS ttfb_ms,
            round(avg(lcp_candidates.resource_load_delay_ms), 2) AS avg_resource_load_delay,
            round(avg(lcp_candidates.resource_load_duration_ms), 2) AS avg_resource_load_duration,
            round(avg(lcp_candidates.element_render_delay_ms), 2) AS avg_element_render_delay,
            count(*) FILTER (WHERE lcp_candidates.lcp_rating = 'good') AS good_count,
            count(*) FILTER (WHERE lcp_candidates.lcp_rating = 'needs improvement') AS needs_improvement_count,
            count(*) FILTER (WHERE lcp_candidates.lcp_rating = 'poor') AS poor_count
        FROM lcp_candidates
        GROUP BY
            CASE
                WHEN lcp_candidates.device_type = 'mobile' THEN 'Mobile'
                WHEN lcp_candidates.device_type = 'desktop' THEN 'Desktop'
                WHEN lcp_candidates.device_type = 'tablet' THEN 'Tablet'
                ELSE 'Unknown'
            END,
            lcp_candidates.target,
            lcp_candidates.current_page
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
        blockers.render_blockers,
        aggregated.good_count,
        aggregated.needs_improvement_count,
        aggregated.poor_count
    FROM aggregated
    LEFT JOIN LATERAL (
        SELECT string_agg(blocker.value, E'\n') AS render_blockers
        FROM (
            SELECT DISTINCT lcp_candidates.render_blockers AS value
            FROM lcp_candidates
            WHERE lcp_candidates.target = aggregated.target
              AND lcp_candidates.current_page = aggregated.current_page
              AND lcp_candidates.render_blockers IS NOT NULL
        ) blocker
    ) blockers ON true
    WHERE aggregated.occurrence_count >= 5
    ORDER BY aggregated.p75_lcp_value DESC
    LIMIT 30;
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
LANGUAGE sql
STABLE
AS $$
    WITH shifts AS (
        SELECT * FROM public.rum_cls_shifts(p_domain_name)
    ),
    element_groups AS (
        SELECT
            shifts.current_page,
            shifts.device_type,
            jsonb_agg(DISTINCT element.value) AS involved_elems
        FROM shifts
        CROSS JOIN LATERAL jsonb_array_elements_text(shifts.involved_elements) element(value)
        WHERE element.value <> '(unknown)'
        GROUP BY shifts.current_page, shifts.device_type
    ),
    aggregated AS (
        SELECT
            shifts.current_page,
            shifts.device_type,
            mode() WITHIN GROUP (ORDER BY shifts.target) AS most_frequent_element,
            count(DISTINCT shifts.row_id) AS occ_count,
            round(avg(shifts.total_cls_value), 4) AS cls_score,
            round(avg(shifts.time_ms), 0) AS time_avg,
            mode() WITHIN GROUP (ORDER BY shifts.load_state) AS l_mode,
            jsonb_build_object(
                'areaDelta', round(avg(shifts.area_delta), 2),
                'distanceMoved', round(avg(shifts.distance_moved), 2),
                'viewportRatio', round(avg(shifts.viewport_ratio), 4)
            ) AS impact_json,
            jsonb_build_object(
                'current', jsonb_build_object(
                    'x', round(avg((shifts.current_rect->>'x')::numeric), 1),
                    'y', round(avg((shifts.current_rect->>'y')::numeric), 1),
                    'width', round(avg((shifts.current_rect->>'width')::numeric), 1),
                    'height', round(avg((shifts.current_rect->>'height')::numeric), 1)
                ),
                'previous', jsonb_build_object(
                    'x', round(avg((shifts.previous_rect->>'x')::numeric), 1),
                    'y', round(avg((shifts.previous_rect->>'y')::numeric), 1),
                    'width', round(avg((shifts.previous_rect->>'width')::numeric), 1),
                    'height', round(avg((shifts.previous_rect->>'height')::numeric), 1)
                )
            ) AS rect_json,
            jsonb_build_object(
                'dx', round(avg(shifts.dx), 2),
                'dy', round(avg(shifts.dy), 2)
            ) AS shift_json,
            element_groups.involved_elems
        FROM shifts
        LEFT JOIN element_groups
          ON element_groups.current_page = shifts.current_page
         AND element_groups.device_type = shifts.device_type
        GROUP BY shifts.current_page, shifts.device_type, element_groups.involved_elems
    )
    SELECT * FROM aggregated
    ORDER BY cls_score DESC, occ_count DESC
    LIMIT 100;
$$;

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
LANGUAGE sql
STABLE
AS $$
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
                WHERE jsonb_typeof(client) = 'object'
                  AND client->>'type' = 'client-info'
                LIMIT 1
            ), 'unknown'),
            (event->>'value')::numeric,
            CASE WHEN event->'attribution'->>'dnsLookup' ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN (event->'attribution'->>'dnsLookup')::numeric END,
            CASE WHEN event->'attribution'->>'tcpConnection' ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN (event->'attribution'->>'tcpConnection')::numeric END,
            CASE WHEN event->'attribution'->>'requestStart' ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN (event->'attribution'->>'requestStart')::numeric END,
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
            (
                SELECT CASE
                    WHEN client->'connection'->>'rtt' ~ '^-?[0-9]+(\.[0-9]+)?$'
                        THEN (client->'connection'->>'rtt')::numeric
                    ELSE NULL
                END
                FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client
                WHERE jsonb_typeof(client) = 'object'
                  AND client->>'type' = 'client-info'
                LIMIT 1
            ),
            (
                SELECT CASE
                    WHEN client->'connection'->>'downlink' ~ '^-?[0-9]+(\.[0-9]+)?$'
                        THEN (client->'connection'->>'downlink')::numeric
                    ELSE NULL
                END
                FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client
                WHERE jsonb_typeof(client) = 'object'
                  AND client->>'type' = 'client-info'
                LIMIT 1
            ),
            (
                SELECT geo->>'country'
                FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) geo
                WHERE jsonb_typeof(geo) = 'object'
                  AND geo->>'type' = 'geo-info'
                LIMIT 1
            ),
            (
                SELECT geo->>'provider'
                FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) geo
                WHERE jsonb_typeof(geo) = 'object'
                  AND geo->>'type' = 'geo-info'
                LIMIT 1
            )
        FROM public.rum_metrics rm
        CROSS JOIN LATERAL (
            SELECT DISTINCT ON (web_vital_doc->>'name') web_vital_doc AS event
            FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) web_vital_doc
            WHERE jsonb_typeof(web_vital_doc) = 'object'
              AND web_vital_doc->>'type' = 'web-vital'
              AND web_vital_doc->>'name' = 'TTFB'
            ORDER BY web_vital_doc->>'name', COALESCE(web_vital_doc->>'timestamp', '0')::numeric DESC
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
$$;
