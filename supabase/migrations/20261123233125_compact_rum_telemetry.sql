-- ============================================================================
-- Compact RUM telemetry: additive canonical facts and bounded evidence.
-- Legacy events remain readable and unchanged. New columns are nullable so
-- historical rows require no backfill.
-- ============================================================================

ALTER TABLE public.rum_metrics
    ADD COLUMN IF NOT EXISTS schema_version smallint,
    ADD COLUMN IF NOT EXISTS referrer_domain text,
    ADD COLUMN IF NOT EXISTS country text,
    ADD COLUMN IF NOT EXISTS region text,
    ADD COLUMN IF NOT EXISTS city text,
    ADD COLUMN IF NOT EXISTS provider text,
    ADD COLUMN IF NOT EXISTS device_type text,
    ADD COLUMN IF NOT EXISTS browser_family text,
    ADD COLUMN IF NOT EXISTS os_family text,
    ADD COLUMN IF NOT EXISTS device_memory_gb numeric,
    ADD COLUMN IF NOT EXISTS language text,
    ADD COLUMN IF NOT EXISTS network_effective_type text,
    ADD COLUMN IF NOT EXISTS network_rtt_ms integer,
    ADD COLUMN IF NOT EXISTS network_downlink_mbps numeric,
    ADD COLUMN IF NOT EXISTS poor_connection boolean,
    ADD COLUMN IF NOT EXISTS backend_response_ms integer,
    ADD COLUMN IF NOT EXISTS dns_ms integer,
    ADD COLUMN IF NOT EXISTS connect_ms integer,
    ADD COLUMN IF NOT EXISTS tls_handshake_ms integer,
    ADD COLUMN IF NOT EXISTS redirect_ms integer,
    ADD COLUMN IF NOT EXISTS queue_ms integer,
    ADD COLUMN IF NOT EXISTS cache_status text,
    ADD COLUMN IF NOT EXISTS origin_hit boolean,
    ADD COLUMN IF NOT EXISTS transfer_bytes bigint,
    ADD COLUMN IF NOT EXISTS decoded_bytes bigint,
    ADD COLUMN IF NOT EXISTS fcp_ms integer,
    ADD COLUMN IF NOT EXISTS fcp_rating text,
    ADD COLUMN IF NOT EXISTS lcp_ms integer,
    ADD COLUMN IF NOT EXISTS lcp_rating text,
    ADD COLUMN IF NOT EXISTS cls_value numeric,
    ADD COLUMN IF NOT EXISTS cls_rating text,
    ADD COLUMN IF NOT EXISTS inp_ms integer,
    ADD COLUMN IF NOT EXISTS inp_rating text,
    ADD COLUMN IF NOT EXISTS ttfb_ms integer,
    ADD COLUMN IF NOT EXISTS ttfb_rating text,
    ADD COLUMN IF NOT EXISTS resource_request_count integer,
    ADD COLUMN IF NOT EXISTS resource_transfer_bytes bigint,
    ADD COLUMN IF NOT EXISTS resource_duration_ms integer,
    ADD COLUMN IF NOT EXISTS resource_script_count integer,
    ADD COLUMN IF NOT EXISTS resource_script_bytes bigint,
    ADD COLUMN IF NOT EXISTS resource_script_duration_ms integer,
    ADD COLUMN IF NOT EXISTS resource_image_count integer,
    ADD COLUMN IF NOT EXISTS resource_image_bytes bigint,
    ADD COLUMN IF NOT EXISTS resource_image_duration_ms integer,
    ADD COLUMN IF NOT EXISTS resource_css_count integer,
    ADD COLUMN IF NOT EXISTS resource_css_bytes bigint,
    ADD COLUMN IF NOT EXISTS resource_css_duration_ms integer,
    ADD COLUMN IF NOT EXISTS resource_other_count integer,
    ADD COLUMN IF NOT EXISTS resource_other_bytes bigint,
    ADD COLUMN IF NOT EXISTS resource_other_duration_ms integer,
    ADD COLUMN IF NOT EXISTS long_task_count integer,
    ADD COLUMN IF NOT EXISTS failed_resource_count integer,
    ADD COLUMN IF NOT EXISTS error_count integer,
    ADD COLUMN IF NOT EXISTS diagnostic_evidence jsonb;

-- Legacy rows have schema_version = NULL. New rows use 1 or 2.
ALTER TABLE public.rum_metrics
    DROP CONSTRAINT IF EXISTS rum_metrics_schema_version_check;
ALTER TABLE public.rum_metrics
    ADD CONSTRAINT rum_metrics_schema_version_check
        CHECK (schema_version IS NULL OR schema_version > 0);

-- Diagnostic evidence is one bounded JSON object, normally under 4 KiB.
ALTER TABLE public.rum_metrics
    DROP CONSTRAINT IF EXISTS rum_metrics_diagnostic_evidence_check;
ALTER TABLE public.rum_metrics
    ADD CONSTRAINT rum_metrics_diagnostic_evidence_check
        CHECK (
            diagnostic_evidence IS NULL
            OR (jsonb_typeof(diagnostic_evidence) = 'object'
                AND octet_length(diagnostic_evidence::text) <= 4096)
        );



-- Indexed paths for the existing site, page, geography, and device dashboards.
CREATE INDEX IF NOT EXISTS idx_rum_metrics_domain_created_at
    ON public.rum_metrics (domain_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rum_metrics_domain_page_created_at
    ON public.rum_metrics (domain_name, current_page, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rum_metrics_domain_country_region_created_at
    ON public.rum_metrics (domain_name, country, region, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rum_metrics_domain_device_created_at
    ON public.rum_metrics (domain_name, device_type, created_at DESC);

-- Continuation beacons merge into one row. Canonical facts are retained from
-- the first beacon, while later non-null metric observations may supersede
-- earlier values. Evidence sections are merged without duplicating the row.
-- The function remains service-role-only; explicit revokes remove any
-- pre-existing anon or authenticated grants.
CREATE OR REPLACE FUNCTION public.upsert_rum_metrics_batch(payloads jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.rum_metrics (
        pageview_id, session_id, domain_name, current_page, previous_page,
        referrer_domain, schema_version, events, created_at,
        country, region, city, provider,
        device_type, browser_family, os_family, device_memory_gb, language,
        network_effective_type, network_rtt_ms, network_downlink_mbps,
        poor_connection, backend_response_ms, dns_ms, connect_ms,
        tls_handshake_ms, redirect_ms, queue_ms, cache_status, origin_hit,
        transfer_bytes, decoded_bytes,
        fcp_ms, fcp_rating, lcp_ms, lcp_rating, cls_value, cls_rating,
        inp_ms, inp_rating, ttfb_ms, ttfb_rating,
        resource_request_count, resource_transfer_bytes, resource_duration_ms,
        resource_script_count, resource_script_bytes, resource_script_duration_ms,
        resource_image_count, resource_image_bytes, resource_image_duration_ms,
        resource_css_count, resource_css_bytes, resource_css_duration_ms,
        resource_other_count, resource_other_bytes, resource_other_duration_ms,
        long_task_count, failed_resource_count, error_count, diagnostic_evidence
    )
    SELECT
        NULLIF(p->>'pageview_id', ''),
        p->>'session_id',
        p->>'domain_name',
        p->>'current_page',
        p->>'previous_page',
        p->>'referrer_domain',
        NULLIF(p->>'schema_version', '')::smallint,
        COALESCE(p->'events', '[]'::jsonb),
        COALESCE(p->>'created_at', now()::text)::timestamptz,
        p->>'country',
        p->>'region',
        p->>'city',
        p->>'provider',
        p->>'device_type',
        p->>'browser_family',
        p->>'os_family',
        NULLIF(p->>'device_memory_gb', '')::numeric,
        p->>'language',
        p->>'network_effective_type',
        NULLIF(p->>'network_rtt_ms', '')::integer,
        NULLIF(p->>'network_downlink_mbps', '')::numeric,
        NULLIF(p->>'poor_connection', '')::boolean,
        NULLIF(p->>'backend_response_ms', '')::integer,
        NULLIF(p->>'dns_ms', '')::integer,
        NULLIF(p->>'connect_ms', '')::integer,
        NULLIF(p->>'tls_handshake_ms', '')::integer,
        NULLIF(p->>'redirect_ms', '')::integer,
        NULLIF(p->>'queue_ms', '')::integer,
        p->>'cache_status',
        NULLIF(p->>'origin_hit', '')::boolean,
        NULLIF(p->>'transfer_bytes', '')::bigint,
        NULLIF(p->>'decoded_bytes', '')::bigint,
        NULLIF(p->>'fcp_ms', '')::integer,
        p->>'fcp_rating',
        NULLIF(p->>'lcp_ms', '')::integer,
        p->>'lcp_rating',
        NULLIF(p->>'cls_value', '')::numeric,
        p->>'cls_rating',
        NULLIF(p->>'inp_ms', '')::integer,
        p->>'inp_rating',
        NULLIF(p->>'ttfb_ms', '')::integer,
        p->>'ttfb_rating',
        NULLIF(p->>'resource_request_count', '')::integer,
        NULLIF(p->>'resource_transfer_bytes', '')::bigint,
        NULLIF(p->>'resource_duration_ms', '')::integer,
        NULLIF(p->>'resource_script_count', '')::integer,
        NULLIF(p->>'resource_script_bytes', '')::bigint,
        NULLIF(p->>'resource_script_duration_ms', '')::integer,
        NULLIF(p->>'resource_image_count', '')::integer,
        NULLIF(p->>'resource_image_bytes', '')::bigint,
        NULLIF(p->>'resource_image_duration_ms', '')::integer,
        NULLIF(p->>'resource_css_count', '')::integer,
        NULLIF(p->>'resource_css_bytes', '')::bigint,
        NULLIF(p->>'resource_css_duration_ms', '')::integer,
        NULLIF(p->>'resource_other_count', '')::integer,
        NULLIF(p->>'resource_other_bytes', '')::bigint,
        NULLIF(p->>'resource_other_duration_ms', '')::integer,
        NULLIF(p->>'long_task_count', '')::integer,
        NULLIF(p->>'failed_resource_count', '')::integer,
        NULLIF(p->>'error_count', '')::integer,
        CASE
            WHEN jsonb_typeof(p->'diagnostic_evidence') = 'object'
                THEN p->'diagnostic_evidence'
            ELSE NULL
        END
    FROM jsonb_array_elements(payloads) AS p

    ON CONFLICT (pageview_id) WHERE pageview_id IS NOT NULL DO UPDATE
    SET events = rum_metrics.events || COALESCE(EXCLUDED.events, '[]'::jsonb),
        schema_version = COALESCE(rum_metrics.schema_version, EXCLUDED.schema_version),
        previous_page = COALESCE(rum_metrics.previous_page, EXCLUDED.previous_page),
        referrer_domain = COALESCE(rum_metrics.referrer_domain, EXCLUDED.referrer_domain),
        country = COALESCE(rum_metrics.country, EXCLUDED.country),
        region = COALESCE(rum_metrics.region, EXCLUDED.region),
        city = COALESCE(rum_metrics.city, EXCLUDED.city),
        provider = COALESCE(rum_metrics.provider, EXCLUDED.provider),
        device_type = COALESCE(rum_metrics.device_type, EXCLUDED.device_type),
        browser_family = COALESCE(rum_metrics.browser_family, EXCLUDED.browser_family),
        os_family = COALESCE(rum_metrics.os_family, EXCLUDED.os_family),
        device_memory_gb = COALESCE(rum_metrics.device_memory_gb, EXCLUDED.device_memory_gb),
        language = COALESCE(rum_metrics.language, EXCLUDED.language),
        network_effective_type = COALESCE(rum_metrics.network_effective_type, EXCLUDED.network_effective_type),
        network_rtt_ms = COALESCE(rum_metrics.network_rtt_ms, EXCLUDED.network_rtt_ms),
        network_downlink_mbps = COALESCE(rum_metrics.network_downlink_mbps, EXCLUDED.network_downlink_mbps),
        poor_connection = COALESCE(rum_metrics.poor_connection, EXCLUDED.poor_connection),
        backend_response_ms = COALESCE(rum_metrics.backend_response_ms, EXCLUDED.backend_response_ms),
        dns_ms = COALESCE(rum_metrics.dns_ms, EXCLUDED.dns_ms),
        connect_ms = COALESCE(rum_metrics.connect_ms, EXCLUDED.connect_ms),
        tls_handshake_ms = COALESCE(rum_metrics.tls_handshake_ms, EXCLUDED.tls_handshake_ms),
        redirect_ms = COALESCE(rum_metrics.redirect_ms, EXCLUDED.redirect_ms),
        queue_ms = COALESCE(rum_metrics.queue_ms, EXCLUDED.queue_ms),
        cache_status = COALESCE(rum_metrics.cache_status, EXCLUDED.cache_status),
        origin_hit = COALESCE(rum_metrics.origin_hit, EXCLUDED.origin_hit),
        transfer_bytes = COALESCE(rum_metrics.transfer_bytes, EXCLUDED.transfer_bytes),
        decoded_bytes = COALESCE(rum_metrics.decoded_bytes, EXCLUDED.decoded_bytes),
        fcp_ms = COALESCE(EXCLUDED.fcp_ms, rum_metrics.fcp_ms),
        fcp_rating = COALESCE(EXCLUDED.fcp_rating, rum_metrics.fcp_rating),
        lcp_ms = COALESCE(EXCLUDED.lcp_ms, rum_metrics.lcp_ms),
        lcp_rating = COALESCE(EXCLUDED.lcp_rating, rum_metrics.lcp_rating),
        cls_value = COALESCE(EXCLUDED.cls_value, rum_metrics.cls_value),
        cls_rating = COALESCE(EXCLUDED.cls_rating, rum_metrics.cls_rating),
        inp_ms = COALESCE(EXCLUDED.inp_ms, rum_metrics.inp_ms),
        inp_rating = COALESCE(EXCLUDED.inp_rating, rum_metrics.inp_rating),
        ttfb_ms = COALESCE(EXCLUDED.ttfb_ms, rum_metrics.ttfb_ms),
        ttfb_rating = COALESCE(EXCLUDED.ttfb_rating, rum_metrics.ttfb_rating),
        resource_request_count = COALESCE(EXCLUDED.resource_request_count, rum_metrics.resource_request_count),
        resource_transfer_bytes = COALESCE(EXCLUDED.resource_transfer_bytes, rum_metrics.resource_transfer_bytes),
        resource_duration_ms = COALESCE(EXCLUDED.resource_duration_ms, rum_metrics.resource_duration_ms),
        resource_script_count = COALESCE(EXCLUDED.resource_script_count, rum_metrics.resource_script_count),
        resource_script_bytes = COALESCE(EXCLUDED.resource_script_bytes, rum_metrics.resource_script_bytes),
        resource_script_duration_ms = COALESCE(EXCLUDED.resource_script_duration_ms, rum_metrics.resource_script_duration_ms),
        resource_image_count = COALESCE(EXCLUDED.resource_image_count, rum_metrics.resource_image_count),
        resource_image_bytes = COALESCE(EXCLUDED.resource_image_bytes, rum_metrics.resource_image_bytes),
        resource_image_duration_ms = COALESCE(EXCLUDED.resource_image_duration_ms, rum_metrics.resource_image_duration_ms),
        resource_css_count = COALESCE(EXCLUDED.resource_css_count, rum_metrics.resource_css_count),
        resource_css_bytes = COALESCE(EXCLUDED.resource_css_bytes, rum_metrics.resource_css_bytes),
        resource_css_duration_ms = COALESCE(EXCLUDED.resource_css_duration_ms, rum_metrics.resource_css_duration_ms),
        resource_other_count = COALESCE(EXCLUDED.resource_other_count, rum_metrics.resource_other_count),
        resource_other_bytes = COALESCE(EXCLUDED.resource_other_bytes, rum_metrics.resource_other_bytes),
        resource_other_duration_ms = COALESCE(EXCLUDED.resource_other_duration_ms, rum_metrics.resource_other_duration_ms),
        long_task_count = COALESCE(EXCLUDED.long_task_count, rum_metrics.long_task_count),
        failed_resource_count = COALESCE(EXCLUDED.failed_resource_count, rum_metrics.failed_resource_count),
        error_count = COALESCE(EXCLUDED.error_count, rum_metrics.error_count),
        diagnostic_evidence = COALESCE(rum_metrics.diagnostic_evidence, '{}'::jsonb)
            || COALESCE(EXCLUDED.diagnostic_evidence, '{}'::jsonb);
$$;

REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_rum_metrics_batch(jsonb) TO service_role;
