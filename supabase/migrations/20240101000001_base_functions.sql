-- ============================================================================
-- Base SQL functions missing from pre-2025 schema (parity with production)
-- Includes all valid RPCs, analytics functions, email/domain helpers, and
-- maintenance functions present in production. Excludes dead legacy functions
-- referencing dropped tables (daily_web_metrics_summary, pageperf_data,
-- users, subscriptions, plan_metadata) and Supabase's rls_auto_enable.
-- Idempotent via CREATE OR REPLACE FUNCTION.
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."analyze_fcp_by_device"("domain_filter" "text" DEFAULT NULL::"text", "time_range" "text" DEFAULT '7days'::"text") RETURNS TABLE("device_type" "text", "connection_type" "text", "occurrence_count" bigint, "avg_fcp_value" numeric, "min_fcp_value" numeric, "max_fcp_value" numeric, "p75_fcp_value" numeric, "p90_fcp_value" numeric, "p95_fcp_value" numeric, "good_count" bigint, "needs_improvement_count" bigint, "poor_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  time_interval INTERVAL;
BEGIN
  -- Convert time_range parameter to an interval
  CASE
    WHEN time_range = '24hours' THEN time_interval := INTERVAL '24 hours';
    WHEN time_range = '7days' THEN time_interval := INTERVAL '7 days';
    WHEN time_range = '30days' THEN time_interval := INTERVAL '30 days';
    WHEN time_range = '90days' THEN time_interval := INTERVAL '90 days';
    ELSE time_interval := INTERVAL '7 days'; -- Default to 7 days
  END CASE;

  RETURN QUERY
  WITH domain_sessions AS (
    -- Get all session IDs for the specified domain
    SELECT DISTINCT event->>'sessionId' AS session_id
    FROM public.rum_metrics rm,
         jsonb_array_elements(events) AS event
    WHERE rm.created_at >= NOW() - time_interval
      AND (
        -- Match on domain_name column
        domain_filter IS NULL
        OR rm.domain_name ILIKE '%' || domain_filter || '%'
        OR domain_filter ILIKE '%' || rm.domain_name || '%'
        -- Match on siteDomain in events
        OR event->>'siteDomain' ILIKE '%' || domain_filter || '%'
        OR domain_filter ILIKE '%' || (event->>'siteDomain') || '%'
      )
  ),
  client_info AS (
    -- Get device type and connection info for each session with better extraction
    SELECT 
      event->>'sessionId' AS session_id,
      COALESCE(event->>'deviceType', 'unknown') AS device_type,
      CASE
        -- Try to get connection type from connection.effectiveType
        WHEN event->'connection'->>'effectiveType' IS NOT NULL AND event->'connection'->>'effectiveType' != '' THEN 
          event->'connection'->>'effectiveType'
        -- Try to get connection type from connection.type
        WHEN event->'connection'->>'type' IS NOT NULL AND event->'connection'->>'type' != '' THEN 
          event->'connection'->>'type'
        -- Try to infer from downlink if available
        WHEN (event->'connection'->>'downlink')::NUMERIC > 5 THEN '4g+'
        WHEN (event->'connection'->>'downlink')::NUMERIC > 2 THEN '4g'
        WHEN (event->'connection'->>'downlink')::NUMERIC > 0.5 THEN '3g'
        WHEN (event->'connection'->>'downlink')::NUMERIC > 0 THEN '2g'
        ELSE 'unknown'
      END AS connection_type
    FROM 
      public.rum_metrics rm,
      jsonb_array_elements(events) AS event
    WHERE 
      event->>'type' = 'client-info'
      AND event->>'sessionId' IN (SELECT session_id FROM domain_sessions)
      AND rm.created_at >= NOW() - time_interval
  ),
  fcp_data AS (
    -- Get FCP data for each session
    SELECT 
      event->>'sessionId' AS session_id,
      (event->>'value')::NUMERIC AS fcp_value,
      event->>'rating' AS fcp_rating
    FROM 
      public.rum_metrics rm,
      jsonb_array_elements(events) AS event
    WHERE 
      event->>'type' = 'web-vital'
      AND event->>'name' = 'FCP'
      AND event->>'sessionId' IN (SELECT session_id FROM domain_sessions)
      AND rm.created_at >= NOW() - time_interval
  ),
  fcp_percentiles AS (
    -- Calculate percentiles for each device and connection type
    SELECT
      c.device_type,
      c.connection_type,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY d.fcp_value) AS p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY d.fcp_value) AS p90,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY d.fcp_value) AS p95
    FROM
      fcp_data d
    JOIN
      client_info c ON d.session_id = c.session_id
    GROUP BY
      c.device_type,
      c.connection_type
  )
  SELECT 
    COALESCE(c.device_type, 'unknown') AS device_type,
    COALESCE(c.connection_type, 'unknown') AS connection_type,
    COUNT(*) AS occurrence_count,
    -- Use CAST to ensure proper numeric rounding
    CAST(AVG(d.fcp_value) AS NUMERIC(10,1)) AS avg_fcp_value,
    CAST(MIN(d.fcp_value) AS NUMERIC(10,1)) AS min_fcp_value,
    CAST(MAX(d.fcp_value) AS NUMERIC(10,1)) AS max_fcp_value,
    CAST(p.p75 AS NUMERIC(10,1)) AS p75_fcp_value,
    CAST(p.p90 AS NUMERIC(10,1)) AS p90_fcp_value,
    CAST(p.p95 AS NUMERIC(10,1)) AS p95_fcp_value,
    COUNT(CASE WHEN d.fcp_rating = 'good' THEN 1 END) AS good_count,
    COUNT(CASE WHEN d.fcp_rating = 'needs-improvement' THEN 1 END) AS needs_improvement_count,
    COUNT(CASE WHEN d.fcp_rating = 'poor' THEN 1 END) AS poor_count
  FROM 
    fcp_data d
  LEFT JOIN 
    client_info c ON d.session_id = c.session_id
  LEFT JOIN
    fcp_percentiles p ON c.device_type = p.device_type AND c.connection_type = p.connection_type
  GROUP BY 
    c.device_type,
    c.connection_type,
    p.p75,
    p.p90,
    p.p95
  ORDER BY 
    c.device_type,
    COUNT(*) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."analyze_lcp_by_device"("domain_filter" "text") RETURNS TABLE("device_type" "text", "element_target" "text", "page_url" "text", "lcp_asset_url" "text", "font_family" "text", "font_weight" "text", "font_size" "text", "network_transfer_bytes" numeric, "memory_usage_bytes" numeric, "ttfb_ms" numeric, "loading_priority" "text", "device_memory_gb" "text", "occurrence_count" bigint, "avg_lcp_value" numeric, "p75_lcp_value" numeric, "avg_resource_load_delay" numeric, "avg_resource_load_duration" numeric, "avg_element_render_delay" numeric, "top_3_render_blockers" "text", "good_count" bigint, "needs_improvement_count" bigint, "poor_count" bigint)
    LANGUAGE "plpgsql"
    AS $$#variable_conflict use_column
BEGIN
    RETURN QUERY
    WITH metrics_with_device AS (
      SELECT 
        rm.id,
        rm.current_page,
        rm.events,
        COALESCE( 
          (
            SELECT CASE 
              WHEN client_info->>'deviceType' IS NOT NULL THEN client_info->>'deviceType'
              WHEN client_info->>'device' IS NOT NULL THEN client_info->>'device'
              WHEN client_info->>'userAgent' ILIKE '%Mobile%' OR client_info->>'userAgent' ILIKE '%Android%' THEN 'mobile'
              WHEN client_info->>'userAgent' ILIKE '%iPad%' OR client_info->>'userAgent' ILIKE '%Tablet%' THEN 'tablet'
              ELSE 'desktop'
            END
            FROM jsonb_array_elements(rm.events) AS client_info 
            WHERE client_info->>'type' = 'client-info'
            LIMIT 1
          ),
          'unknown'
        ) AS raw_dev_type,
        (SELECT client_info->>'deviceMemory' FROM jsonb_array_elements(rm.events) AS client_info WHERE client_info->>'type' = 'client-info' LIMIT 1) AS dev_mem
      FROM public.rum_metrics rm
      WHERE rm.domain_name = domain_filter
        AND rm.created_at >= date_trunc('day', now()) - interval '7 days'
        -- This looks for ANY LCP record, regardless of whether it is Good, NI, or Poor
        AND EXISTS (
          SELECT 1 
          FROM jsonb_array_elements(rm.events) AS e 
          WHERE e->>'type' = 'web-vital' AND e->>'name' = 'LCP'
        )
    ),
    lcp_events AS (
      SELECT 
        mwd.id,
        CASE 
          WHEN mwd.raw_dev_type = 'mobile' THEN 'Mobile'
          WHEN mwd.raw_dev_type = 'desktop' THEN 'Desktop'
          WHEN mwd.raw_dev_type = 'tablet' THEN 'Tablet'
          ELSE 'Unknown'
        END AS dev_type,
        mwd.dev_mem AS dev_mem_gb,
        mwd.current_page AS p_url,
        (lcp_e->>'value')::numeric AS l_ms,
        lcp_e->>'rating' AS l_rating,
        lcp_e->'attribution'->>'target' AS e_target,
        
        COALESCE(
          lcp_e->'attribution'->>'url', 
          lcp_e->'attribution'->'font'->'fontData'->0->>'url'
        ) AS a_url,

        COALESCE(
          (lcp_e->'attribution'->>'transferSize')::numeric,
          (lcp_e->'attribution'->'font'->'fontData'->0->>'transferSize')::numeric
        ) AS t_size,
        
        (lcp_e->'attribution'->>'decodedBodySize')::numeric AS u_size,
        (lcp_e->'attribution'->>'timeToFirstByte')::numeric AS ttfb,
        lcp_e->'attribution'->>'fetchPriority' AS priority,

        lcp_e->'attribution'->'font'->>'family' AS f_family,
        lcp_e->'attribution'->'font'->>'weight' AS f_weight,
        lcp_e->'attribution'->'font'->>'size' AS f_size,
        
        (lcp_e->'attribution'->>'resourceLoadDelay')::numeric AS r_delay,
        (lcp_e->'attribution'->>'elementRenderDelay')::numeric AS ren_delay,
        (lcp_e->'attribution'->>'resourceLoadDuration')::numeric AS r_dur
      FROM metrics_with_device mwd
      CROSS JOIN LATERAL jsonb_array_elements(mwd.events) AS lcp_e
      WHERE lcp_e->>'type' = 'web-vital'
        AND lcp_e->>'name' = 'LCP'
        AND lcp_e->'attribution'->>'target' IS NOT NULL
    ),
    blocking_assets_flat AS (
      SELECT 
        le.dev_type, le.e_target, le.p_url,
        nested_e->>'URL' AS asset_url,
        NULLIF(REPLACE(nested_e->>'Finish Time', 'ms', ''), '')::numeric AS finish_time_ms
      FROM lcp_events le
      JOIN metrics_with_device mwd ON le.id = mwd.id
      CROSS JOIN LATERAL jsonb_array_elements(mwd.events) AS top_e
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(top_e) = 'array' THEN top_e ELSE '[]'::jsonb END
      ) AS nested_e
      WHERE nested_e->>'type' = 'render-blocking-scripts'
    ),
    script_stats AS (
      SELECT 
        st.dev_type, st.e_target, st.p_url,
        string_agg(st.asset_url || ' (' || ROUND(st.avg_finish, 0) || 'ms)', E'\n' ORDER BY st.avg_finish DESC) AS blockers
      FROM (
        SELECT 
          dev_type, e_target, p_url, asset_url,
          AVG(finish_time_ms) as avg_finish,
          ROW_NUMBER() OVER (PARTITION BY dev_type, e_target, p_url ORDER BY AVG(finish_time_ms) DESC) as rank
        FROM blocking_assets_flat
        GROUP BY 1, 2, 3, 4
      ) st
      WHERE st.rank <= 3
      GROUP BY 1, 2, 3
    ),
    aggregated AS (
      SELECT
        le.dev_type, le.e_target, le.p_url,
        MAX(le.a_url) AS lcp_a_url,
        MAX(le.f_family) AS f_fam,
        MAX(le.f_weight) AS f_weight,
        MAX(le.f_size) AS f_sz,
        MAX(le.priority) AS l_priority,
        MAX(le.dev_mem_gb) AS d_mem,
        COUNT(*) AS occ_count,
        ROUND(AVG(le.l_ms), 2) AS avg_l_ms,
        (PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY le.l_ms))::numeric AS p75_l_ms,
        ROUND(AVG(le.ttfb), 2) AS avg_ttfb,
        ROUND(AVG(le.t_size), 2) AS avg_t_size,
        ROUND(AVG(le.u_size), 2) AS avg_u_size,
        ROUND(AVG(le.r_delay), 2) AS avg_r_delay,
        ROUND(AVG(le.ren_delay), 2) AS avg_ren_delay,
        ROUND(AVG(le.r_dur), 2) AS avg_r_dur,
        COUNT(*) FILTER (WHERE le.l_rating = 'good') AS g_count,
        COUNT(*) FILTER (WHERE le.l_rating = 'needs improvement') AS ni_count,
        COUNT(*) FILTER (WHERE le.l_rating = 'poor') AS p_count
      FROM lcp_events le
      GROUP BY 1, 2, 3
    )
    SELECT 
      a.dev_type, a.e_target, a.p_url, a.lcp_a_url, a.f_fam, a.f_weight, a.f_sz,
      a.avg_t_size, a.avg_u_size, a.avg_ttfb, a.l_priority, a.d_mem,
      a.occ_count, a.avg_l_ms, ROUND(a.p75_l_ms, 2), 
      a.avg_r_delay, a.avg_r_dur, a.avg_ren_delay,
      s.blockers, a.g_count, a.ni_count, a.p_count
    FROM aggregated a
    LEFT JOIN script_stats s ON a.dev_type = s.dev_type AND a.e_target = s.e_target AND a.p_url = s.p_url
    WHERE a.occ_count >= 5    -- Your requirement: must appear at least 5 times
    ORDER BY a.p75_l_ms DESC  -- Your requirement: worst metrics first
    LIMIT 30;                 -- Return up to 30 elements
END;$$;

CREATE OR REPLACE FUNCTION "public"."analyze_web_vitals_by_page"("domain_filter" "text" DEFAULT NULL::"text", "time_range" "text" DEFAULT '7days'::"text") RETURNS TABLE("page_url" "text", "page_address" "text", "device_type" "text", "page_view_count" bigint, "avg_ttfb" numeric, "avg_lcp" numeric, "avg_cls" numeric, "avg_fid" numeric, "avg_fcp" numeric, "avg_inp" numeric, "ttfb_good_pct" numeric, "ttfb_needs_improvement_pct" numeric, "ttfb_poor_pct" numeric, "lcp_good_pct" numeric, "lcp_needs_improvement_pct" numeric, "lcp_poor_pct" numeric, "cls_good_pct" numeric, "cls_needs_improvement_pct" numeric, "cls_poor_pct" numeric, "fid_good_pct" numeric, "fid_needs_improvement_pct" numeric, "fid_poor_pct" numeric, "fcp_good_pct" numeric, "fcp_needs_improvement_pct" numeric, "fcp_poor_pct" numeric, "inp_good_pct" numeric, "inp_needs_improvement_pct" numeric, "inp_poor_pct" numeric, "overall_score" numeric, "performance_category" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  time_interval INTERVAL;
BEGIN
  -- Convert time_range parameter to an interval
  CASE
    WHEN time_range = '24hours' THEN time_interval := INTERVAL '24 hours';
    WHEN time_range = '7days' THEN time_interval := INTERVAL '7 days';
    WHEN time_range = '30days' THEN time_interval := INTERVAL '30 days';
    WHEN time_range = '90days' THEN time_interval := INTERVAL '90 days';
    ELSE time_interval := INTERVAL '7 days'; -- Default to 7 days
  END CASE;

  RETURN QUERY
  WITH domain_pages AS (
    -- Get all pages for the specified domain with proper device type
    SELECT DISTINCT 
      rm.current_page,
      COALESCE(
        (e->>'deviceType')::text, 
        CASE 
          WHEN (e->>'userAgent')::text LIKE '%Mobile%' 
               OR (e->>'userAgent')::text LIKE '%Android%' THEN 'mobile'
          WHEN (e->>'userAgent')::text LIKE '%Tablet%' 
               OR (e->>'userAgent')::text LIKE '%iPad%' THEN 'tablet'
          ELSE 'desktop'
        END
      ) AS device_type,
      (e->>'sessionId')::text AS session_id,
      (e->>'pageAddress')::text AS page_address
    FROM public.rum_metrics rm
    CROSS JOIN jsonb_array_elements(rm.events) AS e
    WHERE rm.created_at >= NOW() - time_interval
      AND (
        domain_filter IS NULL
        OR rm.domain_name ILIKE '%' || domain_filter || '%'
        OR domain_filter ILIKE '%' || rm.domain_name || '%'
        OR (e->>'siteDomain')::text ILIKE '%' || domain_filter || '%'
        OR domain_filter ILIKE '%' || (e->>'siteDomain')::text || '%'
      )
      AND rm.current_page IS NOT NULL
      AND (e->>'sessionId') IS NOT NULL
  ),
  
  page_views AS (
    -- Count page views by page and device type
    SELECT
      dp.current_page,
      dp.page_address,
      dp.device_type,
      COUNT(DISTINCT dp.session_id) AS view_count
    FROM domain_pages dp
    GROUP BY dp.current_page, dp.page_address, dp.device_type
  ),
  
  web_vitals AS (
    -- Extract all web vitals from the events JSON
    SELECT
      dp.current_page,
      dp.page_address,
      dp.device_type,
      dp.session_id,
      (e->>'name')::text AS metric_name,
      ((e->>'value')::text)::numeric AS metric_value,
      (e->>'rating')::text AS metric_rating
    FROM 
      public.rum_metrics rm
    CROSS JOIN jsonb_array_elements(rm.events) AS e
    JOIN domain_pages dp ON (e->>'sessionId')::text = dp.session_id
    WHERE 
      rm.created_at >= NOW() - time_interval
      AND (e->>'type')::text = 'web-vital'
      AND (e->>'name')::text IN ('TTFB', 'LCP', 'CLS', 'FID', 'INP', 'FCP')
  ),
  
  page_metrics AS (
    -- Group by page, device type, and metric
    SELECT
      wv.current_page,
      wv.page_address,
      wv.device_type,
      wv.metric_name,
      COUNT(DISTINCT wv.session_id) AS sessions,
      AVG(wv.metric_value) AS avg_value,
      COUNT(CASE WHEN wv.metric_rating = 'good' THEN 1 END) AS good_count,
      COUNT(CASE WHEN wv.metric_rating = 'needs-improvement' THEN 1 END) AS needs_improvement_count,
      COUNT(CASE WHEN wv.metric_rating = 'poor' THEN 1 END) AS poor_count
    FROM
      web_vitals wv
    GROUP BY
      wv.current_page,
      wv.page_address,
      wv.device_type,
      wv.metric_name
  ),
  
  page_pivot AS (
    -- Pivot the metrics for each page and device type, including 'all' device type
    SELECT
      pm.current_page AS pivot_page,
      pm.page_address AS pivot_page_address,
      COALESCE(pm.device_type, 'all') AS pivot_device_type,
      MAX(COALESCE(pv.view_count, 0)) AS pivot_view_count,
      
      -- TTFB metrics
      AVG(CASE WHEN pm.metric_name = 'TTFB' THEN pm.avg_value END) AS pivot_avg_ttfb,
      SUM(CASE WHEN pm.metric_name = 'TTFB' THEN pm.good_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'TTFB' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_ttfb_good_pct,
      SUM(CASE WHEN pm.metric_name = 'TTFB' THEN pm.needs_improvement_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'TTFB' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_ttfb_needs_improvement_pct,
      SUM(CASE WHEN pm.metric_name = 'TTFB' THEN pm.poor_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'TTFB' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_ttfb_poor_pct,
      
      -- LCP metrics
      AVG(CASE WHEN pm.metric_name = 'LCP' THEN pm.avg_value END) AS pivot_avg_lcp,
      SUM(CASE WHEN pm.metric_name = 'LCP' THEN pm.good_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'LCP' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_lcp_good_pct,
      SUM(CASE WHEN pm.metric_name = 'LCP' THEN pm.needs_improvement_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'LCP' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_lcp_needs_improvement_pct,
      SUM(CASE WHEN pm.metric_name = 'LCP' THEN pm.poor_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'LCP' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_lcp_poor_pct,
      
      -- CLS metrics
      AVG(CASE WHEN pm.metric_name = 'CLS' THEN pm.avg_value END) AS pivot_avg_cls,
      SUM(CASE WHEN pm.metric_name = 'CLS' THEN pm.good_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'CLS' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_cls_good_pct,
      SUM(CASE WHEN pm.metric_name = 'CLS' THEN pm.needs_improvement_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'CLS' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_cls_needs_improvement_pct,
      SUM(CASE WHEN pm.metric_name = 'CLS' THEN pm.poor_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'CLS' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_cls_poor_pct,
      
      -- FCP metrics
      AVG(CASE WHEN pm.metric_name = 'FCP' THEN pm.avg_value END) AS pivot_avg_fcp,
      SUM(CASE WHEN pm.metric_name = 'FCP' THEN pm.good_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'FCP' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_fcp_good_pct,
      SUM(CASE WHEN pm.metric_name = 'FCP' THEN pm.needs_improvement_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'FCP' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_fcp_needs_improvement_pct,
      SUM(CASE WHEN pm.metric_name = 'FCP' THEN pm.poor_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'FCP' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_fcp_poor_pct,
      
      -- FID metrics 
      AVG(CASE WHEN pm.metric_name = 'FID' THEN pm.avg_value END) AS pivot_avg_fid,
      SUM(CASE WHEN pm.metric_name = 'FID' THEN pm.good_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'FID' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_fid_good_pct,
      SUM(CASE WHEN pm.metric_name = 'FID' THEN pm.needs_improvement_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'FID' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_fid_needs_improvement_pct,
      SUM(CASE WHEN pm.metric_name = 'FID' THEN pm.poor_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'FID' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_fid_poor_pct,
      
      -- INP metrics
      AVG(CASE WHEN pm.metric_name = 'INP' THEN pm.avg_value END) AS pivot_avg_inp,
      SUM(CASE WHEN pm.metric_name = 'INP' THEN pm.good_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'INP' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_inp_good_pct,
      SUM(CASE WHEN pm.metric_name = 'INP' THEN pm.needs_improvement_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'INP' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_inp_needs_improvement_pct,
      SUM(CASE WHEN pm.metric_name = 'INP' THEN pm.poor_count ELSE 0 END)::numeric / 
        NULLIF(SUM(CASE WHEN pm.metric_name = 'INP' THEN pm.good_count + pm.needs_improvement_count + pm.poor_count ELSE 0 END), 0)::numeric * 100 AS pivot_inp_poor_pct
      
    FROM
      page_metrics pm
    LEFT JOIN page_views pv ON 
      pm.current_page = pv.current_page AND 
      pm.device_type = pv.device_type
    LEFT JOIN web_vitals wv ON 
      pm.current_page = wv.current_page AND 
      pm.device_type = wv.device_type
    GROUP BY
      GROUPING SETS (
        (pm.current_page, pm.page_address, pm.device_type),
        (pm.current_page, pm.page_address)
      )
  ),
  
  page_scores AS (
    -- Calculate overall performance score and category
    SELECT
      pivot_page,
      pivot_page_address,
      pivot_device_type,
      pivot_view_count,
      ROUND(COALESCE(pivot_avg_ttfb, 0)::numeric, 2) AS pivot_avg_ttfb,
      ROUND(COALESCE(pivot_avg_lcp, 0)::numeric, 2) AS pivot_avg_lcp,
      ROUND(COALESCE(pivot_avg_cls, 0)::numeric, 4) AS pivot_avg_cls,
      ROUND(COALESCE(pivot_avg_fid, 0)::numeric, 2) AS pivot_avg_fid,
      ROUND(COALESCE(pivot_avg_fcp, 0)::numeric, 2) AS pivot_avg_fcp,
      ROUND(COALESCE(pivot_avg_inp, 0)::numeric, 2) AS pivot_avg_inp,
      
      ROUND(COALESCE(pivot_ttfb_good_pct, 0)::numeric, 1) AS pivot_ttfb_good_pct,
      ROUND(COALESCE(pivot_ttfb_needs_improvement_pct, 0)::numeric, 1) AS pivot_ttfb_needs_improvement_pct,
      ROUND(COALESCE(pivot_ttfb_poor_pct, 0)::numeric, 1) AS pivot_ttfb_poor_pct,
      
      ROUND(COALESCE(pivot_lcp_good_pct, 0)::numeric, 1) AS pivot_lcp_good_pct,
      ROUND(COALESCE(pivot_lcp_needs_improvement_pct, 0)::numeric, 1) AS pivot_lcp_needs_improvement_pct,
      ROUND(COALESCE(pivot_lcp_poor_pct, 0)::numeric, 1) AS pivot_lcp_poor_pct,
      
      ROUND(COALESCE(pivot_cls_good_pct, 0)::numeric, 1) AS pivot_cls_good_pct,
      ROUND(COALESCE(pivot_cls_needs_improvement_pct, 0)::numeric, 1) AS pivot_cls_needs_improvement_pct,
      ROUND(COALESCE(pivot_cls_poor_pct, 0)::numeric, 1) AS pivot_cls_poor_pct,
      
      ROUND(COALESCE(pivot_fid_good_pct, 0)::numeric, 1) AS pivot_fid_good_pct,
      ROUND(COALESCE(pivot_fid_needs_improvement_pct, 0)::numeric, 1) AS pivot_fid_needs_improvement_pct,
      ROUND(COALESCE(pivot_fid_poor_pct, 0)::numeric, 1) AS pivot_fid_poor_pct,
      
      ROUND(COALESCE(pivot_fcp_good_pct, 0)::numeric, 1) AS pivot_fcp_good_pct,
      ROUND(COALESCE(pivot_fcp_needs_improvement_pct, 0)::numeric, 1) AS pivot_fcp_needs_improvement_pct,
      ROUND(COALESCE(pivot_fcp_poor_pct, 0)::numeric, 1) AS pivot_fcp_poor_pct,
      
      ROUND(COALESCE(pivot_inp_good_pct, 0)::numeric, 1) AS pivot_inp_good_pct,
      ROUND(COALESCE(pivot_inp_needs_improvement_pct, 0)::numeric, 1) AS pivot_inp_needs_improvement_pct,
      ROUND(COALESCE(pivot_inp_poor_pct, 0)::numeric, 1) AS pivot_inp_poor_pct,
      
      -- Calculate a weighted score (higher is better)
      ROUND(
        (
          COALESCE(pivot_ttfb_good_pct, 0) * 0.15 +
          COALESCE(pivot_fcp_good_pct, 0) * 0.15 +
          COALESCE(pivot_lcp_good_pct, 0) * 0.25 +
          COALESCE(pivot_cls_good_pct, 0) * 0.25 +
          COALESCE(pivot_fid_good_pct, 0) * 0.1 +
          COALESCE(pivot_inp_good_pct, 0) * 0.1
        )::numeric, 1
      ) AS overall_score,
      
      -- Categorize pages based on score
      CASE
        WHEN (
          COALESCE(pivot_ttfb_good_pct, 0) * 0.15 +
          COALESCE(pivot_fcp_good_pct, 0) * 0.15 +
          COALESCE(pivot_lcp_good_pct, 0) * 0.25 +
          COALESCE(pivot_cls_good_pct, 0) * 0.25 +
          COALESCE(pivot_fid_good_pct, 0) * 0.1 +
          COALESCE(pivot_inp_good_pct, 0) * 0.1
        ) >= 75 THEN 'good'
        WHEN (
          COALESCE(pivot_ttfb_good_pct, 0) * 0.15 +
          COALESCE(pivot_fcp_good_pct, 0) * 0.15 +
          COALESCE(pivot_lcp_good_pct, 0) * 0.25 +
          COALESCE(pivot_cls_good_pct, 0) * 0.25 +
          COALESCE(pivot_fid_good_pct, 0) * 0.1 +
          COALESCE(pivot_inp_good_pct, 0) * 0.1
        ) >= 50 THEN 'average'
        ELSE 'poor'
      END AS performance_category
    FROM
      page_pivot
  )
  
  -- Return the final results
  SELECT
    ps.pivot_page AS page_url,
    ps.pivot_page_address AS page_address,
    ps.pivot_device_type AS device_type,
    ps.pivot_view_count AS page_view_count,
    ps.pivot_avg_ttfb AS avg_ttfb,
    ps.pivot_avg_lcp AS avg_lcp,
    ps.pivot_avg_cls AS avg_cls,
    ps.pivot_avg_fid AS avg_fid,
    ps.pivot_avg_fcp AS avg_fcp,
    ps.pivot_avg_inp AS avg_inp,
    ps.pivot_ttfb_good_pct AS ttfb_good_pct,
    ps.pivot_ttfb_needs_improvement_pct AS ttfb_needs_improvement_pct,
    ps.pivot_ttfb_poor_pct AS ttfb_poor_pct,
    ps.pivot_lcp_good_pct AS lcp_good_pct,
    ps.pivot_lcp_needs_improvement_pct AS lcp_needs_improvement_pct,
    ps.pivot_lcp_poor_pct AS lcp_poor_pct,
    ps.pivot_cls_good_pct AS cls_good_pct,
    ps.pivot_cls_needs_improvement_pct AS cls_needs_improvement_pct,
    ps.pivot_cls_poor_pct AS cls_poor_pct,
    ps.pivot_fid_good_pct AS fid_good_pct,
    ps.pivot_fid_needs_improvement_pct AS fid_needs_improvement_pct,
    ps.pivot_fid_poor_pct AS fid_poor_pct,
    ps.pivot_fcp_good_pct AS fcp_good_pct,
    ps.pivot_fcp_needs_improvement_pct AS fcp_needs_improvement_pct,
    ps.pivot_fcp_poor_pct AS fcp_poor_pct,
    ps.pivot_inp_good_pct AS inp_good_pct,
    ps.pivot_inp_needs_improvement_pct AS inp_needs_improvement_pct,
    ps.pivot_inp_poor_pct AS inp_poor_pct,
    ps.overall_score AS overall_score,
    ps.performance_category AS performance_category
  FROM
    page_scores ps
  ORDER BY
    ps.pivot_device_type,
    ps.overall_score DESC;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."cache_analysis"("domain_name_param" "text") RETURNS TABLE("id" "text", "created_at" timestamp with time zone, "current_page" "text", "cache_status" "text", "is_origin_hit" "text", "cdn_provider" "text", "network_type" "text", "network_rtt" "text", "ttfb_total" double precision, "dns_time" double precision, "tcp_time" double precision, "server_processing_time" double precision, "country" "text", "city" "text", "device" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id::TEXT,              -- Explicit cast
        m.created_at::TIMESTAMPTZ,
        m.current_page::TEXT,
        
        -- 1. Cache Depth
        (orig.event->>'cacheStatus')::TEXT,
        (orig.event->>'originHit')::TEXT,
        (orig.event->>'provider')::TEXT,

        -- 2. Network Environment
        (client.event->'connection'->>'effectiveType')::TEXT,
        (client.event->'connection'->>'rtt')::TEXT,

        -- 3. TTFB Breakdown (Using DOUBLE PRECISION to match function)
        (ttfb.event->>'value')::DOUBLE PRECISION,
        (ttfb.event->'attribution'->>'dnsLookup')::DOUBLE PRECISION,
        (ttfb.event->'attribution'->>'tcpConnection')::DOUBLE PRECISION,
        (ttfb.event->'attribution'->>'requestStart')::DOUBLE PRECISION,
        
        -- 4. Geolocation & Context
        (geo.event->>'country')::TEXT,
        (geo.event->>'city')::TEXT,
        (client.event->>'deviceType')::TEXT
        
    FROM public.rum_metrics m
    LEFT JOIN LATERAL (SELECT e AS event FROM jsonb_array_elements(m.events) e WHERE e->>'type' = 'origin-info' LIMIT 1) AS orig ON true
    LEFT JOIN LATERAL (SELECT e AS event FROM jsonb_array_elements(m.events) e WHERE e->>'type' = 'web-vital' AND e->>'name' = 'TTFB' LIMIT 1) AS ttfb ON true
    LEFT JOIN LATERAL (SELECT e AS event FROM jsonb_array_elements(m.events) e WHERE e->>'type' = 'geo-info' LIMIT 1) AS geo ON true
    LEFT JOIN LATERAL (SELECT e AS event FROM jsonb_array_elements(m.events) e WHERE e->>'type' = 'client-info' LIMIT 1) AS client ON true
    WHERE m.domain_name = domain_name_param 
    ORDER BY m.created_at DESC
    LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."cls_elements"("p_domain_name" "text") RETURNS TABLE("current_page" "text", "dev_type" "text", "most_frequent_element" "text", "occ_count" bigint, "cls_score" numeric, "time_avg" numeric, "l_mode" "text", "impact_json" "jsonb", "rect_json" "jsonb", "shift_json" "jsonb", "involved_elems" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH cls_base AS (
        SELECT 
            m.id as event_id,
            m.current_page,
            -- Extract device type from client-info event
            (SELECT e->>'deviceType' 
             FROM jsonb_array_elements(m.events) e 
             WHERE e->>'type' = 'client-info' 
             LIMIT 1) as device_type,
            (v.val->>'value')::float as total_cls_value,
            v.val as cls_event
        FROM public.rum_metrics m
        CROSS JOIN LATERAL jsonb_array_elements(m.events) AS v(val)
        WHERE m.domain_name = p_domain_name
          AND m.created_at >= NOW() - INTERVAL '7 days'
          AND v.val->>'type' = 'web-vital'
          AND v.val->>'name' = 'CLS'
          AND (v.val->>'value')::float > 0.001
    ),
    unnested_shifts AS (
        SELECT 
            b.event_id,
            COALESCE(b.device_type, 'unknown') as dev_type,
            b.current_page,
            b.total_cls_value,
            b.cls_event->'attribution'->>'largestShiftTarget' as primary_target,
            b.cls_event->'attribution'->>'loadState' as load_state,
            (s.shift_data->>'time')::float as shift_time,
            s.shift_data->'impact' as impact_obj,
            s.shift_data->'rect' as rect_obj,
            s.shift_data->'shift' as shift_obj,
            s.shift_data->'elements' as elements_involved
        FROM cls_base b
        CROSS JOIN LATERAL jsonb_array_elements(b.cls_event->'attribution'->'shifts') AS s(shift_data)
    ),
    aggregated_page_data AS (
        SELECT 
            us.current_page,
            us.dev_type,
            -- Which element selector usually triggers the largest shift on this page
            MODE() WITHIN GROUP (ORDER BY us.primary_target) as primary_target_mode,
            COUNT(DISTINCT us.event_id)::BIGINT as occ_count,
            ROUND(AVG(us.total_cls_value)::numeric, 4) as cls_score,
            ROUND(AVG(us.shift_time)::numeric, 0) as time_avg,
            MODE() WITHIN GROUP (ORDER BY us.load_state) as l_mode,
            
            -- Impact Data
            jsonb_build_object(
                'areaDelta', ROUND(AVG((us.impact_obj->>'areaDelta')::float)::numeric, 2),
                'distanceMoved', ROUND(AVG((us.impact_obj->>'distanceMoved')::float)::numeric, 2),
                'viewportRatio', ROUND(AVG((us.impact_obj->>'viewportRatio')::float)::numeric, 4)
            ) as impact_json,
            
            -- Positional Rect Data
            jsonb_build_object(
                'current', jsonb_build_object(
                    'x', ROUND(AVG((us.rect_obj->'current'->>'x')::float)::numeric, 1),
                    'y', ROUND(AVG((us.rect_obj->'current'->>'y')::float)::numeric, 1),
                    'width', ROUND(AVG((us.rect_obj->'current'->>'width')::float)::numeric, 1),
                    'height', ROUND(AVG((us.rect_obj->'current'->>'height')::float)::numeric, 1)
                ),
                'previous', jsonb_build_object(
                    'x', ROUND(AVG((us.rect_obj->'previous'->>'x')::float)::numeric, 1),
                    'y', ROUND(AVG((us.rect_obj->'previous'->>'y')::float)::numeric, 1),
                    'width', ROUND(AVG((us.rect_obj->'previous'->>'width')::float)::numeric, 1),
                    'height', ROUND(AVG((us.rect_obj->'previous'->>'height')::float)::numeric, 1)
                )
            ) as rect_json,
            
            -- Raw Shift Delta (Direction removed for frontend calculation)
            jsonb_build_object(
                'dx', ROUND(AVG((us.shift_obj->>'dx')::float)::numeric, 2),
                'dy', ROUND(AVG((us.shift_obj->>'dy')::float)::numeric, 2)
            ) as shift_json,

            -- All unique elements that shifted on this page
            (
                SELECT jsonb_agg(DISTINCT elem) 
                FROM unnested_shifts us2, jsonb_array_elements(us2.elements_involved) AS elem
                WHERE us2.current_page = us.current_page 
                  AND us2.dev_type = us.dev_type
                  AND elem::text != '"(unknown)"'
            ) as involved_elems
        FROM unnested_shifts us
        GROUP BY us.current_page, us.dev_type
    )
    SELECT 
        apd.current_page,
        apd.dev_type,
        apd.primary_target_mode,
        apd.occ_count,
        apd.cls_score,
        apd.time_avg,
        apd.l_mode,
        apd.impact_json,
        apd.rect_json,
        apd.shift_json,
        apd.involved_elems
    FROM aggregated_page_data apd
    ORDER BY apd.cls_score DESC, apd.occ_count DESC
    LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."cwv_dist_by_connection"("p_metric" "text", "p_domain" "text", "p_start" timestamp with time zone, "p_end" timestamp with time zone) RETURNS TABLE("connection_type" "text", "desktop_good" bigint, "desktop_poor" bigint, "desktop_needs_improvement" bigint, "mobile_good" bigint, "mobile_poor" bigint, "mobile_needs_improvement" bigint, "tablet_good" bigint, "tablet_poor" bigint, "tablet_needs_improvement" bigint, "other_good" bigint, "other_poor" bigint, "other_needs_improvement" bigint)
    LANGUAGE "sql" STABLE
    AS $$
with base as (
  select
    rm.*,
    (
      select e->'connection'->>'effectiveType'
      from jsonb_array_elements(rm.events) e
      where e->>'type' = 'client-info'
      limit 1
    ) as effective_type,
    (
      select e->>'deviceType'
      from jsonb_array_elements(rm.events) e
      where e->>'type' = 'client-info'
      limit 1
    ) as client_device_type
  from public.rum_metrics rm
  where rm.domain_name = p_domain
    and rm.current_page is not null and rm.current_page <> ''
    and rm.created_at >= p_start
    and rm.created_at <  p_end
),
metric_events as (
  select
    b.id,
    b.effective_type,
    lower(coalesce(e->>'deviceType', e->>'device_type', b.client_device_type)) as device_type,
    e->>'rating' as rating,
    row_number() over (
      partition by b.id
      order by coalesce((e->>'timestamp')::bigint, 0) desc,
               coalesce((e->>'value')::numeric, 0) desc
    ) as rn
  from base b
  cross join lateral jsonb_array_elements(b.events) e
  where e->>'type' = 'web-vital'
    and e->>'name' = p_metric
),
latest as (
  select effective_type, device_type, rating
  from metric_events
  where rn = 1
),
labeled as (
  select
    effective_type,
    case
      when device_type in ('desktop', 'pc') then 'desktop'
      when device_type in ('mobile', 'phone') then 'mobile'
      when device_type in ('tablet', 'pad') then 'tablet'
      else 'other'
    end as device,
    rating
  from latest
)
select
  coalesce(effective_type, '<unknown>') as connection_type,

  -- desktop
  count(*) filter (where device = 'desktop' and rating = 'good') as desktop_good,
  count(*) filter (where device = 'desktop' and rating = 'poor') as desktop_poor,
  count(*) filter (where device = 'desktop' and rating = 'needs improvement') as desktop_needs_improvement,

  -- mobile
  count(*) filter (where device = 'mobile' and rating = 'good') as mobile_good,
  count(*) filter (where device = 'mobile' and rating = 'poor') as mobile_poor,
  count(*) filter (where device = 'mobile' and rating = 'needs improvement') as mobile_needs_improvement,

  -- tablet
  count(*) filter (where device = 'tablet' and rating = 'good') as tablet_good,
  count(*) filter (where device = 'tablet' and rating = 'poor') as tablet_poor,
  count(*) filter (where device = 'tablet' and rating = 'needs improvement') as tablet_needs_improvement,

  -- other/unknown bucket
  count(*) filter (where device = 'other' and rating = 'good') as other_good,
  count(*) filter (where device = 'other' and rating = 'poor') as other_poor,
  count(*) filter (where device = 'other' and rating = 'needs improvement') as other_needs_improvement
from labeled
group by coalesce(effective_type, '<unknown>')
order by (count(*)) desc nulls last;
$$;

CREATE OR REPLACE FUNCTION "public"."daily_aggregate_usage_by_userid"() RETURNS TABLE("user_id" "uuid", "total_usage" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.user_id,
        SUM(o.usage_by_site)::BIGINT AS total_usage
    FROM public.orders o
    GROUP BY o.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."delete_old_rum_hits"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    rows_deleted INT;
BEGIN
    LOOP
        DELETE FROM public.rum_origin_hits_agg
        WHERE ctid IN (
            SELECT ctid
            FROM public.rum_origin_hits_agg
            WHERE agg_time < NOW() - INTERVAL '30 days'
            LIMIT 5000
        );

        GET DIAGNOSTICS rows_deleted = ROW_COUNT;
        EXIT WHEN rows_deleted = 0;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."delete_old_rum_metrics"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    DELETE FROM public.rum_metrics 
    WHERE created_at < (NOW() - INTERVAL '7 days');
    
    RAISE NOTICE 'Deleted RUM metrics older than 30 days at %', NOW();
END;$$;

COMMENT ON FUNCTION "public"."delete_old_rum_metrics"() IS 'Function to delete RUM metrics data older than 7 days';

CREATE OR REPLACE FUNCTION "public"."font_analysis"("p_domain" "text") RETURNS TABLE("device" "text", "font_family" "text", "font_weight" "text", "font_file_url" "text", "avg_resource_size" numeric, "major_pages" "text"[], "total_occurrences" bigint, "avg_lcp" numeric, "avg_render_delay" numeric, "poor_lcp_percentage" numeric)
    LANGUAGE "sql"
    AS $_$
  WITH raw_lcp_data AS (
    -- Extract the basic JSON objects
    SELECT 
      current_page,
      COALESCE(
        jsonb_path_query_first(events, '$[*] ? (@.type == "client-info")')->>'deviceType', 
        'unknown'
      ) as device_type,
      jsonb_path_query(events, '$[*] ? (@.type == "web-vital" && @.name == "LCP" && @.attribution.font != null)') as lcp_event
    FROM public.rum_metrics
    WHERE domain_name = p_domain
  ),
  flattened_metrics AS (
    -- Flatten JSON into typed columns for processing
    SELECT 
      device_type,
      lcp_event->'attribution'->'font'->>'family' as family,
      lcp_event->'attribution'->'font'->>'weight' as weight,
      lcp_event->'attribution'->'font'->'fontData'->0->>'url' as url,
      (lcp_event->'attribution'->'font'->'fontData'->0->>'transferSize')::numeric as res_size,
      current_page,
      (lcp_event->>'value')::float as lcp_val,
      (lcp_event->'attribution'->>'elementRenderDelay')::float as render_delay,
      (lcp_event->>'rating' = 'poor') as is_poor
    FROM raw_lcp_data
  ),
  page_ranking AS (
    -- Determine which pages use this font most often
    SELECT 
      device_type, family, weight, current_page,
      COUNT(*) as frequency
    FROM flattened_metrics
    GROUP BY 1, 2, 3, 4
  ),
  top_pages AS (
    -- Group top 5 pages into an array per font/device
    SELECT 
      device_type, family, weight,
      (ARRAY_AGG(current_page ORDER BY frequency DESC))[1:5] as top_5_pages
    FROM page_ranking
    GROUP BY 1, 2, 3
  )
  SELECT 
    f.device_type,
    f.family,
    f.weight,
    -- MAX(url) ensures if a URL was found in ANY record for this font, it's included here
    MAX(f.url),
    -- Average size across records where size was actually provided
    ROUND(AVG(f.res_size), 2),
    t.top_5_pages,
    COUNT(*),
    ROUND(AVG(f.lcp_val)::numeric, 2),
    ROUND(AVG(f.render_delay)::numeric, 2),
    ROUND(
      (COUNT(*) FILTER (WHERE f.is_poor)::float / NULLIF(COUNT(*), 0)::float * 100)::numeric, 
      2
    )
  FROM flattened_metrics f
  JOIN top_pages t 
    ON f.device_type = t.device_type 
    AND f.family = t.family 
    AND f.weight = t.weight
  GROUP BY f.device_type, f.family, f.weight, t.top_5_pages
  ORDER BY 9 DESC; -- Sort by most problematic (highest render delay)
$_$;

CREATE OR REPLACE FUNCTION "public"."get_ai_citation"("p_domain_name" "text") RETURNS TABLE("domain" "text", "device_type" "text", "total_sessions" bigint, "avg_citation_score" numeric, "min_citation_score" numeric, "max_citation_score" numeric, "std_dev_citation_score" numeric, "avg_ttfb" numeric, "avg_dom_content_loaded" numeric, "ai_citation_possibility" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_normalized_domain TEXT;
BEGIN
  -- Normalize domain name to handle www and non-www versions
  IF p_domain_name IS NOT NULL THEN
    v_normalized_domain := LOWER(p_domain_name);
    -- Remove 'www.' prefix if present
    IF LEFT(v_normalized_domain, 4) = 'www.' THEN
      v_normalized_domain := SUBSTRING(v_normalized_domain FROM 5);
    END IF;
  ELSE
    v_normalized_domain := NULL;
  END IF;

  RETURN QUERY
  WITH flattened_events AS (
    SELECT 
      fe.domain_name,
      fe.session_id,
      fe.created_at,
      jsonb_array_elements(fe.events) as event_data
    FROM 
      public.rum_metrics fe
    WHERE 
      fe.created_at >= NOW() - INTERVAL '24 hours'
      AND (
        p_domain_name IS NULL 
        OR (
          CASE 
            WHEN LEFT(LOWER(fe.domain_name), 4) = 'www.' THEN SUBSTRING(LOWER(fe.domain_name) FROM 5)
            ELSE LOWER(fe.domain_name)
          END
        ) = v_normalized_domain
      )
  ),
  client_info AS (
    SELECT 
      ci.domain_name,
      ci.session_id,
      CASE 
        WHEN LOWER(ci.event_data->>'deviceType') IN ('mobile', 'smartphone', 'phone') THEN 'mobile'
        WHEN LOWER(ci.event_data->>'deviceType') IN ('desktop', 'laptop', 'pc') THEN 'desktop'
        WHEN LOWER(ci.event_data->>'deviceType') IN ('tablet', 'ipad') THEN 'tablet'
        ELSE NULL
      END as device_type
    FROM 
      flattened_events ci
    WHERE 
      ci.event_data->>'type' = 'client-info'
      AND ci.event_data->>'deviceType' IS NOT NULL
      AND LOWER(ci.event_data->>'deviceType') IN ('mobile', 'smartphone', 'phone', 'desktop', 'laptop', 'pc', 'tablet', 'ipad')
  ),
  ai_citation_events AS (
    SELECT 
      ace.domain_name,
      ace.session_id,
      ace.event_data->>'siteDomain' as site_domain,
      -- Use CASE to safely convert to numeric, ignoring non-numeric values
      CASE 
        WHEN ace.event_data->>'score' IS NULL OR ace.event_data->>'score' = '' THEN NULL
        WHEN ace.event_data->>'score' ~ '^[-]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$' THEN (ace.event_data->>'score')::numeric
        ELSE NULL
      END as ai_citation_score,
      CASE 
        WHEN ace.event_data->>'ttfb' IS NULL OR ace.event_data->>'ttfb' = '' THEN NULL
        WHEN ace.event_data->>'ttfb' ~ '^[-]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$' THEN (ace.event_data->>'ttfb')::numeric
        ELSE NULL
      END as ttfb,
      CASE 
        WHEN ace.event_data->>'domContentLoaded' IS NULL OR ace.event_data->>'domContentLoaded' = '' THEN NULL
        WHEN ace.event_data->>'domContentLoaded' ~ '^[-]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$' THEN (ace.event_data->>'domContentLoaded')::numeric
        ELSE NULL
      END as dom_content_loaded
    FROM 
      flattened_events ace
    WHERE 
      ace.event_data->>'type' = 'ai-citation-ready'
  ),
  ai_citation_data AS (
    SELECT 
      COALESCE(ace.site_domain, ace.domain_name) as domain,
      ace.session_id,
      ci.device_type as client_device_type,
      ace.ai_citation_score,
      ace.ttfb,
      ace.dom_content_loaded
    FROM 
      ai_citation_events ace
    LEFT JOIN 
      client_info ci ON ace.session_id = ci.session_id AND ace.domain_name = ci.domain_name
    WHERE
      ace.ai_citation_score IS NOT NULL
      AND ace.ttfb IS NOT NULL
      AND ace.dom_content_loaded IS NOT NULL
      AND (ci.device_type IS NULL OR ci.device_type IN ('mobile', 'desktop', 'tablet'))
  ),
  device_based_metrics AS (
    SELECT
      acd.domain,
      COALESCE(acd.client_device_type, 'mobile') as device_type,
      COUNT(DISTINCT acd.session_id) AS total_sessions,
      AVG(acd.ai_citation_score) AS avg_citation_score,
      MIN(acd.ai_citation_score) AS min_citation_score,
      MAX(acd.ai_citation_score) AS max_citation_score,
      STDDEV(acd.ai_citation_score) AS std_dev_citation_score,
      AVG(acd.ttfb) AS avg_ttfb,
      AVG(acd.dom_content_loaded) AS avg_dom_content_loaded,
      CASE 
        WHEN AVG(acd.ai_citation_score) >= 90 THEN 'Very High'
        WHEN AVG(acd.ai_citation_score) >= 80 THEN 'High'
        WHEN AVG(acd.ai_citation_score) >= 70 THEN 'Medium'
        WHEN AVG(acd.ai_citation_score) >= 60 THEN 'Low'
        ELSE 'Very Low'
      END AS ai_citation_possibility
    FROM 
      ai_citation_data acd
    GROUP BY 
      acd.domain,
      COALESCE(acd.client_device_type, 'mobile')
  ),
  all_devices_metrics AS (
    SELECT
      dbm.domain,
      'all' as device_type,
      SUM(dbm.total_sessions) AS total_sessions,
      SUM(dbm.avg_citation_score * dbm.total_sessions) / NULLIF(SUM(dbm.total_sessions), 0) AS avg_citation_score,
      MIN(dbm.min_citation_score) AS min_citation_score,
      MAX(dbm.max_citation_score) AS max_citation_score,
      SQRT(SUM(POWER(dbm.std_dev_citation_score, 2) * dbm.total_sessions) / NULLIF(SUM(dbm.total_sessions), 0)) AS std_dev_citation_score,
      SUM(dbm.avg_ttfb * dbm.total_sessions) / NULLIF(SUM(dbm.total_sessions), 0) AS avg_ttfb,
      SUM(dbm.avg_dom_content_loaded * dbm.total_sessions) / NULLIF(SUM(dbm.total_sessions), 0) AS avg_dom_content_loaded,
      CASE 
        WHEN SUM(dbm.avg_citation_score * dbm.total_sessions) / NULLIF(SUM(dbm.total_sessions), 0) >= 90 THEN 'Very High'
        WHEN SUM(dbm.avg_citation_score * dbm.total_sessions) / NULLIF(SUM(dbm.total_sessions), 0) >= 80 THEN 'High'
        WHEN SUM(dbm.avg_citation_score * dbm.total_sessions) / NULLIF(SUM(dbm.total_sessions), 0) >= 70 THEN 'Medium'
        WHEN SUM(dbm.avg_citation_score * dbm.total_sessions) / NULLIF(SUM(dbm.total_sessions), 0) >= 60 THEN 'Low'
        ELSE 'Very Low'
      END AS ai_citation_possibility
    FROM 
      device_based_metrics dbm
    GROUP BY 
      dbm.domain
  ),
  combined_results AS (
    SELECT 
      dbm.domain,
      dbm.device_type,
      dbm.total_sessions,
      dbm.avg_citation_score,
      dbm.min_citation_score,
      dbm.max_citation_score,
      dbm.std_dev_citation_score,
      dbm.avg_ttfb,
      dbm.avg_dom_content_loaded,
      dbm.ai_citation_possibility
    FROM device_based_metrics dbm
    UNION ALL
    SELECT 
      adm.domain,
      adm.device_type,
      adm.total_sessions,
      adm.avg_citation_score,
      adm.min_citation_score,
      adm.max_citation_score,
      adm.std_dev_citation_score,
      adm.avg_ttfb,
      adm.avg_dom_content_loaded,
      adm.ai_citation_possibility
    FROM all_devices_metrics adm
  )
  SELECT 
    cr.domain::text,               -- Explicitly cast to match return type
    cr.device_type::text,          -- Explicitly cast to match return type
    cr.total_sessions::bigint,     -- Explicitly cast to match return type
    ROUND(cr.avg_citation_score, 2)::numeric,
    ROUND(cr.min_citation_score, 2)::numeric,
    ROUND(cr.max_citation_score, 2)::numeric,
    ROUND(cr.std_dev_citation_score, 2)::numeric,
    ROUND(cr.avg_ttfb, 2)::numeric,
    ROUND(cr.avg_dom_content_loaded, 2)::numeric,
    cr.ai_citation_possibility::text  -- Explicitly cast to match return type
  FROM 
    combined_results cr
  ORDER BY 
    cr.domain,
    CASE 
      WHEN cr.device_type = 'all' THEN 0
      WHEN cr.device_type = 'desktop' THEN 1
      WHEN cr.device_type = 'mobile' THEN 2
      WHEN cr.device_type = 'tablet' THEN 3
    END,
    cr.device_type;
END;
$_$;

CREATE OR REPLACE FUNCTION "public"."get_analytics_by_device_and_country"("p_domain_name" "text", "p_time_range" "text" DEFAULT 'all'::"text") RETURNS TABLE("device_type" "text", "country" "text", "total_page_views" bigint, "total_sessions" bigint, "unique_visitors" bigint, "unique_languages" bigint, "bounce_rate_percentage" numeric, "avg_pages_per_session" numeric)
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
WITH 
base_data AS (
  SELECT
    rm.id AS page_id,
    rm.session_id,
    rm.domain_name,
    rm.created_at,
    (
      SELECT e.value->>'country'
      FROM jsonb_array_elements(rm.events) AS e(value)
      WHERE e.value->>'type' = 'geo-info'
      LIMIT 1
    ) AS visitor_country,
    (
      SELECT e.value->>'language'
      FROM jsonb_array_elements(rm.events) AS e(value)
      WHERE e.value->>'type' = 'client-info'
      LIMIT 1
    ) AS visitor_language,
    (
      SELECT e.value->>'deviceType'
      FROM jsonb_array_elements(rm.events) AS e(value)
      WHERE e.value->>'type' = 'client-info'
      LIMIT 1
    ) AS visitor_device_type
  FROM 
    public.rum_metrics rm
  WHERE
    REGEXP_REPLACE(rm.domain_name, '^www\.', '') = REGEXP_REPLACE(p_domain_name, '^www\.', '')
    AND CASE 
      WHEN p_time_range = '24hours' THEN rm.created_at >= NOW() - INTERVAL '24 hours'
      WHEN p_time_range = '7days' THEN rm.created_at >= NOW() - INTERVAL '7 days'
      WHEN p_time_range = '30days' THEN rm.created_at >= NOW() - INTERVAL '30 days'
      WHEN p_time_range = '90days' THEN rm.created_at >= NOW() - INTERVAL '90 days'
      ELSE TRUE
    END
),

normalized_data AS (
  SELECT
    page_id,
    session_id,
    domain_name,
    created_at,
    visitor_country,
    visitor_language,
    CASE
      WHEN LOWER(visitor_device_type) LIKE '%mobile%' OR LOWER(visitor_device_type) LIKE '%phone%' THEN 'mobile'
      WHEN LOWER(visitor_device_type) LIKE '%tablet%' THEN 'tablet'
      WHEN LOWER(visitor_device_type) LIKE '%desktop%' OR LOWER(visitor_device_type) LIKE '%laptop%' OR LOWER(visitor_device_type) LIKE '%computer%' THEN 'desktop'
      ELSE 'other'
    END AS normalized_device_type
  FROM
    base_data
),

session_metrics AS (
  SELECT
    session_id,
    COUNT(*) AS pages_viewed,
    MAX(visitor_country) AS session_country,
    MAX(visitor_language) AS session_language,
    MAX(normalized_device_type) AS session_device_type
  FROM
    normalized_data
  GROUP BY
    session_id
),

device_country_metrics AS (
  SELECT
    COALESCE(sm.session_device_type, 'other') AS result_device_type,
    COALESCE(sm.session_country, 'Unknown') AS result_country,
    COUNT(DISTINCT nd.page_id) AS result_page_views,
    COUNT(DISTINCT sm.session_id) AS result_sessions,
    COUNT(DISTINCT sm.session_id) AS result_visitors,
    COUNT(DISTINCT nd.visitor_language) AS result_languages,
    COUNT(DISTINCT CASE WHEN sm.pages_viewed = 1 THEN sm.session_id END) AS bounced_sessions,
    SUM(sm.pages_viewed) AS total_pages_viewed
  FROM 
    normalized_data nd
  JOIN
    session_metrics sm ON nd.session_id = sm.session_id
  GROUP BY
    COALESCE(sm.session_device_type, 'other'),
    COALESCE(sm.session_country, 'Unknown')
),

all_devices_metrics AS (
  SELECT
    'all' AS result_device_type,
    dcm.result_country,
    SUM(dcm.result_page_views) AS result_page_views,
    SUM(dcm.result_sessions) AS result_sessions,
    SUM(dcm.result_visitors) AS result_visitors,
    SUM(dcm.result_languages) AS result_languages,
    SUM(dcm.bounced_sessions) AS bounced_sessions,
    SUM(dcm.total_pages_viewed) AS total_pages_viewed
  FROM
    device_country_metrics dcm
  GROUP BY
    dcm.result_country
),

device_aggregates AS (
  -- Mobile aggregation by country
  SELECT
    'mobile' AS result_device_type,
    dcm.result_country,
    SUM(dcm.result_page_views) AS result_page_views,
    SUM(dcm.result_sessions) AS result_sessions,
    SUM(dcm.result_visitors) AS result_visitors,
    SUM(dcm.result_languages) AS result_languages,
    SUM(dcm.bounced_sessions) AS bounced_sessions,
    SUM(dcm.total_pages_viewed) AS total_pages_viewed
  FROM
    device_country_metrics dcm
  WHERE
    dcm.result_device_type = 'mobile'
  GROUP BY
    dcm.result_country
  
  UNION ALL
  
  -- Desktop aggregation by country
  SELECT
    'desktop' AS result_device_type,
    dcm.result_country,
    SUM(dcm.result_page_views) AS result_page_views,
    SUM(dcm.result_sessions) AS result_sessions,
    SUM(dcm.result_visitors) AS result_visitors,
    SUM(dcm.result_languages) AS result_languages,
    SUM(dcm.bounced_sessions) AS bounced_sessions,
    SUM(dcm.total_pages_viewed) AS total_pages_viewed
  FROM
    device_country_metrics dcm
  WHERE
    dcm.result_device_type = 'desktop'
  GROUP BY
    dcm.result_country
    
  UNION ALL
  
  -- Tablet aggregation by country
  SELECT
    'tablet' AS result_device_type,
    dcm.result_country,
    SUM(dcm.result_page_views) AS result_page_views,
    SUM(dcm.result_sessions) AS result_sessions,
    SUM(dcm.result_visitors) AS result_visitors,
    SUM(dcm.result_languages) AS result_languages,
    SUM(dcm.bounced_sessions) AS bounced_sessions,
    SUM(dcm.total_pages_viewed) AS total_pages_viewed
  FROM
    device_country_metrics dcm
  WHERE
    dcm.result_device_type = 'tablet'
  GROUP BY
    dcm.result_country
),

combined_results AS (
  -- Include only the main device categories we want
  SELECT 
    result_device_type,
    result_country,
    result_page_views,
    result_sessions,
    result_visitors,
    result_languages,
    ROUND(
      100.0 * bounced_sessions / NULLIF(result_sessions, 0),
      2
    ) AS result_bounce_rate,
    ROUND(
      total_pages_viewed::numeric / NULLIF(result_sessions, 0),
      2
    ) AS result_pages_per_session
  FROM 
    device_country_metrics
  WHERE
    result_device_type IN ('mobile', 'desktop', 'tablet')
  
  UNION ALL
  
  -- Include the "all" aggregation - this is the key change for correct bounce rate
  SELECT 
    result_device_type,
    result_country,
    result_page_views,
    result_sessions,
    result_visitors,
    result_languages,
    ROUND(
      100.0 * bounced_sessions / NULLIF(result_sessions, 0),
      2
    ) AS result_bounce_rate,
    ROUND(
      total_pages_viewed::numeric / NULLIF(result_sessions, 0),
      2
    ) AS result_pages_per_session
  FROM 
    all_devices_metrics
)

SELECT
  result_device_type AS device_type,
  result_country AS country,
  result_page_views AS total_page_views,
  result_sessions AS total_sessions,
  result_visitors AS unique_visitors,
  result_languages AS unique_languages,
  result_bounce_rate AS bounce_rate_percentage,
  result_pages_per_session AS avg_pages_per_session
FROM
  combined_results
ORDER BY
  CASE 
    WHEN result_device_type = 'all' THEN 1
    WHEN result_device_type = 'desktop' THEN 2
    WHEN result_device_type = 'mobile' THEN 3
    WHEN result_device_type = 'tablet' THEN 4
    ELSE 5
  END,
  result_sessions DESC;
$$;

CREATE OR REPLACE FUNCTION "public"."get_daily_web_metrics"("target_date" "date") RETURNS SETOF "json"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  RETURN QUERY
  WITH rum_data AS (
    -- Get RUM data for the target date
    SELECT 
      domain_name AS domain,
      -- Extract from JSONB with fallback to 'unknown' if device_type is null
      COALESCE(
        (SELECT value->>'deviceType'
         FROM jsonb_array_elements(events) AS elem(value)
         WHERE value->>'type' = 'client-info'
         LIMIT 1
        ), 
        'unknown'
      ) AS device_type,
      session_id,
      current_page AS page_id,
      previous_page,
      events
    FROM 
      public.rum_metrics
    WHERE 
      DATE(created_at) = target_date
  ),
  
  -- Count sessions and pageviews
  domain_metrics AS (
    SELECT
      domain,
      device_type,
      COUNT(*) AS total_pageviews,
      COUNT(DISTINCT session_id) AS total_sessions
    FROM 
      rum_data
    GROUP BY 
      domain, device_type
  ),
  
  -- Extract country data
  country_data AS (
    SELECT
      domain,
      device_type,
      jsonb_object_agg(
        country, 
        count_val
      ) AS country_dist
    FROM (
      SELECT
        domain,
        device_type,
        COALESCE(
          (SELECT value->>'country'
           FROM jsonb_array_elements(events) AS elem(value)
           WHERE value->>'type' = 'geo-info'
           LIMIT 1
          ),
          'unknown'
        ) AS country,
        COUNT(*) AS count_val
      FROM 
        rum_data
      GROUP BY 
        domain, device_type, country
    ) country_counts
    GROUP BY 
      domain, device_type
  ),
  
  -- Identify LLM traffic by keyword match
  llm_traffic AS (
    SELECT
      domain,
      device_type,
      COUNT(DISTINCT session_id) AS llm_traffic_count
    FROM 
      rum_data
    WHERE previous_page ~* '(
  chatgpt|
  chat\.openai\.com|
  openai\.com|
  perplexity\.ai|
  gemini\.google\.com|
  bard\.google\.com|
  claude\.ai|
  grok\.x\.ai|
  bing\.com/chat|
  bing\.com/copilotsearch|
  copilot\.microsoft\.com|
  kimi\.moonshot\.cn|
  poe\.com|
  cohere\.com|
  anthropic\.com|
  phind\.com|
  you\.com|
  neeva\.com|
  x\.ai|
  huggingface\.co|
  mistral\.ai|
  reka\.ai|
  ora\.sh|
  tabnine\.com|
  deepmind\.com|
  meta\.ai|
  llama\.meta\.com|
  ai21\.com|
  cognition\.labs
)'

    GROUP BY 
      domain, device_type
  ),
  
  -- Calculate pages per session
  pages_per_session AS (
    SELECT
      domain,
      device_type,
      CASE 
        WHEN COUNT(DISTINCT session_id) > 0 THEN COUNT(*)::float / COUNT(DISTINCT session_id)
        ELSE 0
      END AS avg_pages
    FROM 
      rum_data
    GROUP BY 
      domain, device_type
  ),
  
  -- Calculate bounce rate (single-page sessions)
  bounce_rates AS (
    SELECT
      domain,
      device_type,
      CASE 
        WHEN COUNT(DISTINCT session_id) > 0 
          THEN (
            SELECT COUNT(*) 
            FROM (
              SELECT session_id
              FROM rum_data r2 
              WHERE r2.domain = r1.domain AND r2.device_type = r1.device_type 
              GROUP BY session_id 
              HAVING COUNT(*) = 1
            ) AS single_page_sessions
          )::float / COUNT(DISTINCT session_id) * 100
        ELSE 0
      END AS bounce_rate
    FROM 
      rum_data r1
    GROUP BY 
      domain, device_type
  ),
  
  -- Final aggregated data with only requested fields
  metrics AS (
    SELECT
      target_date AS date_collected,
      dm.domain AS domain_name,
      dm.device_type,
      dm.total_pageviews,
      dm.total_sessions,
      COALESCE(ps.avg_pages, 0) AS avg_pages_per_session,
      COALESCE(br.bounce_rate, 0) AS bounce_rate,
      COALESCE(lt.llm_traffic_count, 0) AS llm_traffic,
      CASE 
        WHEN dm.total_sessions > 0 THEN COALESCE(lt.llm_traffic_count, 0)::float / dm.total_sessions * 100
        ELSE 0
      END AS llm_traffic_percentage,
      COALESCE(cd.country_dist, '{}'::jsonb) AS country_distribution
    FROM 
      domain_metrics dm
    LEFT JOIN 
      pages_per_session ps ON dm.domain = ps.domain AND dm.device_type = ps.device_type
    LEFT JOIN 
      bounce_rates br ON dm.domain = br.domain AND dm.device_type = br.device_type
    LEFT JOIN 
      llm_traffic lt ON dm.domain = lt.domain AND dm.device_type = lt.device_type
    LEFT JOIN 
      country_data cd ON dm.domain = cd.domain AND dm.device_type = cd.device_type
  )
  
  -- Convert each row to JSON and return
  SELECT row_to_json(metrics) FROM metrics;
END;$$;

CREATE OR REPLACE FUNCTION "public"."get_lcp_image_metrics"("p_domain_name" "text" DEFAULT NULL::"text", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("period" "text", "domain_name" "text", "device_type" "text", "image_url" "text", "occurrence_count" bigint, "avg_lcp_ms" numeric, "min_lcp_ms" numeric, "max_lcp_ms" numeric, "p75_lcp_ms" numeric, "pct_exceeding_cwv" numeric, "avg_width" numeric, "avg_height" numeric, "pct_lazy" numeric, "avg_transfer_size" numeric, "avg_decoded_body_size" numeric, "avg_time_to_first_byte" numeric, "avg_resource_load_delay" numeric, "avg_element_render_delay" numeric, "avg_resource_load_duration" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$DECLARE
  v_start_time_ms bigint;
  v_end_time_ms   bigint;
  v_period        text;
  v_start_date    timestamptz;
  v_end_date      timestamptz;
BEGIN
  -- Default range to last 30 days if not provided
  v_start_date := COALESCE(p_start_date, now() - interval '30 days');
  v_end_date   := COALESCE(p_end_date, now());

  -- Guard: ensure start < end
  IF v_start_date >= v_end_date THEN
    RAISE EXCEPTION 'p_start_date (%) must be before p_end_date (%)',
      v_start_date, v_end_date;
  END IF;

  -- Milliseconds since epoch bounds
  v_start_time_ms := (extract(epoch from v_start_date) * 1000)::bigint;
  v_end_time_ms   := (extract(epoch from v_end_date) * 1000)::bigint;

  -- Period label (UTC)
  v_period :=
      to_char(v_start_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"')
      || ' to ' ||
      to_char(v_end_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"');

  RETURN QUERY
  WITH expanded AS (
    -- Unnest JSON once
    SELECT
      rm.domain_name,
      rm.session_id,
      rm.created_at,
      event
    FROM public.rum_metrics rm
    CROSS JOIN LATERAL jsonb_array_elements(rm.events) AS event
    WHERE
      (p_domain_name IS NULL OR rm.domain_name = p_domain_name)
      AND rm.created_at >= v_start_date
      AND rm.created_at < v_end_date
  ),

  session_device_types AS (
    SELECT
      e.domain_name,
      e.session_id,
      e.event->>'deviceType' AS device_type
    FROM expanded e
    WHERE e.event->>'type' = 'client-info'
      AND e.event->>'deviceType' IS NOT NULL
  ),

  lcp_events AS (
    SELECT
      e.domain_name,
      e.session_id,
      e.event->'attribution'->>'url' AS image_url,
      (e.event->>'value')::numeric AS lcp_value_ms,
      (e.event->'attribution'->>'width')::numeric AS width,
      (e.event->'attribution'->>'height')::numeric AS height,
      (e.event->'attribution'->>'isLazy')::boolean AS is_lazy,
      (e.event->'attribution'->>'transferSize')::numeric AS transfer_size,
      (e.event->'attribution'->>'decodedBodySize')::numeric AS decoded_body_size,
      (e.event->'attribution'->>'timeToFirstByte')::numeric AS time_to_first_byte,
      (e.event->'attribution'->>'resourceLoadDelay')::numeric AS resource_load_delay,
      (e.event->'attribution'->>'elementRenderDelay')::numeric AS element_render_delay,
      (e.event->'attribution'->>'resourceLoadDuration')::numeric AS resource_load_duration
    FROM expanded e
    WHERE e.event->>'type' = 'web-vital'
      AND e.event->>'name' = 'LCP'
      AND e.event->'attribution'->>'url' IS NOT NULL
  ),

  joined_data AS (
    SELECT
      le.domain_name,
      COALESCE(initcap(sdt.device_type), 'Unknown') AS device_type,
      le.image_url,
      le.lcp_value_ms,
      le.width,
      le.height,
      le.is_lazy,
      le.transfer_size,
      le.decoded_body_size,
      le.time_to_first_byte,
      le.resource_load_delay,
      le.element_render_delay,
      le.resource_load_duration
    FROM lcp_events le
    LEFT JOIN session_device_types sdt
      ON le.session_id = sdt.session_id
     AND le.domain_name = sdt.domain_name
  ),

  aggregated_data AS (
    SELECT
      jd.domain_name,
      jd.device_type,
      jd.image_url,
      COUNT(*) AS occurrence_count,
      ROUND(AVG(jd.lcp_value_ms), 2) AS avg_lcp_ms,
      MIN(jd.lcp_value_ms) AS min_lcp_ms,
      MAX(jd.lcp_value_ms) AS max_lcp_ms,
      PERCENTILE_CONT(0.75)
        WITHIN GROUP (ORDER BY jd.lcp_value_ms)::numeric(10,2) AS p75_lcp_ms,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE jd.lcp_value_ms > 2500)
        / COUNT(*),
        2
      ) AS pct_exceeding_cwv,
      ROUND(AVG(jd.width), 2) AS avg_width,
      ROUND(AVG(jd.height), 2) AS avg_height,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE jd.is_lazy)
        / COUNT(*),
        2
      ) AS pct_lazy,
      ROUND(AVG(jd.transfer_size), 2) AS avg_transfer_size,
      ROUND(AVG(jd.decoded_body_size), 2) AS avg_decoded_body_size,
      ROUND(AVG(jd.time_to_first_byte), 2) AS avg_time_to_first_byte,
      ROUND(AVG(jd.resource_load_delay), 2) AS avg_resource_load_delay,
      ROUND(AVG(jd.element_render_delay), 2) AS avg_element_render_delay,
      ROUND(AVG(jd.resource_load_duration), 2) AS avg_resource_load_duration
    FROM joined_data jd
    GROUP BY jd.domain_name, jd.device_type, jd.image_url
  ),

  ranked_data AS (
    SELECT
      ad.*,
      ROW_NUMBER() OVER (
        PARTITION BY ad.device_type
        ORDER BY ad.occurrence_count DESC
      ) AS rank
    FROM aggregated_data ad
  )

  SELECT
    v_period,
    rd.domain_name,
    rd.device_type,
    rd.image_url,
    rd.occurrence_count,
    rd.avg_lcp_ms,
    rd.min_lcp_ms,
    rd.max_lcp_ms,
    rd.p75_lcp_ms,
    rd.pct_exceeding_cwv,
    rd.avg_width,
    rd.avg_height,
    rd.pct_lazy,
    rd.avg_transfer_size,
    rd.avg_decoded_body_size,
    rd.avg_time_to_first_byte,
    rd.avg_resource_load_delay,
    rd.avg_element_render_delay,
    rd.avg_resource_load_duration
  FROM ranked_data rd
  WHERE rd.rank <= 10
  ORDER BY rd.device_type, rd.occurrence_count DESC;

END;$$;

CREATE OR REPLACE FUNCTION "public"."get_mailing_list"() RETURNS TABLE("website_name" "text", "email" "text", "report_verbosity" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    o.website_name,
    COALESCE(
      NULLIF(er.optional_email, 'null'), 
      u.email::text
    ) AS email,
    er.report_verbosity
  FROM public.email_reporting er
  JOIN public.orders o 
    ON er.order_id = o.order_id
  JOIN auth.users u 
    ON o.user_id = u.id;
$$;

REVOKE ALL ON FUNCTION "public"."get_mailing_list"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_mailing_list"() TO "service_role";

CREATE OR REPLACE FUNCTION "public"."get_rum_history"("p_domain" "text", "p_from" "date", "p_to" "date") RETURNS TABLE("day" "date", "cls" "jsonb", "fcp" "jsonb", "inp" "jsonb", "lcp" "jsonb", "ttfb" "jsonb")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT r.day, r.cls, r.fcp, r.inp, r.lcp, r.ttfb
  FROM public.rum_history_new AS r
  WHERE r.domain_name = p_domain
    AND r.day BETWEEN p_from AND p_to
  ORDER BY r.day;
$$;

CREATE OR REPLACE FUNCTION "public"."get_rum_web_vitals_metrics"("p_domain_name" "text", "p_date_range" "text" DEFAULT '30days'::"text") RETURNS TABLE("report_date" "date", "device_category" "text", "fcp_samples" bigint, "fcp_avg" numeric, "fcp_min" numeric, "fcp_max" numeric, "fcp_p50" numeric, "fcp_p75" numeric, "fcp_p90" numeric, "fcp_p95" numeric, "fcp_p99" numeric, "lcp_samples" bigint, "lcp_avg" numeric, "lcp_min" numeric, "lcp_max" numeric, "lcp_p50" numeric, "lcp_p75" numeric, "lcp_p90" numeric, "lcp_p95" numeric, "lcp_p99" numeric, "cls_samples" bigint, "cls_avg" numeric, "cls_min" numeric, "cls_max" numeric, "cls_p50" numeric, "cls_p75" numeric, "cls_p90" numeric, "cls_p95" numeric, "cls_p99" numeric, "inp_samples" bigint, "inp_avg" numeric, "inp_min" numeric, "inp_max" numeric, "inp_p50" numeric, "inp_p75" numeric, "inp_p90" numeric, "inp_p95" numeric, "inp_p99" numeric, "ttfb_samples" bigint, "ttfb_avg" numeric, "ttfb_min" numeric, "ttfb_max" numeric, "ttfb_p50" numeric, "ttfb_p75" numeric, "ttfb_p90" numeric, "ttfb_p95" numeric, "ttfb_p99" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_interval interval;
  v_start_date date;
  v_end_date date := CURRENT_DATE;
  v_normalized_domain text;
BEGIN
  -- Normalize domain name by removing 'www.' prefix if present
  v_normalized_domain := CASE 
    WHEN lower(p_domain_name) LIKE 'www.%' THEN substring(lower(p_domain_name) from 5)
    ELSE lower(p_domain_name)
  END;
  
  -- Convert date range string to interval
  CASE lower(p_date_range)
    WHEN '24hours' THEN v_interval := INTERVAL '24 hours';
    WHEN '7days' THEN v_interval := INTERVAL '7 days';
    WHEN '30days' THEN v_interval := INTERVAL '30 days';
    WHEN '90days' THEN v_interval := INTERVAL '90 days';
    ELSE v_interval := INTERVAL '30 days'; -- Default to 30 days
  END CASE;
  
  -- Calculate start date
  v_start_date := v_end_date - v_interval;

  RETURN QUERY
  WITH session_device_mapping AS (
    -- Create a mapping of session IDs to device types
    -- Use the first device type reported for each session
    SELECT DISTINCT ON (e->>'sessionId')
      e->>'sessionId' AS session_id,
      COALESCE(e->>'deviceType', 'desktop') AS device_type_val
    FROM
      rum_metrics,
      jsonb_array_elements(events) AS e
    WHERE
      -- Match both with and without www. prefix
      (
        lower(domain_name) = v_normalized_domain OR 
        lower(domain_name) = 'www.' || v_normalized_domain
      )
      AND created_at >= v_start_date
      AND e->>'type' = 'client-info'
      AND e->>'sessionId' IS NOT NULL
    ORDER BY
      e->>'sessionId', created_at -- Take the first occurrence for each session
  ),
  web_vitals AS (
    -- Extract all web vitals with their session IDs
    SELECT
      DATE(rm.created_at) AS event_date,
      e->>'sessionId' AS session_id,
      e->>'name' AS metric_name,
      (e->>'value')::numeric AS metric_value
    FROM
      rum_metrics rm,
      jsonb_array_elements(events) AS e
    WHERE
      -- Match both with and without www. prefix
      (
        lower(rm.domain_name) = v_normalized_domain OR 
        lower(rm.domain_name) = 'www.' || v_normalized_domain
      )
      AND rm.created_at >= v_start_date
      AND e->>'type' = 'web-vital'
      AND e->>'sessionId' IS NOT NULL
      AND e->>'name' IS NOT NULL
      AND e->>'value' IS NOT NULL
  ),
  metrics_with_device AS (
    -- Join web vitals with device types
    SELECT
      wv.event_date,
      COALESCE(sdm.device_type_val, 'desktop') AS device_type_val,
      wv.metric_name,
      wv.metric_value
    FROM
      web_vitals wv
      LEFT JOIN session_device_mapping sdm ON wv.session_id = sdm.session_id
  ),
  daily_metrics AS (
    -- Calculate all metrics per day and metric type
    SELECT
      event_date,
      device_type_val,
      metric_name,
      COUNT(*) AS samples,
      ROUND(AVG(metric_value)::numeric, 2) AS avg,
      ROUND(MIN(metric_value)::numeric, 2) AS min,
      ROUND(MAX(metric_value)::numeric, 2) AS max,
      ROUND((PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY metric_value))::numeric, 2) AS p50,
      ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value))::numeric, 2) AS p75,
      ROUND((PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY metric_value))::numeric, 2) AS p90,
      ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value))::numeric, 2) AS p95,
      ROUND((PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value))::numeric, 2) AS p99
    FROM
      metrics_with_device
    GROUP BY
      event_date, device_type_val, metric_name
  )

  -- Pivot the results to get one row per day with all metrics
  SELECT
    dm.event_date AS report_date,
    dm.device_type_val AS device_category,
    -- FCP metrics
    MAX(CASE WHEN dm.metric_name = 'FCP' THEN dm.samples END) AS fcp_samples,
    MAX(CASE WHEN dm.metric_name = 'FCP' THEN dm.avg END) AS fcp_avg,
    MAX(CASE WHEN dm.metric_name = 'FCP' THEN dm.min END) AS fcp_min,
    MAX(CASE WHEN dm.metric_name = 'FCP' THEN dm.max END) AS fcp_max,
    MAX(CASE WHEN dm.metric_name = 'FCP' THEN dm.p50 END) AS fcp_p50,
    MAX(CASE WHEN dm.metric_name = 'FCP' THEN dm.p75 END) AS fcp_p75,
    MAX(CASE WHEN dm.metric_name = 'FCP' THEN dm.p90 END) AS fcp_p90,
    MAX(CASE WHEN dm.metric_name = 'FCP' THEN dm.p95 END) AS fcp_p95,
    MAX(CASE WHEN dm.metric_name = 'FCP' THEN dm.p99 END) AS fcp_p99,
    
    -- LCP metrics
    MAX(CASE WHEN dm.metric_name = 'LCP' THEN dm.samples END) AS lcp_samples,
    MAX(CASE WHEN dm.metric_name = 'LCP' THEN dm.avg END) AS lcp_avg,
    MAX(CASE WHEN dm.metric_name = 'LCP' THEN dm.min END) AS lcp_min,
    MAX(CASE WHEN dm.metric_name = 'LCP' THEN dm.max END) AS lcp_max,
    MAX(CASE WHEN dm.metric_name = 'LCP' THEN dm.p50 END) AS lcp_p50,
    MAX(CASE WHEN dm.metric_name = 'LCP' THEN dm.p75 END) AS lcp_p75,
    MAX(CASE WHEN dm.metric_name = 'LCP' THEN dm.p90 END) AS lcp_p90,
    MAX(CASE WHEN dm.metric_name = 'LCP' THEN dm.p95 END) AS lcp_p95,
    MAX(CASE WHEN dm.metric_name = 'LCP' THEN dm.p99 END) AS lcp_p99,
    
    -- CLS metrics
    MAX(CASE WHEN dm.metric_name = 'CLS' THEN dm.samples END) AS cls_samples,
    MAX(CASE WHEN dm.metric_name = 'CLS' THEN dm.avg END) AS cls_avg,
    MAX(CASE WHEN dm.metric_name = 'CLS' THEN dm.min END) AS cls_min,
    MAX(CASE WHEN dm.metric_name = 'CLS' THEN dm.max END) AS cls_max,
    MAX(CASE WHEN dm.metric_name = 'CLS' THEN dm.p50 END) AS cls_p50,
    MAX(CASE WHEN dm.metric_name = 'CLS' THEN dm.p75 END) AS cls_p75,
    MAX(CASE WHEN dm.metric_name = 'CLS' THEN dm.p90 END) AS cls_p90,
    MAX(CASE WHEN dm.metric_name = 'CLS' THEN dm.p95 END) AS cls_p95,
    MAX(CASE WHEN dm.metric_name = 'CLS' THEN dm.p99 END) AS cls_p99,
    
    -- INP metrics
    MAX(CASE WHEN dm.metric_name = 'INP' THEN dm.samples END) AS inp_samples,
    MAX(CASE WHEN dm.metric_name = 'INP' THEN dm.avg END) AS inp_avg,
    MAX(CASE WHEN dm.metric_name = 'INP' THEN dm.min END) AS inp_min,
    MAX(CASE WHEN dm.metric_name = 'INP' THEN dm.max END) AS inp_max,
    MAX(CASE WHEN dm.metric_name = 'INP' THEN dm.p50 END) AS inp_p50,
    MAX(CASE WHEN dm.metric_name = 'INP' THEN dm.p75 END) AS inp_p75,
    MAX(CASE WHEN dm.metric_name = 'INP' THEN dm.p90 END) AS inp_p90,
    MAX(CASE WHEN dm.metric_name = 'INP' THEN dm.p95 END) AS inp_p95,
    MAX(CASE WHEN dm.metric_name = 'INP' THEN dm.p99 END) AS inp_p99,
    
    -- TTFB metrics
    MAX(CASE WHEN dm.metric_name = 'TTFB' THEN dm.samples END) AS ttfb_samples,
    MAX(CASE WHEN dm.metric_name = 'TTFB' THEN dm.avg END) AS ttfb_avg,
    MAX(CASE WHEN dm.metric_name = 'TTFB' THEN dm.min END) AS ttfb_min,
    MAX(CASE WHEN dm.metric_name = 'TTFB' THEN dm.max END) AS ttfb_max,
    MAX(CASE WHEN dm.metric_name = 'TTFB' THEN dm.p50 END) AS ttfb_p50,
    MAX(CASE WHEN dm.metric_name = 'TTFB' THEN dm.p75 END) AS ttfb_p75,
    MAX(CASE WHEN dm.metric_name = 'TTFB' THEN dm.p90 END) AS ttfb_p90,
    MAX(CASE WHEN dm.metric_name = 'TTFB' THEN dm.p95 END) AS ttfb_p95,
    MAX(CASE WHEN dm.metric_name = 'TTFB' THEN dm.p99 END) AS ttfb_p99
  FROM
    daily_metrics dm
  GROUP BY
    dm.event_date, dm.device_type_val
  -- Only include rows where we have actual data
  HAVING
    MAX(CASE WHEN dm.metric_name = 'FCP' THEN dm.samples END) IS NOT NULL OR
    MAX(CASE WHEN dm.metric_name = 'LCP' THEN dm.samples END) IS NOT NULL OR
    MAX(CASE WHEN dm.metric_name = 'CLS' THEN dm.samples END) IS NOT NULL OR
    MAX(CASE WHEN dm.metric_name = 'INP' THEN dm.samples END) IS NOT NULL OR
    MAX(CASE WHEN dm.metric_name = 'TTFB' THEN dm.samples END) IS NOT NULL
  ORDER BY
    dm.event_date DESC, dm.device_type_val;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_web_vital_counts_by_url"("p_domain" "text", "p_metric" "text", "p_limit" integer DEFAULT 15) RETURNS TABLE("url" "text", "good" bigint, "poor" bigint, "needs_improvement" bigint)
    LANGUAGE "sql" STABLE
    AS $$
with top_urls as (
  select rm.current_page as url, count(*) as visits
  from public.rum_metrics rm
  where rm.domain_name = p_domain
    and rm.current_page is not null and rm.current_page <> ''
  group by rm.current_page
  order by visits desc
  limit p_limit
), metric_events as (
  select
    rm.id,
    rm.current_page as url,
    (e->>'rating') as rating,
    row_number() over (
      partition by rm.id
      order by coalesce((e->>'timestamp')::bigint, 0) desc,
               coalesce((e->>'value')::numeric, 0) desc
    ) as rn
  from public.rum_metrics rm
  cross join lateral jsonb_array_elements(rm.events) as e
  where rm.domain_name = p_domain
    and rm.current_page is not null and rm.current_page <> ''
    and e->>'type' = 'web-vital'
    and e->>'name' = p_metric
), latest as (
  select url, rating
  from metric_events
  where rn = 1
)
select
  tu.url,
  count(l.*) filter (where l.rating = 'good') as good,
  count(l.*) filter (where l.rating = 'poor') as poor,
  count(l.*) filter (where l.rating = 'needs improvement') as needs_improvement
from top_urls tu
left join latest l on l.url = tu.url
group by tu.url
order by count(l.*) desc nulls last;
$$;

CREATE OR REPLACE FUNCTION "public"."get_web_vital_counts_by_url"("p_domain" "text", "p_metric" "text", "p_device_type" "text" DEFAULT NULL::"text", "p_start" timestamp with time zone DEFAULT ("now"() - '1 mon'::interval), "p_end" timestamp with time zone DEFAULT "now"(), "p_limit" integer DEFAULT 15) RETURNS TABLE("url" "text", "good" bigint, "poor" bigint, "needs_improvement" bigint)
    LANGUAGE "sql" STABLE
    AS $$
with base as (
  -- Compute device_type once per row from the client-info event
  select
    rm.*,
    ci.device_type
  from public.rum_metrics rm
  left join lateral (
    select e->>'deviceType' as device_type
    from jsonb_array_elements(rm.events) e
    where e->>'type' = 'client-info'
    limit 1
  ) ci on true
  where rm.domain_name = p_domain
    and rm.current_page is not null
    and rm.current_page <> ''
    and rm.created_at >= p_start
    and rm.created_at <  p_end
    and (
      p_device_type is null
      or ci.device_type = p_device_type
    )
),
top_urls as (
  select b.current_page as url, count(*) as visits
  from base b
  group by b.current_page
  order by visits desc
  limit p_limit
),
metric_events as (
  select
    b.id,
    b.current_page as url,
    (e->>'rating') as rating,
    row_number() over (
      partition by b.id
      order by coalesce((e->>'timestamp')::bigint, 0) desc,
               coalesce((e->>'value')::numeric, 0) desc
    ) as rn
  from base b
  cross join lateral jsonb_array_elements(b.events) as e
  where e->>'type' = 'web-vital'
    and e->>'name' = p_metric
),
latest as (
  select url, rating
  from metric_events
  where rn = 1
)
select
  tu.url,
  count(l.*) filter (where l.rating = 'good') as good,
  count(l.*) filter (where l.rating = 'poor') as poor,
  count(l.*) filter (where l.rating = 'needs improvement') as needs_improvement
from top_urls tu
left join latest l on l.url = tu.url
group by tu.url
order by count(l.*) desc nulls last;
$$;

CREATE OR REPLACE FUNCTION "public"."get_web_vitals_metrics"("p_domain" "text") RETURNS TABLE("domain_name" "text", "page" "text", "device_type" "text", "metric_name" "text", "sample_count" bigint, "avg_value" numeric, "p50" numeric, "p75" numeric, "p90" numeric, "p95" numeric, "p99" numeric, "min_value" numeric, "max_value" numeric, "good_percent" numeric, "needs_improvement_percent" numeric, "poor_percent" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_start_date timestamp := NOW() - INTERVAL '7 days';
  v_domain_variations text[];
  v_base_domain text;
BEGIN
  -- Create domain variations to search for
  IF p_domain LIKE 'www.%' THEN
    v_base_domain := SUBSTRING(p_domain FROM 5);
    v_domain_variations := ARRAY[p_domain, v_base_domain];
  ELSE
    v_base_domain := p_domain;
    v_domain_variations := ARRAY[p_domain, 'www.' || p_domain];
  END IF;

  RETURN QUERY
  WITH client_info AS (
    SELECT
      rm.id,
      rm.session_id,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(rm.events) as ci
          WHERE ci->>'type' = 'client-info' AND ci->>'deviceType' IS NOT NULL
        ) THEN (
          SELECT ci->>'deviceType' 
          FROM jsonb_array_elements(rm.events) as ci
          WHERE ci->>'type' = 'client-info' AND ci->>'deviceType' IS NOT NULL
          LIMIT 1
        )
        WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(rm.events) as ci
          WHERE ci->>'type' = 'client-info' AND ci->>'viewport' IS NOT NULL
        ) THEN (
          SELECT 
            CASE
              WHEN (ci->'viewport'->>'width')::INT < 768 THEN 'mobile'
              WHEN (ci->'viewport'->>'width')::INT < 1024 THEN 'tablet'
              ELSE 'desktop'
            END
          FROM jsonb_array_elements(rm.events) as ci
          WHERE ci->>'type' = 'client-info' AND ci->>'viewport' IS NOT NULL
          LIMIT 1
        )
        WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(rm.events) as ci
          WHERE ci->>'type' = 'client-info' 
            AND (
              (ci->>'userAgent')::TEXT ILIKE '%mobile%' OR 
              (ci->>'userAgent')::TEXT ILIKE '%android%' OR
              (ci->>'userAgent')::TEXT ILIKE '%iphone%'
            )
        ) THEN 'mobile'
        WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(rm.events) as ci
          WHERE ci->>'type' = 'client-info' 
            AND (
              (ci->>'userAgent')::TEXT ILIKE '%tablet%' OR 
              (ci->>'userAgent')::TEXT ILIKE '%ipad%'
            )
        ) THEN 'tablet'
        ELSE 'desktop'
      END as device_type
    FROM public.rum_metrics rm
    WHERE rm.domain_name = ANY(v_domain_variations)
      AND rm.created_at >= v_start_date
  ),
  web_vitals AS (
    SELECT
      rm.domain_name AS domain_name,
      event->>'page' AS page,
      LOWER(event->>'name') AS metric_name_lower,
      event->>'name' AS metric_name,
      NULLIF(event->>'value', '')::numeric AS metric_value,
      rm.created_at,
      ci.device_type AS device_type
    FROM
      public.rum_metrics rm
      JOIN client_info ci ON rm.id = ci.id,
      jsonb_array_elements(rm.events) AS event
    WHERE
      rm.domain_name = ANY(v_domain_variations)
      AND rm.created_at >= v_start_date
      AND LOWER(event->>'name') IN ('cls', 'fid', 'lcp', 'fcp', 'ttfb', 'inp')
      AND event->>'value' ~ '^[0-9]+\.?[0-9]*$'
  ),
  categorized_metrics AS (
    SELECT
      wv.domain_name,
      wv.page,
      wv.device_type,
      wv.metric_name,
      wv.metric_name_lower,
      wv.metric_value,
      CASE 
        -- CLS (unitless)
        WHEN wv.metric_name_lower = 'cls' AND wv.metric_value <= 0.1 THEN 'Good'
        WHEN wv.metric_name_lower = 'cls' AND wv.metric_value <= 0.25 THEN 'Needs Improvement'
        WHEN wv.metric_name_lower = 'cls' AND wv.metric_value > 0.25 THEN 'Poor'
        -- FID (ms)
        WHEN wv.metric_name_lower = 'fid' AND wv.metric_value <= 100 THEN 'Good'
        WHEN wv.metric_name_lower = 'fid' AND wv.metric_value <= 300 THEN 'Needs Improvement'
        WHEN wv.metric_name_lower = 'fid' AND wv.metric_value > 300 THEN 'Poor'
        -- LCP (ms)
        WHEN wv.metric_name_lower = 'lcp' AND wv.metric_value <= 2500 THEN 'Good'
        WHEN wv.metric_name_lower = 'lcp' AND wv.metric_value <= 4000 THEN 'Needs Improvement'
        WHEN wv.metric_name_lower = 'lcp' AND wv.metric_value > 4000 THEN 'Poor'
        -- FCP (ms)
        WHEN wv.metric_name_lower = 'fcp' AND wv.metric_value <= 1800 THEN 'Good'
        WHEN wv.metric_name_lower = 'fcp' AND wv.metric_value <= 3000 THEN 'Needs Improvement'
        WHEN wv.metric_name_lower = 'fcp' AND wv.metric_value > 3000 THEN 'Poor'
        -- TTFB (ms)
        WHEN wv.metric_name_lower = 'ttfb' AND wv.metric_value <= 800 THEN 'Good'
        WHEN wv.metric_name_lower = 'ttfb' AND wv.metric_value <= 1800 THEN 'Needs Improvement'
        WHEN wv.metric_name_lower = 'ttfb' AND wv.metric_value > 1800 THEN 'Poor'
        -- INP (ms)
        WHEN wv.metric_name_lower = 'inp' AND wv.metric_value <= 200 THEN 'Good'
        WHEN wv.metric_name_lower = 'inp' AND wv.metric_value <= 500 THEN 'Needs Improvement'
        WHEN wv.metric_name_lower = 'inp' AND wv.metric_value > 500 THEN 'Poor'
        ELSE 'Unknown'
      END AS performance_category
    FROM web_vitals wv
  ),
  metrics_by_device AS (
    SELECT
      v_base_domain AS domain_name,
      cm.page,
      cm.device_type,
      cm.metric_name,
      COUNT(*) AS sample_count,
      -- Average: CLS to 4 dp, others to 0 dp (ms)
      ROUND(AVG(cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS avg_value,
      ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS p50,
      ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS p75,
      ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS p90,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS p95,
      ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS p99,
      ROUND(MIN(cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS min_value,
      ROUND(MAX(cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS max_value,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cm.performance_category = 'Good') / NULLIF(COUNT(*), 0), 1) AS good_percent,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cm.performance_category = 'Needs Improvement') / NULLIF(COUNT(*), 0), 1) AS needs_improvement_percent,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cm.performance_category = 'Poor') / NULLIF(COUNT(*), 0), 1) AS poor_percent
    FROM categorized_metrics cm
    GROUP BY v_base_domain, cm.page, cm.device_type, cm.metric_name, cm.metric_name_lower
  ),
  all_devices_metrics AS (
    SELECT
      v_base_domain AS domain_name,
      cm.page,
      'all' AS device_type,
      cm.metric_name,
      COUNT(*) AS sample_count,
      ROUND(AVG(cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS avg_value,
      ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS p50,
      ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS p75,
      ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS p90,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS p95,
      ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS p99,
      ROUND(MIN(cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS min_value,
      ROUND(MAX(cm.metric_value)::numeric,
            CASE WHEN cm.metric_name_lower = 'cls' THEN 4 ELSE 0 END) AS max_value,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cm.performance_category = 'Good') / NULLIF(COUNT(*), 0), 1) AS good_percent,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cm.performance_category = 'Needs Improvement') / NULLIF(COUNT(*), 0), 1) AS needs_improvement_percent,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cm.performance_category = 'Poor') / NULLIF(COUNT(*), 0), 1) AS poor_percent
    FROM categorized_metrics cm
    GROUP BY v_base_domain, cm.page, cm.metric_name, cm.metric_name_lower
  ),
  combined_results AS (
    SELECT 
      mbd.domain_name AS domain_name,
      mbd.page AS page,
      mbd.device_type AS device_type,
      mbd.metric_name AS metric_name,
      mbd.sample_count,
      mbd.avg_value,
      mbd.p50,
      mbd.p75,
      mbd.p90,
      mbd.p95,
      mbd.p99,
      mbd.min_value,
      mbd.max_value,
      mbd.good_percent,
      mbd.needs_improvement_percent,
      mbd.poor_percent,
      CASE 
        WHEN mbd.device_type = 'all' THEN 0
        WHEN mbd.device_type = 'desktop' THEN 1
        WHEN mbd.device_type = 'tablet' THEN 2
        WHEN mbd.device_type = 'mobile' THEN 3
        ELSE 4
      END AS sort_order
    FROM metrics_by_device mbd
    
    UNION ALL
    
    SELECT 
      adm.domain_name AS domain_name,
      adm.page AS page,
      adm.device_type AS device_type,
      adm.metric_name AS metric_name,
      adm.sample_count,
      adm.avg_value,
      adm.p50,
      adm.p75,
      adm.p90,
      adm.p95,
      adm.p99,
      adm.min_value,
      adm.max_value,
      adm.good_percent,
      adm.needs_improvement_percent,
      adm.poor_percent,
      CASE 
        WHEN adm.device_type = 'all' THEN 0
        WHEN adm.device_type = 'desktop' THEN 1
        WHEN adm.device_type = 'tablet' THEN 2
        WHEN adm.device_type = 'mobile' THEN 3
        ELSE 4
      END AS sort_order
    FROM all_devices_metrics adm
  )
  
  SELECT
    cr.domain_name,
    cr.page,
    cr.device_type,
    cr.metric_name,
    cr.sample_count,
    cr.avg_value,
    cr.p50,
    cr.p75,
    cr.p90,
    cr.p95,
    cr.p99,
    cr.min_value,
    cr.max_value,
    cr.good_percent,
    cr.needs_improvement_percent,
    cr.poor_percent
  FROM combined_results cr
  ORDER BY
    cr.domain_name,
    cr.page,
    cr.sort_order,
    cr.metric_name;
END;
$_$;

CREATE OR REPLACE FUNCTION "public"."get_web_vitals_metrics"("p_domain" "text", "p_date_range" "text" DEFAULT '30days'::"text") RETURNS TABLE("domain_name" "text", "page" "text", "device_type" "text", "metric_name" "text", "sample_count" bigint, "avg_value" numeric, "p50" numeric, "p75" numeric, "p90" numeric, "p95" numeric, "p99" numeric, "min_value" numeric, "max_value" numeric, "good_percent" numeric, "needs_improvement_percent" numeric, "poor_percent" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_start_date timestamp;
  v_domain_variations text[];
  v_base_domain text;
BEGIN
  -- Set the start date based on the date range parameter
  v_start_date := CASE 
    WHEN p_date_range = '24hours' THEN NOW() - INTERVAL '24 hours'
    WHEN p_date_range = '7days' THEN NOW() - INTERVAL '7 days'
    WHEN p_date_range = '30days' THEN NOW() - INTERVAL '30 days'
    WHEN p_date_range = '90days' THEN NOW() - INTERVAL '90 days'
    ELSE NOW() - INTERVAL '30 days'  -- Default to 30 days
  END;
  
  -- Create domain variations to search for
  IF p_domain LIKE 'www.%' THEN
    v_base_domain := SUBSTRING(p_domain FROM 5);
    v_domain_variations := ARRAY[p_domain, v_base_domain];
  ELSE
    v_base_domain := p_domain;
    v_domain_variations := ARRAY[p_domain, 'www.' || p_domain];
  END IF;

  RETURN QUERY
  WITH client_info AS (
    SELECT
      rm.id,
      rm.session_id,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(rm.events) as ci
          WHERE ci->>'type' = 'client-info' AND ci->>'deviceType' IS NOT NULL
        ) THEN (
          SELECT ci->>'deviceType' 
          FROM jsonb_array_elements(rm.events) as ci
          WHERE ci->>'type' = 'client-info' AND ci->>'deviceType' IS NOT NULL
          LIMIT 1
        )
        WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(rm.events) as ci
          WHERE ci->>'type' = 'client-info' AND ci->>'viewport' IS NOT NULL
        ) THEN (
          SELECT 
            CASE
              WHEN (ci->'viewport'->>'width')::INT < 768 THEN 'mobile'
              WHEN (ci->'viewport'->>'width')::INT < 1024 THEN 'tablet'
              ELSE 'desktop'
            END
          FROM jsonb_array_elements(rm.events) as ci
          WHERE ci->>'type' = 'client-info' AND ci->>'viewport' IS NOT NULL
          LIMIT 1
        )
        WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(rm.events) as ci
          WHERE ci->>'type' = 'client-info' 
            AND (
              (ci->>'userAgent')::TEXT ILIKE '%mobile%' OR 
              (ci->>'userAgent')::TEXT ILIKE '%android%' OR
              (ci->>'userAgent')::TEXT ILIKE '%iphone%'
            )
        ) THEN 'mobile'
        WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(rm.events) as ci
          WHERE ci->>'type' = 'client-info' 
            AND (
              (ci->>'userAgent')::TEXT ILIKE '%tablet%' OR 
              (ci->>'userAgent')::TEXT ILIKE '%ipad%'
            )
        ) THEN 'tablet'
        ELSE 'desktop'
      END as device_type
    FROM public.rum_metrics rm
    WHERE rm.domain_name = ANY(v_domain_variations)
      AND rm.created_at >= v_start_date
  ),
  web_vitals AS (
    SELECT
      rm.domain_name AS domain_name,
      event->>'page' AS page,
      LOWER(event->>'name') AS metric_name_lower,
      event->>'name' AS metric_name,
      NULLIF(event->>'value', '')::numeric AS metric_value,
      rm.created_at,
      ci.device_type AS device_type
    FROM
      public.rum_metrics rm
      JOIN client_info ci ON rm.id = ci.id,
      jsonb_array_elements(rm.events) AS event
    WHERE
      rm.domain_name = ANY(v_domain_variations)
      AND rm.created_at >= v_start_date
      AND LOWER(event->>'name') IN ('cls', 'fid', 'lcp', 'fcp', 'ttfb', 'inp')
      AND event->>'value' ~ '^[0-9]+\.?[0-9]*$'
  ),
  categorized_metrics AS (
    SELECT
      wv.domain_name,
      wv.page,
      wv.device_type,
      wv.metric_name,
      wv.metric_value,
      CASE 
        WHEN wv.metric_name_lower = 'cls' AND wv.metric_value <= 0.1 THEN 'Good'
        WHEN wv.metric_name_lower = 'cls' AND wv.metric_value <= 0.25 THEN 'Needs Improvement'
        WHEN wv.metric_name_lower = 'cls' AND wv.metric_value > 0.25 THEN 'Poor'
        WHEN wv.metric_name_lower = 'fid' AND wv.metric_value <= 100 THEN 'Good'
        WHEN wv.metric_name_lower = 'fid' AND wv.metric_value <= 300 THEN 'Needs Improvement'
        WHEN wv.metric_name_lower = 'fid' AND wv.metric_value > 300 THEN 'Poor'
        WHEN wv.metric_name_lower = 'lcp' AND wv.metric_value <= 2500 THEN 'Good'
        WHEN wv.metric_name_lower = 'lcp' AND wv.metric_value <= 4000 THEN 'Needs Improvement'
        WHEN wv.metric_name_lower = 'lcp' AND wv.metric_value > 4000 THEN 'Poor'
        WHEN wv.metric_name_lower = 'fcp' AND wv.metric_value <= 1800 THEN 'Good'
        WHEN wv.metric_name_lower = 'fcp' AND wv.metric_value <= 3000 THEN 'Needs Improvement'
        WHEN wv.metric_name_lower = 'fcp' AND wv.metric_value > 3000 THEN 'Poor'
        WHEN wv.metric_name_lower = 'ttfb' AND wv.metric_value <= 800 THEN 'Good'
        WHEN wv.metric_name_lower = 'ttfb' AND wv.metric_value <= 1800 THEN 'Needs Improvement'
        WHEN wv.metric_name_lower = 'ttfb' AND wv.metric_value > 1800 THEN 'Poor'
        WHEN wv.metric_name_lower = 'inp' AND wv.metric_value <= 200 THEN 'Good'
        WHEN wv.metric_name_lower = 'inp' AND wv.metric_value <= 500 THEN 'Needs Improvement'
        WHEN wv.metric_name_lower = 'inp' AND wv.metric_value > 500 THEN 'Poor'
        ELSE 'Unknown'
      END AS performance_category
    FROM web_vitals wv
  ),
  metrics_by_device AS (
    SELECT
      v_base_domain AS domain_name,
      cm.page,
      cm.device_type,
      cm.metric_name,
      COUNT(*) AS sample_count,
      ROUND(AVG(cm.metric_value)::numeric, 2) AS avg_value,
      ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY cm.metric_value)::numeric, 2) AS p50,
      ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cm.metric_value)::numeric, 2) AS p75,
      ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY cm.metric_value)::numeric, 2) AS p90,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cm.metric_value)::numeric, 2) AS p95,
      ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY cm.metric_value)::numeric, 2) AS p99,
      ROUND(MIN(cm.metric_value)::numeric, 2) AS min_value,
      ROUND(MAX(cm.metric_value)::numeric, 2) AS max_value,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cm.performance_category = 'Good') / NULLIF(COUNT(*), 0), 1) AS good_percent,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cm.performance_category = 'Needs Improvement') / NULLIF(COUNT(*), 0), 1) AS needs_improvement_percent,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cm.performance_category = 'Poor') / NULLIF(COUNT(*), 0), 1) AS poor_percent
    FROM categorized_metrics cm
    GROUP BY v_base_domain, cm.page, cm.device_type, cm.metric_name
  ),
  all_devices_metrics AS (
    SELECT
      v_base_domain AS domain_name,
      cm.page,
      'all' AS device_type,
      cm.metric_name,
      COUNT(*) AS sample_count,
      ROUND(AVG(cm.metric_value)::numeric, 2) AS avg_value,
      ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY cm.metric_value)::numeric, 2) AS p50,
      ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cm.metric_value)::numeric, 2) AS p75,
      ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY cm.metric_value)::numeric, 2) AS p90,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cm.metric_value)::numeric, 2) AS p95,
      ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY cm.metric_value)::numeric, 2) AS p99,
      ROUND(MIN(cm.metric_value)::numeric, 2) AS min_value,
      ROUND(MAX(cm.metric_value)::numeric, 2) AS max_value,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cm.performance_category = 'Good') / NULLIF(COUNT(*), 0), 1) AS good_percent,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cm.performance_category = 'Needs Improvement') / NULLIF(COUNT(*), 0), 1) AS needs_improvement_percent,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cm.performance_category = 'Poor') / NULLIF(COUNT(*), 0), 1) AS poor_percent
    FROM categorized_metrics cm
    GROUP BY v_base_domain, cm.page, cm.metric_name
  ),
  combined_results AS (
    SELECT 
      mbd.domain_name AS domain_name,
      mbd.page AS page,
      mbd.device_type AS device_type,
      mbd.metric_name AS metric_name,
      mbd.sample_count,
      mbd.avg_value,
      mbd.p50,
      mbd.p75,
      mbd.p90,
      mbd.p95,
      mbd.p99,
      mbd.min_value,
      mbd.max_value,
      mbd.good_percent,
      mbd.needs_improvement_percent,
      mbd.poor_percent,
      CASE 
        WHEN mbd.device_type = 'all' THEN 0
        WHEN mbd.device_type = 'desktop' THEN 1
        WHEN mbd.device_type = 'tablet' THEN 2
        WHEN mbd.device_type = 'mobile' THEN 3
        ELSE 4
      END AS sort_order
    FROM metrics_by_device mbd
    
    UNION ALL
    
    SELECT 
      adm.domain_name AS domain_name,
      adm.page AS page,
      adm.device_type AS device_type,
      adm.metric_name AS metric_name,
      adm.sample_count,
      adm.avg_value,
      adm.p50,
      adm.p75,
      adm.p90,
      adm.p95,
      adm.p99,
      adm.min_value,
      adm.max_value,
      adm.good_percent,
      adm.needs_improvement_percent,
      adm.poor_percent,
      CASE 
        WHEN adm.device_type = 'all' THEN 0
        WHEN adm.device_type = 'desktop' THEN 1
        WHEN adm.device_type = 'tablet' THEN 2
        WHEN adm.device_type = 'mobile' THEN 3
        ELSE 4
      END AS sort_order
    FROM all_devices_metrics adm
  )
  
  SELECT
    cr.domain_name,
    cr.page,
    cr.device_type,
    cr.metric_name,
    cr.sample_count,
    cr.avg_value,
    cr.p50,
    cr.p75,
    cr.p90,
    cr.p95,
    cr.p99,
    cr.min_value,
    cr.max_value,
    cr.good_percent,
    cr.needs_improvement_percent,
    cr.poor_percent
  FROM combined_results cr
  ORDER BY
    cr.domain_name,
    cr.page,
    cr.sort_order,
    cr.metric_name;
END;
$_$;

CREATE OR REPLACE FUNCTION "public"."get_yesterday_usage_counts"() RETURNS TABLE("domain_name" "text", "usage_count" bigint)
    LANGUAGE "plpgsql"
    AS $$-- BEGIN

BEGIN
    RETURN QUERY
    SELECT
        rm.domain_name,
        COUNT(*)::BIGINT AS usage_count
    FROM public.rum_metrics rm
    WHERE rm.created_at >= (date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 day')
      AND rm.created_at < date_trunc('day', NOW() AT TIME ZONE 'UTC')
    GROUP BY rm.domain_name;
END;$$;

CREATE OR REPLACE FUNCTION "public"."inp_elements"("p_domain_name" "text") RETURNS TABLE("device" "text", "current_page" "text", "inp_value" numeric, "rating" "text", "interaction_type" "text", "target_element" "text", "input_delay" numeric, "processing_duration" numeric, "presentation_delay" numeric, "responsible_scripts" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
WITH RawData AS (
    SELECT 
        id,
        current_page,
        created_at,
        -- Extract Device Type from the 'client-info' object
        (SELECT e->>'deviceType' 
         FROM jsonb_array_elements(events) e 
         WHERE e->>'type' = 'client-info' LIMIT 1) as device_type,
        
        -- Extract the INP event object
        (SELECT e 
         FROM jsonb_array_elements(events) e 
         WHERE e->>'name' = 'INP' LIMIT 1) as inp_event,
         
        -- Extract the scripts array (the element that is a json array type)
        (SELECT e 
         FROM jsonb_array_elements(events) e 
         WHERE jsonb_typeof(e) = 'array' LIMIT 1) as scripts
    FROM public.rum_metrics
    WHERE domain_name = p_domain_name 
      AND events @> '[{"name": "INP"}]' 
),
FormattedData AS (
    SELECT
        current_page,
        COALESCE(device_type, 'unknown') as device,
        (inp_event->>'value')::numeric as inp_value,
        inp_event->>'rating' as rating,
        inp_event->'attribution'->>'target' as target_element,
        inp_event->'attribution'->>'eventType' as interaction_type,
        ROUND((inp_event->'attribution'->>'inputDelay')::numeric, 2) as input_delay,
        ROUND((inp_event->'attribution'->>'processingDuration')::numeric, 2) as processing_duration,
        ROUND((inp_event->'attribution'->>'presentationDelay')::numeric, 2) as presentation_delay,
        -- Summarize scripts into a comma-separated list of URLs
        (SELECT string_agg(s->>'URL', ', ') 
         FROM jsonb_array_elements(scripts) s) as responsible_scripts,
        created_at
    FROM RawData
    WHERE inp_event IS NOT NULL
),
RankedPages AS (
    SELECT 
        fd.device,
        fd.current_page,
        fd.inp_value,
        fd.rating,
        fd.interaction_type,
        fd.target_element,
        fd.input_delay,
        fd.processing_duration,
        fd.presentation_delay,
        fd.responsible_scripts,
        fd.created_at,
        ROW_NUMBER() OVER(PARTITION BY fd.device ORDER BY fd.created_at DESC) as rank
    FROM FormattedData fd
)
SELECT 
    rp.device,
    rp.current_page,
    rp.inp_value,
    rp.rating,
    rp.interaction_type,
    rp.target_element,
    rp.input_delay,
    rp.processing_duration,
    rp.presentation_delay,
    rp.responsible_scripts,
    rp.created_at
FROM RankedPages rp
WHERE rp.rank <= 20
ORDER BY rp.device, rp.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION "public"."lcp_attribution_by_device"("p_domain" "text" DEFAULT NULL::"text", "p_path_like" "text" DEFAULT NULL::"text", "p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_min_lcp" numeric DEFAULT 2500) RETURNS TABLE("url" "text", "lcp_type" "text", "device_type" "text", "target" "text", "target_url" "text", "width" integer, "height" integer, "islazy" boolean, "transfersize" numeric, "decodedbodysize" numeric, "ttfb" numeric, "resourceloaddelay" numeric, "elementrenderdelay" numeric, "resourceloadduration" numeric, "occurrences" bigint, "avg_lcp" numeric, "max_lcp" numeric)
    LANGUAGE "sql" STABLE
    AS $_$
with web_vitals as (
  select
    id,
    domain_name,
    current_page,
    created_at,
    jsonb_path_query(events, '$[*] ? (@.type == "web-vital" && @.name == "LCP")') as lcp_event,
    (jsonb_path_query_first(events, '$[*] ? (@.type == "client-info")')->>'deviceType') as device_type
  from public.rum_metrics
  where 1=1
    and (p_domain is null or domain_name = p_domain)
    and (p_path_like is null or current_page like p_path_like)
    and (p_from is null or created_at >= p_from)
    and (p_to   is null or created_at <= p_to)
), lcp_over as (
  select
    id,
    domain_name,
    current_page,
    created_at,
    device_type,
    (lcp_event->>'value')::numeric as lcp_value,
    lcp_event->'attribution' as attribution,
    lcp_event->'attribution'->>'url' as image_url
  from web_vitals
  where (lcp_event->>'value') is not null
), compact as (
  select 
    coalesce(image_url, 'NO_URL') as url,
    case when image_url is null or image_url = '' then 'non_image' else 'image' end as lcp_type,
    coalesce(device_type, 'unknown') as device_type,
    attribution->>'target' as target,
    attribution->>'url' as target_url,
    nullif(attribution->>'width','')::int as width,
    nullif(attribution->>'height','')::int as height,
    nullif(attribution->>'isLazy','')::bool as islazy,
    nullif(attribution->>'transferSize','')::numeric as transfersize,
    nullif(attribution->>'decodedBodySize','')::numeric as decodedbodysize,
    nullif(attribution->>'timeToFirstByte','')::numeric as ttfb,
    nullif(attribution->>'resourceLoadDelay','')::numeric as resourceloaddelay,
    nullif(attribution->>'elementRenderDelay','')::numeric as elementrenderdelay,
    nullif(attribution->>'resourceLoadDuration','')::numeric as resourceloadduration,
    lcp_value
  from lcp_over
  where lcp_value >= coalesce(p_min_lcp, 2500)
)
select 
  url,
  lcp_type,
  device_type,
  (array_agg(target order by lcp_value desc))[1] as target,
  (array_agg(target_url order by lcp_value desc))[1] as target_url,
  (array_agg(width order by lcp_value desc))[1] as width,
  (array_agg(height order by lcp_value desc))[1] as height,
  (array_agg(islazy order by lcp_value desc))[1] as islazy,
  (array_agg(transfersize order by lcp_value desc))[1] as transfersize,
  (array_agg(decodedbodysize order by lcp_value desc))[1] as decodedbodysize,
  (array_agg(ttfb order by lcp_value desc))[1] as ttfb,
  (array_agg(resourceloaddelay order by lcp_value desc))[1] as resourceloaddelay,
  (array_agg(elementrenderdelay order by lcp_value desc))[1] as elementrenderdelay,
  (array_agg(resourceloadduration order by lcp_value desc))[1] as resourceloadduration,
  count(*) as occurrences,
  round(avg(lcp_value),2) as avg_lcp,
  max(lcp_value) as max_lcp
from compact
group by url, lcp_type, device_type
order by device_type, avg_lcp desc nulls last;
$_$;

CREATE OR REPLACE FUNCTION "public"."page_performance_analysis"("p_domain" "text" DEFAULT NULL::"text") RETURNS TABLE("device_type" "text", "current_page" "text", "visit_count" bigint, "performance_group" "text", "avg_lcp_ms" numeric, "avg_cls" numeric, "avg_inp_ms" numeric, "lcp_elements" "jsonb", "cls_elements" "jsonb", "inp_elements" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH unnested_data AS (
        -- Step 1: Filter by date (last 7 days) and domain, then unnest
        SELECT 
            rm.session_id,
            rm.current_page,
            COALESCE(
              (SELECT x->>'deviceType' FROM jsonb_array_elements(rm.events) x WHERE x->>'type' = 'client-info' LIMIT 1), 
              'desktop'
            ) as device,
            evt->>'name' as m_name,
            (evt->>'value')::numeric as m_val,
            CASE 
                WHEN evt->>'name' = 'LCP' THEN evt->'attribution'->>'target'
                WHEN evt->>'name' = 'INP' THEN evt->'attribution'->>'target'
                WHEN evt->>'name' = 'CLS' THEN evt->'attribution'->>'largestShiftTarget'
            END as target_el
        FROM public.rum_metrics rm
        CROSS JOIN LATERAL jsonb_array_elements(rm.events) AS evt
        WHERE rm.created_at >= (CURRENT_DATE - INTERVAL '7 days')
          AND (p_domain IS NULL OR rm.domain_name = p_domain)
          AND evt->>'type' = 'web-vital'
    ),
    page_stats AS (
        -- Step 2: Aggregate metric averages
        SELECT 
            u.current_page,
            u.device as device_type,
            COUNT(DISTINCT u.session_id) as visits,
            AVG(u.m_val) FILTER (WHERE u.m_name = 'LCP') as avg_lcp,
            AVG(u.m_val) FILTER (WHERE u.m_name = 'CLS') as avg_cls,
            AVG(u.m_val) FILTER (WHERE u.m_name = 'INP') as avg_inp
        FROM unnested_data u
        GROUP BY 1, 2
    ),
    top_20_pages AS (
        -- Step 3: Limit workset to top 20 most visited URLs per device
        SELECT * FROM (
            SELECT *, 
                   ROW_NUMBER() OVER(PARTITION BY r.device_type ORDER BY r.visits DESC) as page_rank
            FROM page_stats r
        ) ranked
        WHERE page_rank <= 20
    ),
    top_elements AS (
        -- Step 4: Aggregate Top 3 elements for the selected 20 pages
        SELECT 
            t.current_page, t.device, t.m_name,
            jsonb_agg(jsonb_build_object('el', t.target_el, 'count', t.cnt) ORDER BY t.cnt DESC) as top_3
        FROM (
            SELECT u.current_page, u.device, u.m_name, u.target_el, COUNT(*) as cnt,
                   ROW_NUMBER() OVER(PARTITION BY u.current_page, u.device, u.m_name ORDER BY COUNT(*) DESC) as el_rank
            FROM unnested_data u
            INNER JOIN top_20_pages tp ON u.current_page = tp.current_page AND u.device = tp.device_type
            WHERE u.target_el IS NOT NULL
            GROUP BY 1, 2, 3, 4
        ) t
        WHERE t.el_rank <= 3
        GROUP BY 1, 2, 3
    )
    -- Step 5: Combine everything and assign performance labels
    SELECT 
        tp.device_type,
        tp.current_page,
        tp.visits::BIGINT,
        CASE 
            WHEN tp.avg_lcp <= 2500 AND tp.avg_cls <= 0.1 AND (tp.avg_inp <= 200 OR tp.avg_inp IS NULL) THEN 'Good'
            WHEN tp.avg_lcp > 4000 OR tp.avg_cls > 0.25 OR tp.avg_inp > 500 THEN 'Poor'
            ELSE 'Average'
        END as performance_group,
        ROUND(tp.avg_lcp, 0) as avg_lcp_ms,
        ROUND(tp.avg_cls, 3) as avg_cls,
        ROUND(tp.avg_inp, 0) as avg_inp_ms,
        COALESCE(tl.top_3, '[]'::jsonb) as lcp_elements,
        COALESCE(tc.top_3, '[]'::jsonb) as cls_elements,
        COALESCE(ti.top_3, '[]'::jsonb) as inp_elements
    FROM top_20_pages tp
    LEFT JOIN top_elements tl ON tp.current_page = tl.current_page AND tp.device_type = tl.device AND tl.m_name = 'LCP'
    LEFT JOIN top_elements tc ON tp.current_page = tc.current_page AND tp.device_type = tc.device AND tc.m_name = 'CLS'
    LEFT JOIN top_elements ti ON tp.current_page = ti.current_page AND tp.device_type = ti.device AND ti.m_name = 'INP'
    ORDER BY 
        tp.device_type,
        CASE 
            WHEN tp.avg_lcp > 4000 OR tp.avg_cls > 0.25 OR tp.avg_inp > 500 THEN 1 -- Poor first
            WHEN tp.avg_lcp <= 2500 AND tp.avg_cls <= 0.1 AND (tp.avg_inp <= 200 OR tp.avg_inp IS NULL) THEN 3 -- Good last
            ELSE 2 
        END ASC, 
        tp.visits DESC;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."recent_requests"("p_domain" "text", "p_limit" integer DEFAULT 30) RETURNS TABLE("id" integer, "session_id" "text", "current_page" "text", "created_at" timestamp with time zone, "city" "text", "country" "text", "device_type" "text", "ttfb" double precision, "cache_status" "text", "experience" "text", "backend_ms" double precision, "transfer_size" integer, "decoded_size" integer, "lcp_rating" "text", "lcp_value" double precision, "inp_rating" "text", "inp_value" double precision, "har_data" "jsonb")
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    id,
    session_id,
    current_page,
    created_at,
    (SELECT elem->>'city' FROM jsonb_array_elements(events) elem WHERE elem->>'type' = 'geo-info' LIMIT 1),
    (SELECT elem->>'country' FROM jsonb_array_elements(events) elem WHERE elem->>'type' = 'geo-info' LIMIT 1),
    (SELECT elem->>'deviceType' FROM jsonb_array_elements(events) elem WHERE elem->>'type' = 'client-info' LIMIT 1),
    (SELECT (elem->>'timeToFirstByte')::float FROM jsonb_array_elements(events) elem WHERE elem->>'type' = 'navigation-timings' LIMIT 1),
    (SELECT elem->>'cacheStatus' FROM jsonb_array_elements(events) elem WHERE elem->>'type' = 'navigation-timings' LIMIT 1),
    (SELECT elem->>'experienceCategory' FROM jsonb_array_elements(events) elem WHERE elem->>'type' = 'navigation-timings' LIMIT 1),
    (SELECT (elem->>'backendResponseTime')::float FROM jsonb_array_elements(events) elem WHERE elem->>'type' = 'navigation-timings' LIMIT 1),
    (SELECT (elem->>'transferSize')::int FROM jsonb_array_elements(events) elem WHERE elem->>'type' = 'navigation-timings' LIMIT 1),
    (SELECT (elem->>'decodedBodySize')::int FROM jsonb_array_elements(events) elem WHERE elem->>'type' = 'navigation-timings' LIMIT 1),
    (SELECT elem->>'rating' FROM jsonb_array_elements(events) elem WHERE elem->>'name' = 'LCP' LIMIT 1),
    (SELECT (elem->>'value')::float FROM jsonb_array_elements(events) elem WHERE elem->>'name' = 'LCP' LIMIT 1),
    (SELECT elem->>'rating' FROM jsonb_array_elements(events) elem WHERE elem->>'name' = 'INP' LIMIT 1),
    (SELECT (elem->>'value')::float FROM jsonb_array_elements(events) elem WHERE elem->>'name' = 'INP' LIMIT 1),
    (SELECT elem FROM jsonb_array_elements(events) elem WHERE elem->>'type' = 'resource-summary' LIMIT 1)
  FROM public.rum_metrics
  WHERE domain_name = p_domain
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION "public"."refresh_rum_daily_distributions"("p_day" "date" DEFAULT (CURRENT_DATE - 1)) RETURNS "void"
    LANGUAGE "sql"
    AS $$
  insert into public.rum_daily_distributions as rdd
    (day, domain_name, device_type, good, needs_improvement, poor)
  with device_by_session as (
    select
      rm.session_id,
      rm.domain_name,
      date(rm.created_at) as day,
      case
        when lower(ev->>'deviceType') in ('desktop','mobile','tablet') then lower(ev->>'deviceType')
        else 'unknown'
      end as device_type
    from public.rum_metrics rm
    cross join lateral jsonb_array_elements(rm.events) ev
    where ev->>'type' = 'client-info'
      and date(rm.created_at) = p_day
  ),
  metric_events as (
    select
      rm.session_id,
      rm.domain_name,
      date(rm.created_at) as day,
      upper(ev->>'name') as metric,
      lower(ev->>'rating') as rating
    from public.rum_metrics rm
    cross join lateral jsonb_array_elements(rm.events) ev
    where ev->>'type' = 'web-vital'
      and upper(ev->>'name') in ('LCP','INP','TTFB','FCP','CLS')
      and date(rm.created_at) = p_day
  ),
  joined as (
    select
      me.domain_name,
      me.day,
      coalesce(d.device_type, 'unknown') as device_type,
      me.metric,
      case
        when me.rating = 'good' then 'good'
        when me.rating in ('needs-improvement','needs_improvement','needs improvement') then 'needs_improvement'
        when me.rating = 'poor' then 'poor'
        else 'unknown'
      end as norm_rating
    from metric_events me
    left join device_by_session d
      on d.session_id = me.session_id
     and d.domain_name = me.domain_name
     and d.day = me.day
  ),
  counts as (
    select
      domain_name, day, device_type, norm_rating, metric,
      count(*)::bigint as cnt
    from joined
    where norm_rating in ('good','needs_improvement','poor')
    group by domain_name, day, device_type, norm_rating, metric
  ),
  final_rows as (
    select
      domain_name, day, device_type,
      coalesce(
        jsonb_build_object(
          'LCP',  coalesce(max(cnt) filter (where norm_rating = 'good'  and metric = 'LCP'),  0),
          'INP',  coalesce(max(cnt) filter (where norm_rating = 'good'  and metric = 'INP'),  0),
          'TTFB', coalesce(max(cnt) filter (where norm_rating = 'good'  and metric = 'TTFB'), 0),
          'FCP',  coalesce(max(cnt) filter (where norm_rating = 'good'  and metric = 'FCP'),  0),
          'CLS',  coalesce(max(cnt) filter (where norm_rating = 'good'  and metric = 'CLS'),  0)
        ),
        jsonb_build_object('LCP',0,'INP',0,'TTFB',0,'FCP',0,'CLS',0)
      ) as good,
      coalesce(
        jsonb_build_object(
          'LCP',  coalesce(max(cnt) filter (where norm_rating = 'needs_improvement' and metric = 'LCP'),  0),
          'INP',  coalesce(max(cnt) filter (where norm_rating = 'needs_improvement' and metric = 'INP'),  0),
          'TTFB', coalesce(max(cnt) filter (where norm_rating = 'needs_improvement' and metric = 'TTFB'), 0),
          'FCP',  coalesce(max(cnt) filter (where norm_rating = 'needs_improvement' and metric = 'FCP'),  0),
          'CLS',  coalesce(max(cnt) filter (where norm_rating = 'needs_improvement' and metric = 'CLS'),  0)
        ),
        jsonb_build_object('LCP',0,'INP',0,'TTFB',0,'FCP',0,'CLS',0)
      ) as needs_improvement,
      coalesce(
        jsonb_build_object(
          'LCP',  coalesce(max(cnt) filter (where norm_rating = 'poor' and metric = 'LCP'),  0),
          'INP',  coalesce(max(cnt) filter (where norm_rating = 'poor' and metric = 'INP'),  0),
          'TTFB', coalesce(max(cnt) filter (where norm_rating = 'poor' and metric = 'TTFB'), 0),
          'FCP',  coalesce(max(cnt) filter (where norm_rating = 'poor' and metric = 'FCP'),  0),
          'CLS',  coalesce(max(cnt) filter (where norm_rating = 'poor' and metric = 'CLS'),  0)
        ),
        jsonb_build_object('LCP',0,'INP',0,'TTFB',0,'FCP',0,'CLS',0)
      ) as poor
    from counts
    group by domain_name, day, device_type
  )
  select day, domain_name, device_type, good, needs_improvement, poor
  from final_rows
  on conflict (day, domain_name, device_type)
  do update set
    good = excluded.good,
    needs_improvement = excluded.needs_improvement,
    poor = excluded.poor,
    updated_at = now();
$$;

CREATE OR REPLACE FUNCTION "public"."rum_distributions_all_metrics"("p_domain_name" "text", "p_start" "date", "p_end" "date") RETURNS TABLE("device_type" "text", "metric" "text", "good_count" bigint, "needs_improvement_count" bigint, "poor_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
WITH base AS (
  SELECT
    rdd.device_type,
    rdd.good,
    rdd.needs_improvement,
    rdd.poor
  FROM public.rum_daily_distributions rdd
  WHERE rdd.domain_name = p_domain_name
    AND rdd.day >= p_start
    AND rdd.day <= p_end
),
metrics AS (
  -- Define the metric keys we want to aggregate
  SELECT UNNEST(ARRAY['LCP','INP','CLS','TTFB','FCP']) AS m
)
SELECT
  b.device_type,
  m.m AS metric,
  SUM(COALESCE((b.good->>m.m)::bigint, 0))              AS good_count,
  SUM(COALESCE((b.needs_improvement->>m.m)::bigint, 0)) AS needs_improvement_count,
  SUM(COALESCE((b.poor->>m.m)::bigint, 0))              AS poor_count
FROM base b
CROSS JOIN metrics m
GROUP BY b.device_type, m.m
ORDER BY b.device_type, m.m;
$$;

CREATE OR REPLACE FUNCTION "public"."set_email_reporting"("p_order_id" "uuid", "p_entries" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$begin
    -- Remove existing configuration
    delete
    from email_reporting
    where order_id = p_order_id;

    -- Insert the new configuration
    insert into email_reporting (
        order_id,
        optional_email,
        report_verbosity
    )
    select
        p_order_id,
        x.optional_email,
        x.report_verbosity
    from jsonb_to_recordset(p_entries) as x(
        optional_email text,
        report_verbosity smallint
    );
end;$$;

CREATE OR REPLACE FUNCTION "public"."third_party_domains"("site_filter" "text" DEFAULT NULL::"text", "time_range" "text" DEFAULT '7days'::"text") RETURNS TABLE("site_domain" "text", "device_type" "text", "top_domains" "jsonb")
    LANGUAGE "sql"
    AS $$
WITH time_params AS (
  SELECT
    CASE 
      WHEN time_range = '24hours' THEN NOW() - INTERVAL '24 hours'
      WHEN time_range = '7days' THEN NOW() - INTERVAL '7 days'
      ELSE NOW() - INTERVAL '7 days' -- Default to 7 days
    END AS start_time
),
client_info AS (
  -- Extract device types from client-info events
  SELECT 
    rm.id,
    rm.domain_name,
    e->>'sessionId' AS session_id,
    e->>'deviceType' AS device_type
  FROM rum_metrics rm,
  LATERAL jsonb_array_elements(events) AS e,
  time_params tp
  WHERE e->>'type' = 'client-info'
  AND e->>'deviceType' IS NOT NULL
  AND rm.created_at >= tp.start_time
  AND (site_filter IS NULL OR rm.domain_name = site_filter)
),
third_party_domains AS (
  -- Extract third-party domains with session IDs
  SELECT 
    rm.domain_name AS site_domain,
    e->>'sessionId' AS session_id,
    d.value AS third_party_domain
  FROM rum_metrics rm,
  LATERAL jsonb_array_elements(events) AS e,
  LATERAL jsonb_array_elements_text(e->'domains') AS d,
  time_params tp
  WHERE e->>'type' = 'third-party-asset-summary'
  AND rm.created_at >= tp.start_time
  AND (site_filter IS NULL OR rm.domain_name = site_filter)
),
device_domains AS (
  SELECT
    tpd.site_domain,
    COALESCE(ci.device_type, 'unknown') AS device_type,
    tpd.third_party_domain
  FROM third_party_domains tpd
  LEFT JOIN client_info ci ON tpd.session_id = ci.session_id
),
all_devices AS (
  SELECT
    site_domain,
    'all' AS device_type,
    third_party_domain
  FROM device_domains
),
combined_data AS (
  SELECT * FROM device_domains
  UNION ALL
  SELECT * FROM all_devices
),
domain_counts AS (
  SELECT
    site_domain,
    device_type,
    third_party_domain,
    COUNT(*) AS frequency
  FROM combined_data
  GROUP BY site_domain, device_type, third_party_domain
),
ranked_domains AS (
  SELECT
    site_domain,
    device_type,
    third_party_domain,
    frequency,
    ROW_NUMBER() OVER (PARTITION BY site_domain, device_type ORDER BY frequency DESC) AS rank
  FROM domain_counts
)

SELECT
  site_domain,
  device_type,
  jsonb_agg(jsonb_build_object(
    'domain', third_party_domain,
    'frequency', frequency
  ) ORDER BY frequency DESC) FILTER (WHERE rank <= 10) AS top_domains
FROM ranked_domains
WHERE device_type IN ('mobile', 'tablet', 'desktop', 'all')  -- Filter out 'unknown'
GROUP BY site_domain, device_type
ORDER BY site_domain, 
  CASE 
    WHEN device_type = 'all' THEN 1
    WHEN device_type = 'desktop' THEN 2
    WHEN device_type = 'mobile' THEN 3
    WHEN device_type = 'tablet' THEN 4
    ELSE 5
  END;
$$;

CREATE OR REPLACE FUNCTION "public"."top_landing_page"("p_domain_name" "text", "p_date_range" "text") RETURNS TABLE("current_page" "text", "previous_page" "text", "hits" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_start_ts timestamptz;
  v_end_ts   timestamptz;
BEGIN
  -- Normalize and validate date range
  CASE lower(p_date_range)
    WHEN 'today' THEN
      v_start_ts := date_trunc('day', now());
      v_end_ts   := now();
    WHEN 'yesterday' THEN
      v_start_ts := date_trunc('day', now()) - interval '1 day';
      v_end_ts   := date_trunc('day', now());
    WHEN 'last_7_days' THEN
      v_start_ts := now() - interval '7 days';
      v_end_ts   := now();
    ELSE
      RAISE EXCEPTION 'Invalid p_date_range: %, expected one of: today, yesterday, last_7_days', p_date_range;
  END CASE;

  RETURN QUERY
  WITH page_hits AS (
    SELECT r.current_page, COUNT(*) AS hits
    FROM public.rum_metrics AS r
    WHERE r.domain_name = p_domain_name
      AND r.created_at >= v_start_ts
      AND r.created_at <  v_end_ts
    GROUP BY r.current_page
  ),
  prev_modes AS (
    SELECT r.current_page,
           mode() WITHIN GROUP (ORDER BY r.previous_page) AS top_previous_page
    FROM public.rum_metrics AS r
    WHERE r.domain_name = p_domain_name
      AND r.created_at >= v_start_ts
      AND r.created_at <  v_end_ts
    GROUP BY r.current_page
  )
  SELECT ph.current_page,
         pm.top_previous_page AS previous_page,
         ph.hits
  FROM page_hits AS ph
  JOIN prev_modes AS pm
    ON pm.current_page = ph.current_page
  ORDER BY ph.hits DESC
  LIMIT 30;

END;
$$;

CREATE OR REPLACE FUNCTION "public"."traffic_source"() RETURNS TABLE("day" "date", "referral_domain" "text", "domain" "text", "device_type" "text", "count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  WITH base AS (
    SELECT
      split_part(regexp_replace(rm.previous_page, '^https?://(www\.)?', '', 'i'), '/', 1)::text AS referral_domain,
      rm.domain_name AS domain,
      COALESCE(
        (
          SELECT v->>'deviceType'
          FROM jsonb_array_elements(rm.events) AS e(v)
          WHERE v->>'type' = 'client-info'
          LIMIT 1
        ),
        'unknown'
      ) AS device_type,
      rm.created_at::date AS day
    FROM public.rum_metrics rm
    WHERE rm.previous_page IS NOT NULL
      AND regexp_replace(rm.previous_page, '^https?://(www\.)?', '', 'i') !~* '^oldhousetonewhome\.net/?'
      AND rm.created_at >= date_trunc('day', now())
      AND rm.created_at <  date_trunc('day', now()) + interval '1 day'
  )
  SELECT
    b.day,
    b.referral_domain,
    b.domain,
    b.device_type,
    COUNT(*) AS count
  FROM base b
  GROUP BY b.day, b.referral_domain, b.domain, b.device_type
  ORDER BY count DESC;
$$;

CREATE OR REPLACE FUNCTION "public"."ttfb_contributors"("p_domain" "text") RETURNS TABLE("page_path" "text", "device_type" "text", "occurrence_count" bigint, "p75_ttfb" numeric, "p75_dns" numeric, "p75_tcp" numeric, "p75_server" numeric, "origin_hit_rate" numeric, "avg_rtt" numeric, "avg_downlink" numeric, "top_country" "text", "top_isp" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      -- 1. YOUR ORIGINAL PATH CLEANING LOGIC
      CASE
        WHEN position('://' IN rm.current_page) > 0
          THEN '/' || split_part(split_part(rm.current_page, '://', 2), '/', 2)
               || CASE WHEN split_part(split_part(rm.current_page, '://', 2), '/', 3) <> '' THEN '/' || split_part(split_part(rm.current_page, '://', 2), '/', 3) ELSE '' END
               || CASE WHEN split_part(split_part(rm.current_page, '://', 2), '/', 4) <> '' THEN '/' || split_part(split_part(rm.current_page, '://', 2), '/', 4) ELSE '' END
        ELSE rm.current_page
      END AS cleaned_path,

      -- 2. METADATA EXTRACTION
      (SELECT ci->>'deviceType' FROM jsonb_array_elements(rm.events) ci WHERE ci->>'type' = 'client-info' LIMIT 1) AS d_type,
      (SELECT (ci->'connection'->>'rtt')::numeric FROM jsonb_array_elements(rm.events) ci WHERE ci->>'type' = 'client-info' LIMIT 1) AS rtt,
      (SELECT (ci->'connection'->>'downlink')::numeric FROM jsonb_array_elements(rm.events) ci WHERE ci->>'type' = 'client-info' LIMIT 1) AS d_link,
      (SELECT gi->>'country' FROM jsonb_array_elements(rm.events) gi WHERE gi->>'type' = 'geo-info' LIMIT 1) AS country,
      (SELECT gi->>'org' FROM jsonb_array_elements(rm.events) gi WHERE gi->>'type' = 'geo-info' LIMIT 1) AS isp,

      -- 3. CACHE STATUS
      (SELECT (oi->>'originHit')::boolean FROM jsonb_array_elements(rm.events) oi WHERE oi->>'type' = 'origin-info' LIMIT 1) AS is_origin_hit,

      -- 4. TTFB ATTRIBUTION PHASES
      (SELECT (wv->>'value')::numeric FROM jsonb_array_elements(rm.events) wv WHERE wv->>'name' = 'TTFB' LIMIT 1) AS ttfb_ms,
      (SELECT (wv->'attribution'->>'dnsLookup')::numeric FROM jsonb_array_elements(rm.events) wv WHERE wv->>'name' = 'TTFB' LIMIT 1) AS ttfb_dns,
      (SELECT (wv->'attribution'->>'tcpConnection')::numeric FROM jsonb_array_elements(rm.events) wv WHERE wv->>'name' = 'TTFB' LIMIT 1) AS ttfb_tcp,
      (SELECT (wv->'attribution'->>'requestStart')::numeric FROM jsonb_array_elements(rm.events) wv WHERE wv->>'name' = 'TTFB' LIMIT 1) AS ttfb_server

    FROM public.rum_metrics rm
    WHERE
      COALESCE(
        (SELECT e->>'siteDomain' FROM jsonb_array_elements(rm.events) e WHERE e->>'siteDomain' IS NOT NULL LIMIT 1),
        rm.domain_name
      ) = p_domain
      AND rm.created_at >= (CURRENT_DATE - INTERVAL '7 days')
  )
  SELECT
    b.cleaned_path AS page_path,
    b.d_type AS device_type,
    COUNT(*) AS occurrence_count,
    
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY b.ttfb_ms)::numeric(10,2) AS p75_ttfb,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY b.ttfb_dns)::numeric(10,2) AS p75_dns,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY b.ttfb_tcp)::numeric(10,2) AS p75_tcp,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY b.ttfb_server)::numeric(10,2) AS p75_server,

    ROUND(100.0 * COUNT(*) FILTER (WHERE b.is_origin_hit = true) / NULLIF(COUNT(*), 0), 1) AS origin_hit_rate,

    ROUND(AVG(b.rtt), 0) AS avg_rtt,
    ROUND(AVG(b.d_link), 1) AS avg_downlink,
    MODE() WITHIN GROUP (ORDER BY b.country) AS top_country,
    MODE() WITHIN GROUP (ORDER BY b.isp) AS top_isp

  FROM base b
  WHERE b.ttfb_ms IS NOT NULL
  GROUP BY b.cleaned_path, b.d_type
  -- FILTER: Return only P75 values higher than the 800ms safe threshold
  HAVING COUNT(*) >= 2 
     AND PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY b.ttfb_ms) > 800
  ORDER BY p75_ttfb DESC;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."user_happiness"("p_domain" "text" DEFAULT NULL::"text", "p_date_range" "text" DEFAULT '30days'::"text") RETURNS TABLE("device_type" "text", "experience_quality" "text", "session_count" bigint, "avg_fcp" numeric, "avg_cls" numeric, "avg_ttfb" numeric, "avg_lcp" numeric, "avg_inp" numeric, "avg_performance_score" numeric, "avg_long_tasks" numeric, "avg_slow_api_calls" numeric, "avg_trackers" numeric, "percentage_in_device_type" numeric, "country_count" bigint)
    LANGUAGE "sql"
    AS $$
WITH date_params AS (
  SELECT
    CASE p_date_range
      WHEN '24hours' THEN NOW() - INTERVAL '24 hours'
      WHEN '7days' THEN NOW() - INTERVAL '7 days'
      WHEN '30days' THEN NOW() - INTERVAL '30 days'
      WHEN '90days' THEN NOW() - INTERVAL '90 days'
      ELSE NOW() - INTERVAL '30 days' -- Default to 30 days if invalid
    END AS start_date,
    NOW() AS end_date
),

unique_sessions AS (
  SELECT DISTINCT 
    rm.session_id,
    rm.domain_name,
    rm.events
  FROM 
    public.rum_metrics rm
  WHERE
    -- Apply domain filtering with subdomain handling
    (p_domain IS NULL OR 
     rm.domain_name = p_domain OR 
     rm.domain_name LIKE '%.' || p_domain)
),

session_timestamps AS (
  SELECT
    us.session_id,
    us.domain_name,
    us.events,
    (
      SELECT MIN(TO_TIMESTAMP((e->>'timestamp')::bigint / 1000))
      FROM jsonb_array_elements(us.events) AS e
      WHERE e->>'timestamp' IS NOT NULL
    ) AS session_start_time
  FROM
    unique_sessions us
),

filtered_sessions AS (
  SELECT 
    st.session_id,
    st.domain_name,
    st.events
  FROM 
    session_timestamps st, 
    date_params d
  WHERE 
    st.session_start_time >= d.start_date AND
    st.session_start_time <= d.end_date
),

session_metrics AS (
  SELECT 
    fs.session_id,
    fs.domain_name,
    
    -- Extract device type
    COALESCE(
      (
        SELECT e->>'deviceType'
        FROM jsonb_array_elements(fs.events) AS e
        WHERE e->>'type' = 'client-info'
        LIMIT 1
      ),
      'unknown'
    ) AS device_type,
    
    -- Extract country
    (
      SELECT e->>'country'
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'geo-info'
      LIMIT 1
    ) AS country,
    
    -- Extract web vital ratings
    (
      SELECT e->>'rating'
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'web-vital' AND e->>'name' = 'FCP'
      ORDER BY (e->>'timestamp')::bigint DESC
      LIMIT 1
    ) AS fcp_rating,
    
    (
      SELECT e->>'rating'
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'web-vital' AND e->>'name' = 'CLS'
      ORDER BY (e->>'timestamp')::bigint DESC
      LIMIT 1
    ) AS cls_rating,
    
    (
      SELECT e->>'rating'
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'web-vital' AND e->>'name' = 'TTFB'
      ORDER BY (e->>'timestamp')::bigint DESC
      LIMIT 1
    ) AS ttfb_rating,
    
    (
      SELECT e->>'rating'
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'web-vital' AND e->>'name' = 'LCP'
      ORDER BY (e->>'timestamp')::bigint DESC
      LIMIT 1
    ) AS lcp_rating,
    
    (
      SELECT e->>'rating'
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'web-vital' AND e->>'name' = 'INP'
      ORDER BY (e->>'timestamp')::bigint DESC
      LIMIT 1
    ) AS inp_rating,
    
    -- Extract web vital values
    (
      SELECT (e->>'value')::numeric
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'web-vital' AND e->>'name' = 'FCP'
      ORDER BY (e->>'timestamp')::bigint DESC
      LIMIT 1
    ) AS fcp_value,
    
    (
      SELECT (e->>'value')::numeric
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'web-vital' AND e->>'name' = 'CLS'
      ORDER BY (e->>'timestamp')::bigint DESC
      LIMIT 1
    ) AS cls_value,
    
    (
      SELECT (e->>'value')::numeric
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'web-vital' AND e->>'name' = 'TTFB'
      ORDER BY (e->>'timestamp')::bigint DESC
      LIMIT 1
    ) AS ttfb_value,
    
    (
      SELECT (e->>'value')::numeric
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'web-vital' AND e->>'name' = 'LCP'
      ORDER BY (e->>'timestamp')::bigint DESC
      LIMIT 1
    ) AS lcp_value,
    
    (
      SELECT (e->>'value')::numeric
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'web-vital' AND e->>'name' = 'INP'
      ORDER BY (e->>'timestamp')::bigint DESC
      LIMIT 1
    ) AS inp_value,
    
    -- Count metrics
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' IN ('long-task', 'long-task-critical')
    ) AS long_tasks_count,
    
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'slow-api-call'
    ) AS slow_api_calls_count,
    
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements(fs.events) AS e
      WHERE e->>'type' = 'tracker-detected'
    ) AS trackers_count
  FROM 
    filtered_sessions fs
),

classified_sessions AS (
  SELECT
    sm.*,
    -- Determine experience quality based on available metrics
    CASE
      -- If we have all core metrics
      WHEN sm.fcp_rating IS NOT NULL AND sm.cls_rating IS NOT NULL AND sm.ttfb_rating IS NOT NULL THEN
        CASE
          -- Good experience: All metrics are 'good'
          WHEN sm.fcp_rating = 'good' AND sm.cls_rating = 'good' AND sm.ttfb_rating = 'good' THEN 'Good'
          -- Poor experience: Any metric is 'poor'
          WHEN sm.fcp_rating = 'poor' OR sm.cls_rating = 'poor' OR sm.ttfb_rating = 'poor' THEN 'Poor'
          -- Okay experience: No 'poor' ratings, but not all 'good'
          ELSE 'Okay'
        END
      -- If we have some metrics but not all core ones
      WHEN sm.fcp_rating IS NOT NULL OR sm.cls_rating IS NOT NULL OR sm.ttfb_rating IS NOT NULL OR 
           sm.lcp_rating IS NOT NULL OR sm.inp_rating IS NOT NULL THEN
        CASE
          -- If any available metric is 'poor'
          WHEN sm.fcp_rating = 'poor' OR sm.cls_rating = 'poor' OR sm.ttfb_rating = 'poor' OR 
               sm.lcp_rating = 'poor' OR sm.inp_rating = 'poor' THEN 'Poor'
          -- If all available metrics are 'good'
          WHEN (sm.fcp_rating IS NULL OR sm.fcp_rating = 'good') AND
               (sm.cls_rating IS NULL OR sm.cls_rating = 'good') AND
               (sm.ttfb_rating IS NULL OR sm.ttfb_rating = 'good') AND
               (sm.lcp_rating IS NULL OR sm.lcp_rating = 'good') AND
               (sm.inp_rating IS NULL OR sm.inp_rating = 'good') THEN 'Good'
          -- Otherwise Okay
          ELSE 'Okay'
        END
      -- If we have no metrics at all
      ELSE 'Unknown'
    END AS experience_quality,
    
    -- Calculate performance score based on available metrics
    (
      CASE 
        WHEN sm.lcp_rating = 'good' THEN 25
        WHEN sm.lcp_rating = 'needs-improvement' THEN 15
        WHEN sm.lcp_rating = 'poor' THEN 5
        ELSE 0
      END +
      CASE 
        WHEN sm.cls_rating = 'good' THEN 25
        WHEN sm.cls_rating = 'needs-improvement' THEN 15
        WHEN sm.cls_rating = 'poor' THEN 5
        ELSE 0
      END +
      CASE 
        WHEN sm.fcp_rating = 'good' THEN 15
        WHEN sm.fcp_rating = 'needs-improvement' THEN 10
        WHEN sm.fcp_rating = 'poor' THEN 3
        ELSE 0
      END +
      CASE 
        WHEN sm.ttfb_rating = 'good' THEN 15
        WHEN sm.ttfb_rating = 'needs-improvement' THEN 10
        WHEN sm.ttfb_rating = 'poor' THEN 3
        ELSE 0
      END +
      CASE 
        WHEN sm.inp_rating = 'good' THEN 20
        WHEN sm.inp_rating = 'needs-improvement' THEN 12
        WHEN sm.inp_rating = 'poor' THEN 4
        ELSE 0
      END
    ) AS performance_score
  FROM
    session_metrics sm
),

standardized_sessions AS (
  SELECT
    cs.*,
    CASE 
      WHEN cs.experience_quality = 'Unknown' THEN 'Okay' -- Map Unknown to Okay for consistency
      ELSE cs.experience_quality 
    END AS standardized_quality
  FROM
    classified_sessions cs
),

device_sessions AS (
  SELECT
    'all' AS device_type,
    standardized_quality,
    session_id,
    domain_name,
    country,
    fcp_value,
    cls_value,
    ttfb_value,
    lcp_value,
    inp_value,
    performance_score,
    long_tasks_count,
    slow_api_calls_count,
    trackers_count
  FROM
    standardized_sessions
  
  UNION ALL
  
  SELECT
    device_type,
    standardized_quality,
    session_id,
    domain_name,
    country,
    fcp_value,
    cls_value,
    ttfb_value,
    lcp_value,
    inp_value,
    performance_score,
    long_tasks_count,
    slow_api_calls_count,
    trackers_count
  FROM
    standardized_sessions
)

SELECT
  device_type,
  standardized_quality AS experience_quality,
  COUNT(*) AS session_count,
  ROUND(AVG(fcp_value), 2) AS avg_fcp,
  ROUND(AVG(cls_value), 4) AS avg_cls,
  ROUND(AVG(ttfb_value), 2) AS avg_ttfb,
  ROUND(AVG(lcp_value), 2) AS avg_lcp,
  ROUND(AVG(inp_value), 2) AS avg_inp,
  ROUND(AVG(performance_score), 1) AS avg_performance_score,
  ROUND(AVG(long_tasks_count), 2) AS avg_long_tasks,
  ROUND(AVG(slow_api_calls_count), 2) AS avg_slow_api_calls,
  ROUND(AVG(trackers_count), 2) AS avg_trackers,
  ROUND(
    (COUNT(*)::numeric / 
    NULLIF(SUM(COUNT(*)) OVER (PARTITION BY device_type), 0)::numeric) * 100, 
    2
  ) AS percentage_in_device_type,
  COUNT(DISTINCT country) AS country_count
FROM 
  device_sessions
WHERE 
  device_type IN ('mobile', 'desktop', 'tablet', 'all')
GROUP BY 
  device_type, 
  standardized_quality
ORDER BY 
  CASE device_type
    WHEN 'all' THEN 1
    WHEN 'desktop' THEN 2
    WHEN 'mobile' THEN 3
    WHEN 'tablet' THEN 4
    ELSE 5
  END,
  CASE standardized_quality
    WHEN 'Good' THEN 1
    WHEN 'Okay' THEN 2
    WHEN 'Poor' THEN 3
    ELSE 4
  END;
$$;

CREATE OR REPLACE FUNCTION "public"."user_happiness_dist"("domain_filter" "text", "start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("country_iso" "text", "device_type" "text", "happy_percentage" numeric, "moderate_percentage" numeric, "unhappy_percentage" numeric, "total_sessions" bigint)
    LANGUAGE "sql" STABLE
    AS $_$
with rum_data as (
  select 
    rm.id,
    -- ISO2 from your geo-info event: "country": "US"
    upper(coalesce(
      (
        select ev->>'country'
        from jsonb_array_elements(rm.events) ev
        where ev->>'type' = 'geo-info'
        limit 1
      ),
      'unknown'
    )) as raw_country_iso,
    -- Device type from client-info
    lower(coalesce(
      (
        select coalesce(
          ev->>'deviceType',
          ev->'device'->>'type',
          ev->'client'->>'deviceType'
        )
        from jsonb_array_elements(rm.events) ev
        where ev->>'type' = 'client-info'
        limit 1
      ),
      'unknown'
    )) as raw_device_type,
    rm.events
  from public.rum_metrics rm
  where rm.created_at >= start_date
    and rm.created_at <  end_date
    and (domain_filter is null or rm.domain_name = domain_filter)
),
norm as (
  select
    id,
    case
      when raw_country_iso ~ '^[A-Z]{2}$' then raw_country_iso
      else 'unknown'
    end as country_iso,
    case
      when raw_device_type in ('desktop','pc') then 'desktop'
      when raw_device_type in ('mobile','phone') then 'mobile'
      when raw_device_type in ('tablet','pad') then 'tablet'
      else 'other'
    end as device_type,
    events
  from rum_data
),
latest_metric as (
  select
    n.id,
    n.country_iso,
    n.device_type,
    (e->>'name') as metric_name,
    (e->>'rating') as rating,
    row_number() over (
      partition by n.id, (e->>'name')
      order by coalesce((e->>'timestamp')::bigint, 0) desc,
               coalesce((e->>'value')::numeric, 0) desc
    ) as rn
  from norm n
  cross join lateral jsonb_array_elements(n.events) e
  where e->>'type' = 'web-vital'
    and (e->>'name') in ('LCP','INP','CLS','TTFB','FCP')
),
latest_only as (
  select id, country_iso, device_type, metric_name, rating
  from latest_metric
  where rn = 1
),
session_status as (
  select
    id,
    country_iso,
    device_type,
    case
      when bool_or(rating = 'poor') then 'poor'
      when bool_or(rating = 'needs improvement') then 'needs improvement'
      else 'good'
    end as overall_rating
  from latest_only
  group by id, country_iso, device_type
),
agg as (
  select
    country_iso,
    device_type,
    count(*)::numeric as total_sessions_num,
    count(*) filter (where overall_rating = 'good')::numeric as good_count,
    count(*) filter (where overall_rating = 'needs improvement')::numeric as needs_improvement_count,
    count(*) filter (where overall_rating = 'poor')::numeric as poor_count
  from session_status
  group by country_iso, device_type
)
select
  country_iso,
  device_type,
  round(100.0 * good_count / nullif(total_sessions_num, 0), 2)              as happy_percentage,
  round(100.0 * needs_improvement_count / nullif(total_sessions_num, 0), 2) as moderate_percentage,
  round(100.0 * poor_count / nullif(total_sessions_num, 0), 2)              as unhappy_percentage,
  total_sessions_num::bigint as total_sessions
from agg
where country_iso <> 'unknown'
order by country_iso, device_type;
$_$;

CREATE OR REPLACE FUNCTION "public"."ux_map_data"("domain_url" "text") RETURNS TABLE("country" "text", "device_type" "text", "network" "text", "total_sessions" bigint, "p75_lcp" numeric, "p75_ttfb" numeric, "p75_cls" numeric, "p75_inp" numeric, "good_pct" numeric, "average_pct" numeric, "bad_pct" numeric)
    LANGUAGE "plpgsql"
    AS $$BEGIN
  RETURN QUERY

  WITH filtered_sessions AS (
    SELECT
      m.id,
      m.events
    FROM public.rum_metrics m
    WHERE m.domain_name = domain_url
      AND m.created_at >= NOW() - INTERVAL '7 days'
    ORDER BY m.created_at DESC
    LIMIT 2000
  ),

  session_data AS (
    SELECT
      m.id,

      MAX(CASE WHEN e->>'type' = 'geo-info'
               THEN e->>'country' END) AS c,

      MAX(CASE WHEN e->>'type' = 'client-info'
               THEN e->>'deviceType' END) AS dt,

      MAX(CASE WHEN e->>'type' = 'client-info'
               THEN e->'connection'->>'effectiveType' END) AS net,

      MAX(CASE WHEN e->>'type' = 'web-vital'
                AND e->>'name' = 'LCP'
               THEN (e->>'value')::float END) AS lcp_v,

      MAX(CASE WHEN e->>'type' = 'web-vital'
                AND e->>'name' = 'TTFB'
               THEN (e->>'value')::float END) AS ttfb_v,

      MAX(CASE WHEN e->>'type' = 'web-vital'
                AND e->>'name' = 'CLS'
               THEN (e->>'value')::float END) AS cls_v,

      MAX(CASE WHEN e->>'type' = 'web-vital'
                AND e->>'name' = 'INP'
               THEN (e->>'value')::float END) AS inp_v

    FROM filtered_sessions m
    CROSS JOIN LATERAL jsonb_array_elements(m.events) e

    GROUP BY m.id
  )

  SELECT
    c AS country,
    dt AS device_type,
    net AS network,
    COUNT(*) AS total_sessions,

    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp_v)::numeric, 0),
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ttfb_v)::numeric, 0),
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cls_v)::numeric, 3),
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY inp_v)::numeric, 0),

    ROUND(100.0 * COUNT(*) FILTER (
      WHERE lcp_v <= 2500
        AND (cls_v <= 0.1 OR cls_v IS NULL)
        AND (inp_v <= 200 OR inp_v IS NULL)
    ) / NULLIF(COUNT(*), 0)),

    ROUND(100.0 * COUNT(*) FILTER (
      WHERE lcp_v > 4000
         OR cls_v > 0.25
         OR inp_v > 500
    ) / NULLIF(COUNT(*), 0)),

    ROUND(100.0 * COUNT(*) FILTER (
      WHERE (
        (lcp_v > 2500 AND lcp_v <= 4000)
        OR (cls_v > 0.1 AND cls_v <= 0.25)
        OR (inp_v > 200 AND inp_v <= 500)
      )
    ) / NULLIF(COUNT(*), 0))

  FROM session_data
  WHERE c IS NOT NULL
  GROUP BY c, dt, net
  ORDER BY total_sessions DESC;

END;$$;

CREATE OR REPLACE FUNCTION "public"."verify_website_user_match"("website_name_arg" "text", "user_id_arg" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  select
    website_name_arg is not null
    and user_id_arg is not null
    and user_id_arg ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and exists (
      select 1
      from public.orders
      where user_id = user_id_arg::uuid
        and website_name = website_name_arg
        
    );
$_$;

REVOKE ALL ON FUNCTION "public"."verify_website_user_match"("website_name_arg" "text", "user_id_arg" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."verify_website_user_match"("website_name_arg" "text", "user_id_arg" "text") TO "service_role";

CREATE OR REPLACE FUNCTION "public"."web_vitals"("p_domain_name" "text", "p_time_range" "text") RETURNS TABLE("device_type" "text", "country" "text", "total_page_views" bigint, "total_sessions" bigint, "unique_visitors" bigint, "unique_languages" bigint, "bounce_rate_percentage" numeric, "avg_pages_per_session" numeric)
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
WITH 
base_data AS (
  SELECT
    rm.id AS page_id,
    rm.session_id,
    rm.domain_name,
    rm.created_at,
    (
      SELECT e.value->>'country'
      FROM jsonb_array_elements(rm.events) AS e(value)
      WHERE e.value->>'type' = 'geo-info'
      LIMIT 1
    ) AS visitor_country,
    (
      SELECT e.value->>'language'
      FROM jsonb_array_elements(rm.events) AS e(value)
      WHERE e.value->>'type' = 'client-info'
      LIMIT 1
    ) AS visitor_language,
    (
      SELECT e.value->>'deviceType'
      FROM jsonb_array_elements(rm.events) AS e(value)
      WHERE e.value->>'type' = 'client-info'
      LIMIT 1
    ) AS visitor_device_type
  FROM 
    public.rum_metrics rm
  WHERE
    REGEXP_REPLACE(rm.domain_name, '^www\.', '') = REGEXP_REPLACE(p_domain_name, '^www\.', '')
    AND CASE 
      WHEN p_time_range = '24hours' THEN rm.created_at >= NOW() - INTERVAL '24 hours'
      WHEN p_time_range = '7days' THEN rm.created_at >= NOW() - INTERVAL '7 days'
      WHEN p_time_range = '30days' THEN rm.created_at >= NOW() - INTERVAL '30 days'
      WHEN p_time_range = '90days' THEN rm.created_at >= NOW() - INTERVAL '90 days'
      ELSE TRUE
    END
),

session_metrics AS (
  SELECT
    session_id,
    COUNT(*) AS pages_viewed,
    MAX(visitor_country) AS session_country,
    MAX(visitor_language) AS session_language,
    MAX(visitor_device_type) AS session_device_type
  FROM
    base_data
  GROUP BY
    session_id
),

device_country_metrics AS (
  SELECT
    COALESCE(sm.session_device_type, 'Unknown') AS result_device_type,
    COALESCE(sm.session_country, 'Unknown') AS result_country,
    COUNT(DISTINCT bd.page_id) AS result_page_views,
    COUNT(DISTINCT sm.session_id) AS result_sessions,
    COUNT(DISTINCT sm.session_id) AS result_visitors,
    COUNT(DISTINCT bd.visitor_language) AS result_languages,
    ROUND(
      100.0 * COUNT(DISTINCT CASE WHEN sm.pages_viewed = 1 THEN sm.session_id END) / 
      NULLIF(COUNT(DISTINCT sm.session_id), 0),
      2
    ) AS result_bounce_rate,
    ROUND(
      AVG(sm.pages_viewed),
      2
    ) AS result_pages_per_session
  FROM 
    base_data bd
  JOIN
    session_metrics sm ON bd.session_id = sm.session_id
  GROUP BY
    COALESCE(sm.session_device_type, 'Unknown'),
    COALESCE(sm.session_country, 'Unknown')
),

all_devices_metrics AS (
  SELECT
    'all' AS result_device_type,
    dcm.result_country,
    SUM(dcm.result_page_views) AS result_page_views,
    SUM(dcm.result_sessions) AS result_sessions,
    SUM(dcm.result_visitors) AS result_visitors,
    SUM(dcm.result_languages) AS result_languages,
    ROUND(
      100.0 * SUM(dcm.result_bounce_rate * dcm.result_sessions) / NULLIF(SUM(dcm.result_sessions), 0),
      2
    ) AS result_bounce_rate,
    ROUND(
      SUM(dcm.result_pages_per_session * dcm.result_sessions) / NULLIF(SUM(dcm.result_sessions), 0),
      2
    ) AS result_pages_per_session
  FROM
    device_country_metrics dcm
  GROUP BY
    dcm.result_country
),

combined_results AS (
  SELECT 
    result_device_type,
    result_country,
    result_page_views,
    result_sessions,
    result_visitors,
    result_languages,
    result_bounce_rate,
    result_pages_per_session
  FROM 
    device_country_metrics
  
  UNION ALL
  
  SELECT 
    result_device_type,
    result_country,
    result_page_views,
    result_sessions,
    result_visitors,
    result_languages,
    result_bounce_rate,
    result_pages_per_session
  FROM 
    all_devices_metrics
)

SELECT
  cr.result_device_type AS device_type,
  cr.result_country AS country,
  cr.result_page_views AS total_page_views,
  cr.result_sessions AS total_sessions,
  cr.result_visitors AS unique_visitors,
  cr.result_languages AS unique_languages,
  cr.result_bounce_rate AS bounce_rate_percentage,
  cr.result_pages_per_session AS avg_pages_per_session
FROM
  combined_results cr
ORDER BY
  CASE 
    WHEN cr.result_device_type = 'all' THEN 1
    WHEN cr.result_device_type = 'desktop' THEN 2
    WHEN cr.result_device_type = 'mobile' THEN 3
    WHEN cr.result_device_type = 'tablet' THEN 4
    ELSE 5
  END,
  cr.result_sessions DESC;
$$;
