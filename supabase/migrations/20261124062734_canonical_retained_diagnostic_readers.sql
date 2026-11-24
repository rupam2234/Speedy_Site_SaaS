-- Canonical v2 reader cutover for retained CLS, INP, TTFB, and page readers.

CREATE OR REPLACE FUNCTION public.rum_cls_shifts(p_domain text)
RETURNS TABLE (
    row_id bigint,
    current_page text,
    device_type text,
    total_cls_value numeric,
    target text,
    involved_elements jsonb,
    value numeric,
    viewport_ratio numeric,
    time_ms numeric,
    load_state text,
    area_delta numeric,
    distance_moved numeric,
    dx numeric,
    dy numeric,
    previous_rect jsonb,
    current_rect jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        rm.id,
        rm.current_page,
        COALESCE(rm.device_type, 'unknown') AS device_type,
        rm.cls_value::numeric AS total_cls_value,
        shift.shift_doc->>'target' AS target,
        shift.shift_doc->'involved_elements' AS involved_elements,
        (shift.shift_doc->>'value')::numeric AS value,
        (shift.shift_doc->>'viewport_ratio')::numeric AS viewport_ratio,
        (shift.shift_doc->>'time_ms')::numeric AS time_ms,
        shift.shift_doc->>'load_state' AS load_state,
        (shift.shift_doc->>'area_delta')::numeric AS area_delta,
        (shift.shift_doc->>'distance_moved')::numeric AS distance_moved,
        (shift.shift_doc->>'dx')::numeric AS dx,
        (shift.shift_doc->>'dy')::numeric AS dy,
        shift.shift_doc->'previous_rect' AS previous_rect,
        shift.shift_doc->'current_rect' AS current_rect
    FROM public.rum_metrics rm
    CROSS JOIN LATERAL (
        SELECT jsonb_array_elements(COALESCE(rm.diagnostic_evidence->'cls_shifts', '[]'::jsonb)) AS shift_doc
    ) shift
    WHERE (p_domain IS NULL OR rm.domain_name = p_domain)
      AND rm.schema_version >= 2
      AND rm.created_at >= now() - interval '7 days'
      AND rm.cls_value > 0.001

    UNION ALL

    SELECT
        rm.id,
        rm.current_page,
        COALESCE((
            SELECT client->>'deviceType'
            FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client
            WHERE client->>'type' = 'client-info'
            LIMIT 1
        ), 'unknown') AS device_type,
        (event->>'value')::numeric AS total_cls_value,
        COALESCE(shift.shift_doc->>'element', event->'attribution'->>'largestShiftTarget') AS target,
        COALESCE(shift.shift_doc->'elements', '[]'::jsonb) AS involved_elements,
        (shift.shift_doc->>'value')::numeric AS value,
        (shift.shift_doc->'impact'->>'viewportRatio')::numeric AS viewport_ratio,
        (shift.shift_doc->>'time')::numeric AS time_ms,
        event->'attribution'->>'loadState' AS load_state,
        (shift.shift_doc->'impact'->>'areaDelta')::numeric AS area_delta,
        (shift.shift_doc->'impact'->>'distanceMoved')::numeric AS distance_moved,
        (shift.shift_doc->'shift'->>'dx')::numeric AS dx,
        (shift.shift_doc->'shift'->>'dy')::numeric AS dy,
        shift.shift_doc->'rect'->'previous' AS previous_rect,
        shift.shift_doc->'rect'->'current' AS current_rect
    FROM public.rum_metrics rm
    CROSS JOIN LATERAL (
        SELECT DISTINCT ON (web_vital.web_vital_doc->>'name') web_vital.web_vital_doc AS event
        FROM (
            SELECT jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) AS web_vital_doc
        ) web_vital
        WHERE web_vital.web_vital_doc->>'type' = 'web-vital' AND web_vital.web_vital_doc->>'name' = 'CLS'
        ORDER BY web_vital.web_vital_doc->>'name', COALESCE(web_vital.web_vital_doc->>'timestamp', '0')::numeric DESC
    ) event
    CROSS JOIN LATERAL (
        SELECT jsonb_array_elements(COALESCE(event->'attribution'->'shifts', '[]'::jsonb)) AS shift_doc
    ) shift
    WHERE (p_domain IS NULL OR rm.domain_name = p_domain)
      AND (rm.schema_version IS NULL OR rm.schema_version < 2)
      AND rm.created_at >= now() - interval '7 days'
      AND (event->>'value')::numeric > 0.001;
$$;

REVOKE ALL ON FUNCTION public.rum_cls_shifts(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rum_cls_shifts(text) FROM anon;
REVOKE ALL ON FUNCTION public.rum_cls_shifts(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rum_cls_shifts(text) TO service_role;


CREATE OR REPLACE FUNCTION public.rum_inp_interactions(p_domain text)
RETURNS TABLE (
    row_id bigint,
    current_page text,
    device_type text,
    created_at timestamptz,
    inp_value numeric,
    rating text,
    interaction_type text,
    target_element text,
    input_delay numeric,
    processing_duration numeric,
    presentation_delay numeric,
    responsible_scripts text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        rm.id,
        rm.current_page,
        COALESCE(rm.device_type, 'unknown') AS device_type,
        rm.created_at,
        rm.inp_ms::numeric AS inp_value,
        REPLACE(COALESCE(rm.inp_rating, ''), '-', ' ') AS rating,
        rm.diagnostic_evidence->'inp'->>'event_type' AS interaction_type,
        rm.diagnostic_evidence->'inp'->>'target' AS target_element,
        (rm.diagnostic_evidence->'inp'->>'input_delay_ms')::numeric AS input_delay,
        (rm.diagnostic_evidence->'inp'->>'processing_ms')::numeric AS processing_duration,
        (rm.diagnostic_evidence->'inp'->>'presentation_ms')::numeric AS presentation_delay,
        (
            SELECT string_agg(script->>'url', ', ')
            FROM jsonb_array_elements(COALESCE(rm.diagnostic_evidence->'inp'->'scripts', '[]'::jsonb)) script
        ) AS responsible_scripts
    FROM public.rum_metrics rm
    WHERE (p_domain IS NULL OR rm.domain_name = p_domain)
      AND rm.schema_version >= 2
      AND rm.diagnostic_evidence->'inp' IS NOT NULL

    UNION ALL

    SELECT
        rm.id,
        rm.current_page,
        COALESCE((
            SELECT client->>'deviceType'
            FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client
            WHERE client->>'type' = 'client-info'
            LIMIT 1
        ), 'unknown') AS device_type,
        rm.created_at,
        (event->>'value')::numeric AS inp_value,
        REPLACE(COALESCE(event->>'rating', ''), '-', ' ') AS rating,
        event->'attribution'->>'eventType' AS interaction_type,
        event->'attribution'->>'target' AS target_element,
        (event->'attribution'->>'inputDelay')::numeric AS input_delay,
        (event->'attribution'->>'processingDuration')::numeric AS processing_duration,
        (event->'attribution'->>'presentationDelay')::numeric AS presentation_delay,
        (
            SELECT string_agg(
                script->>'sourceURL',
                ', '
            )
            FROM jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(event->'attribution'->'loaf'->'scripts') = 'array'
                        THEN event->'attribution'->'loaf'->'scripts'
                    ELSE '[]'::jsonb
                END
            ) script
            WHERE script->>'sourceURL' IS NOT NULL
        ) AS responsible_scripts
    FROM public.rum_metrics rm
    CROSS JOIN LATERAL (
        SELECT DISTINCT ON (web_vital.web_vital_doc->>'name') web_vital.web_vital_doc AS event
        FROM (
            SELECT jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) AS web_vital_doc
        ) web_vital
        WHERE web_vital.web_vital_doc->>'type' = 'web-vital' AND web_vital.web_vital_doc->>'name' = 'INP'
        ORDER BY web_vital.web_vital_doc->>'name', COALESCE(web_vital.web_vital_doc->>'timestamp', '0')::numeric DESC
    ) event
    WHERE (p_domain IS NULL OR rm.domain_name = p_domain)
      AND (rm.schema_version IS NULL OR rm.schema_version < 2)
      AND event->'attribution' IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.rum_inp_interactions(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rum_inp_interactions(text) FROM anon;
REVOKE ALL ON FUNCTION public.rum_inp_interactions(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rum_inp_interactions(text) TO service_role;


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

CREATE OR REPLACE FUNCTION public.inp_elements(p_domain_name text)
RETURNS TABLE (
    device text,
    current_page text,
    inp_value numeric,
    rating text,
    interaction_type text,
    target_element text,
    input_delay numeric,
    processing_duration numeric,
    presentation_delay numeric,
    responsible_scripts text,
    created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
    WITH interactions AS (
        SELECT *
        FROM public.rum_inp_interactions(p_domain_name)
        WHERE inp_value IS NOT NULL
    ),
    ranked AS (
        SELECT interactions.*, row_number() OVER (
            PARTITION BY device_type ORDER BY created_at DESC
        ) AS rank
        FROM interactions
    )
    SELECT
        device_type AS device,
        current_page,
        inp_value,
        rating,
        interaction_type,
        target_element,
        round(input_delay, 2) AS input_delay,
        round(processing_duration, 2) AS processing_duration,
        round(presentation_delay, 2) AS presentation_delay,
        responsible_scripts,
        created_at
    FROM ranked
    WHERE rank <= 20
    ORDER BY device_type, created_at DESC;
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
LANGUAGE plpgsql
STABLE
AS $$
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
            (SELECT origin->>'originHit'::boolean FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) origin WHERE origin->>'type' = 'origin-info' LIMIT 1),
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

