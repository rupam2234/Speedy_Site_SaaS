-- Device level LCP rollup reader.
-- The element reader only returns a (page, element) group that was seen at
-- least five times, so a device can look healthy in the panels while the
-- distribution shows most of its pageviews as poor. This reader reports the
-- device verdict over the same seven day window as the element reader.

CREATE OR REPLACE FUNCTION public.analyze_lcp_device_rollup(domain_filter text)
RETURNS TABLE (
    device_type text,
    pageview_count bigint,
    good_count bigint,
    needs_improvement_count bigint,
    poor_count bigint,
    p50_lcp_value numeric,
    p75_lcp_value numeric,
    distinct_pages bigint,
    distinct_targets bigint,
    poor_pages bigint,
    worst_page text,
    worst_page_lcp numeric,
    top_target text,
    top_target_count bigint,
    top_target_p75 numeric
)
LANGUAGE sql
STABLE
AS $$
    WITH candidates AS (
        SELECT *
        FROM public.rum_lcp_candidates(
            domain_filter,
            date_trunc('day', now()) - interval '7 days',
            now()
        )
        WHERE target IS NOT NULL
    ),
    lcp_candidates AS (
        SELECT
            CASE
                WHEN candidates.device_type = 'mobile' THEN 'Mobile'
                WHEN candidates.device_type = 'desktop' THEN 'Desktop'
                WHEN candidates.device_type = 'tablet' THEN 'Tablet'
                ELSE 'Unknown'
            END AS device_type,
            candidates.current_page,
            candidates.target,
            candidates.lcp_value,
            candidates.lcp_rating
        FROM candidates
    ),
    per_device AS (
        SELECT
            lcp_candidates.device_type,
            count(*) AS pageview_count,
            count(*) FILTER (WHERE lcp_candidates.lcp_rating = 'good') AS good_count,
            count(*) FILTER (WHERE lcp_candidates.lcp_rating = 'needs improvement') AS needs_improvement_count,
            count(*) FILTER (WHERE lcp_candidates.lcp_rating = 'poor') AS poor_count,
            round(percentile_cont(0.5) WITHIN GROUP (ORDER BY lcp_candidates.lcp_value)::numeric, 2) AS p50_lcp_value,
            round(percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp_candidates.lcp_value)::numeric, 2) AS p75_lcp_value,
            count(DISTINCT lcp_candidates.current_page) AS distinct_pages,
            count(DISTINCT lcp_candidates.target) AS distinct_targets,
            count(DISTINCT lcp_candidates.current_page) FILTER (
                WHERE lcp_candidates.lcp_rating = 'poor'
            ) AS poor_pages
        FROM lcp_candidates
        GROUP BY lcp_candidates.device_type
    ),
    target_groups AS (
        SELECT
            lcp_candidates.device_type,
            lcp_candidates.target,
            count(*) AS target_count,
            round(percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp_candidates.lcp_value)::numeric, 2) AS target_p75
        FROM lcp_candidates
        GROUP BY lcp_candidates.device_type, lcp_candidates.target
    ),
    top_targets AS (
        SELECT DISTINCT ON (device_type)
            device_type,
            target,
            target_count,
            target_p75
        FROM target_groups
        ORDER BY device_type, target_count DESC, target
    ),
    worst_pages AS (
        SELECT DISTINCT ON (device_type)
            device_type,
            current_page,
            lcp_value
        FROM lcp_candidates
        ORDER BY device_type, lcp_value DESC, current_page
    )
    SELECT
        per_device.device_type,
        per_device.pageview_count,
        per_device.good_count,
        per_device.needs_improvement_count,
        per_device.poor_count,
        per_device.p50_lcp_value,
        per_device.p75_lcp_value,
        per_device.distinct_pages,
        per_device.distinct_targets,
        per_device.poor_pages,
        worst_pages.current_page AS worst_page,
        worst_pages.lcp_value AS worst_page_lcp,
        top_targets.target AS top_target,
        top_targets.target_count AS top_target_count,
        top_targets.target_p75 AS top_target_p75
    FROM per_device
    LEFT JOIN top_targets USING (device_type)
    LEFT JOIN worst_pages USING (device_type)
    ORDER BY per_device.device_type;
$$;

GRANT EXECUTE ON FUNCTION public.analyze_lcp_device_rollup(text) TO service_role;
