-- Canonical v2 reader cutover for retained LCP element readers.
-- One normalized LCP candidate is returned per pageview row.

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
            FROM jsonb_to_recordset(COALESCE(rm.diagnostic_evidence->'render_blockers', '[]'::jsonb))
                AS blocker(url text, finish_time_ms numeric)
        ) AS render_blockers
    FROM public.rum_metrics rm
    CROSS JOIN LATERAL (
        SELECT *
        FROM jsonb_to_recordset(COALESCE(rm.diagnostic_evidence->'lcp', '[]'::jsonb))
            AS candidate(
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
            WHERE client->>'type' = 'client-info'
            LIMIT 1
        ), 'unknown') AS device_type,
        (
            SELECT client->>'deviceMemory'
            FROM jsonb_array_elements(COALESCE(rm.events, '[]'::jsonb)) client
            WHERE client->>'type' = 'client-info'
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
            FROM jsonb_to_recordset(COALESCE(rm.events, '[]'::jsonb))
                AS top_event(nested_array jsonb)
            CROSS JOIN LATERAL jsonb_to_recordset(
                CASE WHEN jsonb_typeof(top_event.nested_array) = 'array' THEN top_event.nested_array ELSE '[]'::jsonb END
            ) AS nested(url text, finish_time text, type text)
            WHERE nested.type = 'render-blocking-scripts'
        ) AS render_blockers
    FROM public.rum_metrics rm
    CROSS JOIN LATERAL (
        SELECT DISTINCT ON (web_vital.name)
            jsonb_build_object(
                'name', web_vital.name,
                'value', web_vital.value,
                'rating', web_vital.rating,
                'timestamp', web_vital.timestamp,
                'attribution', web_vital.attribution
            ) AS event
        FROM jsonb_to_recordset(COALESCE(rm.events, '[]'::jsonb))
            AS web_vital(
                type text,
                name text,
                value numeric,
                rating text,
                timestamp numeric,
                attribution jsonb
            )
        WHERE web_vital.type = 'web-vital'
          AND web_vital.name = 'LCP'
        ORDER BY web_vital.name, COALESCE(web_vital.timestamp, 0) DESC
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


CREATE OR REPLACE FUNCTION public.font_analysis(p_domain text)
RETURNS TABLE (
    device text,
    font_family text,
    font_weight text,
    font_file_url text,
    avg_resource_size numeric,
    major_pages text[],
    total_occurrences bigint,
    avg_lcp numeric,
    avg_render_delay numeric,
    poor_lcp_percentage numeric
)
LANGUAGE sql
STABLE
AS $$
    WITH candidates AS (
        SELECT *
        FROM public.rum_lcp_candidates(p_domain)
        WHERE font_family IS NOT NULL
          AND font_family <> ''
    ),
    page_ranking AS (
        SELECT
            device_type,
            font_family,
            COALESCE(font_weight, 'unknown') AS font_weight,
            current_page,
            count(*) AS frequency
        FROM candidates
        GROUP BY device_type, font_family, font_weight, current_page
    ),
    top_pages AS (
        SELECT
            device_type,
            font_family,
            font_weight,
            (array_agg(current_page ORDER BY frequency DESC))[1:5] AS major_pages
        FROM page_ranking
        GROUP BY device_type, font_family, font_weight
    )
    SELECT
        candidates.device_type AS device,
        candidates.font_family,
        COALESCE(candidates.font_weight, 'unknown') AS font_weight,
        max(candidates.font_url) AS font_file_url,
        round(avg(candidates.font_transfer_bytes), 2) AS avg_resource_size,
        top_pages.major_pages,
        count(*) AS total_occurrences,
        round(avg(candidates.lcp_value), 2) AS avg_lcp,
        round(avg(candidates.element_render_delay_ms), 2) AS avg_render_delay,
        round(100.0 * count(*) FILTER (WHERE candidates.lcp_rating = 'poor') / count(*), 2) AS poor_lcp_percentage
    FROM candidates
    JOIN top_pages
      ON candidates.device_type = top_pages.device_type
      AND candidates.font_family = top_pages.font_family
      AND COALESCE(candidates.font_weight, 'unknown') = top_pages.font_weight
    GROUP BY candidates.device_type, candidates.font_family, COALESCE(candidates.font_weight, 'unknown'), top_pages.major_pages
    ORDER BY 9 DESC;
$$;

