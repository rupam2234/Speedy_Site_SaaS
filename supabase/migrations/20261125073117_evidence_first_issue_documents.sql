-- Evidence-first RUM issue workflow: authoritative documents, bounded evidence,
-- backend test records, workflow history, and an idempotent LCP detector.

CREATE TABLE IF NOT EXISTS public.rum_issue_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    site_id uuid NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    domain_name text NOT NULL,
    fingerprint text NOT NULL,
    schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    issue_type text NOT NULL CHECK (issue_type IN (
        'slow_lcp_image', 'render_blocking_plugin_asset',
        'layout_instability', 'high_inp_interaction_cost',
        'slow_origin_response', 'heavy_third_party_script',
        'failed_or_slow_resource'
    )),
    status text NOT NULL DEFAULT 'detected' CHECK (status IN (
        'detected', 'reviewed', 'in_progress', 'fixed', 'verified',
        'resolved', 'dismissed'
    )),
    severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    confidence numeric(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    title text NOT NULL,
    symptom text NOT NULL,
    root_cause text NOT NULL,
    affected_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
    observation_period jsonb NOT NULL DEFAULT '{}'::jsonb,
    sample_count integer NOT NULL DEFAULT 0 CHECK (sample_count >= 0),
    session_count integer NOT NULL DEFAULT 0 CHECK (session_count >= 0),
    metric_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    evidence_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    recommended_fix jsonb NOT NULL DEFAULT '[]'::jsonb,
    expected_impact text NOT NULL,
    verification_plan text NOT NULL,
    provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_published boolean NOT NULL DEFAULT false,
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (site_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS public.rum_issue_evidence (
    id bigserial PRIMARY KEY,
    issue_id uuid NOT NULL REFERENCES public.rum_issue_documents(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    site_id uuid NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    evidence_kind text NOT NULL CHECK (evidence_kind IN ('rum_observation', 'wp_backend_test')),
    source_observation_ids bigint[] NOT NULL DEFAULT '{}',
    facts jsonb NOT NULL DEFAULT '{}'::jsonb,
    evidence_weight numeric(4,3) NOT NULL DEFAULT 1 CHECK (evidence_weight >= 0 AND evidence_weight <= 1),
    observed_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (issue_id, evidence_kind)
);

CREATE TABLE IF NOT EXISTS public.wp_backend_tests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    site_id uuid NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    tested_at timestamptz NOT NULL,
    environment text NOT NULL CHECK (environment IN ('production', 'staging')),
    plugin_status text NOT NULL DEFAULT 'unknown',
    test_type text NOT NULL CHECK (test_type IN (
        'cache_effectiveness', 'asset_ownership', 'plugin_weight',
        'media_delivery', 'origin_performance'
    )),
    result text NOT NULL CHECK (result IN ('pass', 'warn', 'fail')),
    facts jsonb NOT NULL DEFAULT '{}'::jsonb,
    bounded_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
    test_version text NOT NULL,
    schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rum_issue_history (
    id bigserial PRIMARY KEY,
    issue_id uuid NOT NULL REFERENCES public.rum_issue_documents(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    site_id uuid NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type text NOT NULL CHECK (event_type IN (
        'detected', 'observation_updated', 'status_changed', 'note_added',
        'fix_referenced', 'verification_recorded', 'dismissed', 'reopened'
    )),
    from_status text,
    to_status text,
    reason text,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_rum_issue_documents_site_status
    ON public.rum_issue_documents (site_id, status, is_published, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_rum_issue_documents_tenant_site
    ON public.rum_issue_documents (tenant_id, site_id);
CREATE INDEX IF NOT EXISTS idx_rum_issue_documents_fingerprint
    ON public.rum_issue_documents (site_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_rum_issue_evidence_issue
    ON public.rum_issue_evidence (issue_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_wp_backend_tests_site_tested
    ON public.wp_backend_tests (site_id, tested_at DESC);
CREATE INDEX IF NOT EXISTS idx_rum_issue_history_issue
    ON public.rum_issue_history (issue_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_rum_issue_history_observation
    ON public.rum_issue_history (issue_id, event_type, (details->>'observation_key'))
    WHERE details->>'observation_key' IS NOT NULL;

ALTER TABLE public.rum_issue_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rum_issue_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wp_backend_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rum_issue_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authorized users read issue documents" ON public.rum_issue_documents;
CREATE POLICY "authorized users read issue documents" ON public.rum_issue_documents
    FOR SELECT USING (
        tenant_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (
            SELECT 1 FROM public.order_assignments oa
            WHERE oa.order_id = site_id AND oa.expert_id = auth.uid() AND oa.is_active
        )
    );

DROP POLICY IF EXISTS "authorized users read issue evidence" ON public.rum_issue_evidence;
CREATE POLICY "authorized users read issue evidence" ON public.rum_issue_evidence
    FOR SELECT USING (
        tenant_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (
            SELECT 1 FROM public.order_assignments oa
            WHERE oa.order_id = site_id AND oa.expert_id = auth.uid() AND oa.is_active
        )
    );

DROP POLICY IF EXISTS "authorized users read backend tests" ON public.wp_backend_tests;
CREATE POLICY "authorized users read backend tests" ON public.wp_backend_tests
    FOR SELECT USING (
        tenant_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (
            SELECT 1 FROM public.order_assignments oa
            WHERE oa.order_id = site_id AND oa.expert_id = auth.uid() AND oa.is_active
        )
    );

DROP POLICY IF EXISTS "authorized users read issue history" ON public.rum_issue_history;
CREATE POLICY "authorized users read issue history" ON public.rum_issue_history
    FOR SELECT USING (
        tenant_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (
            SELECT 1 FROM public.order_assignments oa
            WHERE oa.order_id = site_id AND oa.expert_id = auth.uid() AND oa.is_active
        )
    );

REVOKE ALL ON public.rum_issue_documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.rum_issue_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.wp_backend_tests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.rum_issue_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rum_issue_documents TO authenticated;
GRANT SELECT ON public.rum_issue_evidence TO authenticated;
GRANT SELECT ON public.wp_backend_tests TO authenticated;
GRANT SELECT ON public.rum_issue_history TO authenticated;
GRANT ALL ON public.rum_issue_documents TO service_role;
GRANT ALL ON public.rum_issue_evidence TO service_role;
GRANT ALL ON public.wp_backend_tests TO service_role;
GRANT ALL ON public.rum_issue_history TO service_role;



CREATE OR REPLACE FUNCTION public.detect_lcp_issues_v1(
    p_site_id uuid,
    p_start timestamptz DEFAULT now() - interval '7 days',
    p_end timestamptz DEFAULT now(),
    p_publish boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    detected_count integer := 0;
    site_record record;
    candidate record;
    issue_id uuid;
    was_created boolean;
    issue_type text := 'slow_lcp_image';
    page_template text;
    target_name text;
    asset_url text;
    device_cohort text;
    fingerprint text;
    phase_text text;
    cause_text text;
    fix_items jsonb;
    confidence_value numeric(4,3);
    severity_value text;
BEGIN
    IF p_end <= p_start OR p_end > now() + interval '5 minutes' THEN
        RAISE EXCEPTION 'Invalid observation window';
    END IF;

    SELECT order_id, user_id, website_name INTO site_record
    FROM public.orders
    WHERE order_id = p_site_id AND order_status = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active site not found';
    END IF;

    FOR candidate IN
        WITH observations AS (
            SELECT
                rm.id,
                rm.session_id,
                rm.created_at,
                regexp_replace(
                    regexp_replace(
                        split_part(COALESCE(rm.current_page, '/'), '?', 1),
                        '/[0-9]+(/|$)',
                        '/:id\1',
                        'g'
                    ),
                    '/[0-9a-f]{8}-[0-9a-f-]{27,}(/|$)',
                    '/:id\1',
                    'gi'
                ) AS page_template,
                COALESCE(rm.device_type, 'unknown') AS device_cohort,
                lcp.target,
                lcp.url,
                rm.lcp_ms::numeric AS lcp_value,
                lcp.resource_load_delay_ms::numeric AS load_delay_ms,
                lcp.resource_load_duration_ms::numeric AS load_duration_ms,
                lcp.element_render_delay_ms::numeric AS render_delay_ms,
                lcp.candidate_ttfb_ms::numeric AS ttfb_ms,
                lcp.transfer_bytes::numeric AS transfer_bytes,
                lcp.decoded_bytes::numeric AS decoded_bytes
            FROM public.rum_metrics rm
            CROSS JOIN LATERAL jsonb_to_recordset(
                COALESCE(rm.diagnostic_evidence->'lcp', '[]'::jsonb)
            ) AS lcp(
                target text,
                url text,
                transfer_bytes numeric,
                decoded_bytes numeric,
                candidate_ttfb_ms numeric,
                resource_load_delay_ms numeric,
                resource_load_duration_ms numeric,
                element_render_delay_ms numeric
            )
            WHERE rm.domain_name = site_record.website_name
              AND rm.schema_version >= 2
              AND rm.created_at >= p_start
              AND rm.created_at < p_end
              AND rm.lcp_ms > 2500
              AND lcp.target IS NOT NULL
              AND lcp.url IS NOT NULL
              AND rm.session_id IS NOT NULL
        ),
        aggregated AS (
            SELECT
                page_template,
                target,
                url,
                device_cohort,
                count(*)::integer AS sample_count,
                count(DISTINCT session_id)::integer AS session_count,
                round(percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp_value)::numeric, 2) AS p75_lcp_ms,
                round(avg(load_delay_ms)::numeric, 2) AS avg_load_delay_ms,
                round(avg(load_duration_ms)::numeric, 2) AS avg_load_duration_ms,
                round(avg(render_delay_ms)::numeric, 2) AS avg_render_delay_ms,
                round(avg(ttfb_ms)::numeric, 2) AS avg_ttfb_ms,
                round(avg(transfer_bytes)::numeric, 2) AS avg_transfer_bytes,
                round(avg(decoded_bytes)::numeric, 2) AS avg_decoded_bytes,
                (array_agg(id ORDER BY created_at DESC))[1:50] AS source_observation_ids,
                min(created_at) AS first_observed_at,
                max(created_at) AS last_observed_at
            FROM observations
            GROUP BY page_template, target, url, device_cohort
            HAVING count(*) >= 5
               AND count(DISTINCT session_id) >= 3
        )
        SELECT * FROM aggregated
        ORDER BY p75_lcp_ms DESC
    LOOP

        page_template := candidate.page_template;
        target_name := candidate.target;
        asset_url := candidate.url;
        device_cohort := candidate.device_cohort;
        fingerprint := encode(digest(concat_ws('|',
            site_record.order_id::text,
            issue_type,
            page_template,
            target_name,
            asset_url,
            device_cohort
        ), 'sha256'), 'hex');

        IF candidate.avg_ttfb_ms >= 800 THEN
            phase_text := 'slow origin response';
            cause_text := format(
                'Likely cause: the recurring LCP asset is affected by slow origin response (average candidate TTFB %s ms).',
                candidate.avg_ttfb_ms
            );
            fix_items := jsonb_build_array(
                'Measure and improve server response time for the affected page template.',
                'Enable safe full-page caching for cacheable WordPress responses.',
                'Retest the same template and device cohort after cache configuration changes.'
            );
            confidence_value := 0.78;
        ELSIF candidate.avg_load_delay_ms >= 250 THEN
            phase_text := 'late resource discovery';
            cause_text := format(
                'Likely cause: the recurring LCP asset is discovered late (average load delay %s ms).',
                candidate.avg_load_delay_ms
            );
            fix_items := jsonb_build_array(
                format('Preload the LCP source %s with high fetch priority.', candidate.url),
                'Render or discover the primary image earlier in the initial HTML.',
                'Retest the same template and device cohort after resource discovery changes.'
            );
            confidence_value := 0.84;
        ELSIF candidate.avg_load_duration_ms >= 1000 THEN
            phase_text := 'slow resource transfer';
            cause_text := format(
                'Likely cause: the recurring LCP asset is transferred slowly (average load duration %s ms).',
                candidate.avg_load_duration_ms
            );
            fix_items := jsonb_build_array(
                format('Resize and compress %s, then serve a modern responsive format.', candidate.url),
                'Remove unnecessary bytes from the LCP response.',
                'Retest the same template and device cohort after media optimization.'
            );
            confidence_value := 0.82;
        ELSIF candidate.avg_render_delay_ms >= 200 THEN
            phase_text := 'late render';
            cause_text := format(
                'Likely cause: the recurring LCP asset is available but rendered late (average render delay %s ms).',
                candidate.avg_render_delay_ms
            );
            fix_items := jsonb_build_array(
                format('Avoid client-only rendering for %s.', candidate.target),
                'Reduce main-thread work before the LCP element paints.',
                'Retest the same template and device cohort after render-path changes.'
            );
            confidence_value := 0.72;
        ELSE
            phase_text := 'repeated poor LCP';
            cause_text := format(
                'Probable cause: the recurring LCP asset %s contributes to poor LCP, but no single dominant phase was isolated.',
                candidate.url
            );
            fix_items := jsonb_build_array(
                format('Audit delivery and rendering of %s.', candidate.url),
                'Review image dimensions, responsive sources, and server response time.',
                'Retest the same template and device cohort after optimization.'
            );
            confidence_value := 0.65;
        END IF;

        confidence_value := LEAST(
            0.95,
            confidence_value + LEAST(candidate.session_count, 10) * 0.01
        );
        severity_value := CASE
            WHEN candidate.p75_lcp_ms >= 4000 THEN 'critical'
            WHEN candidate.p75_lcp_ms >= 3000 THEN 'high'
            ELSE 'medium'
        END;

        INSERT INTO public.rum_issue_documents (
            tenant_id,
            site_id,
            domain_name,
            fingerprint,
            schema_version,
            issue_type,
            status,
            severity,
            confidence,
            title,
            symptom,
            root_cause,
            affected_scope,
            observation_period,
            sample_count,
            session_count,
            metric_summary,
            evidence_summary,
            recommended_fix,
            expected_impact,
            verification_plan,
            provenance,
            is_published,
            first_seen_at,
            last_seen_at
        ) VALUES (
            site_record.user_id,
            site_record.order_id,
            site_record.website_name,
            fingerprint,
            1,
            issue_type,
            'detected',
            severity_value,
            confidence_value,
            format('Poor %s LCP from a recurring asset', device_cohort),
            format(
                'LCP p75 is %s ms across %s pageviews and %s sessions on %s.',
                candidate.p75_lcp_ms,
                candidate.sample_count,
                candidate.session_count,
                page_template
            ),
            cause_text,
            jsonb_build_object(
                'page_template', page_template,
                'target', target_name,
                'asset_url', asset_url,
                'device', device_cohort,
                'dominant_phase', phase_text
            ),
            jsonb_build_object('start', p_start, 'end', p_end),
            candidate.sample_count,
            candidate.session_count,
            jsonb_build_object(
                'metric', 'LCP',
                'p75_ms', candidate.p75_lcp_ms,
                'avg_load_delay_ms', candidate.avg_load_delay_ms,
                'avg_load_duration_ms', candidate.avg_load_duration_ms,
                'avg_render_delay_ms', candidate.avg_render_delay_ms,
                'avg_ttfb_ms', candidate.avg_ttfb_ms,
                'avg_transfer_bytes', candidate.avg_transfer_bytes,
                'avg_decoded_bytes', candidate.avg_decoded_bytes
            ),
            jsonb_build_object(
                'evidence_kind', 'rum_observation',
                'recurring_asset', asset_url,
                'recurring_target', target_name,
                'source_observation_count', candidate.sample_count
            ),
            fix_items,
            'A measurable LCP improvement is expected, but the exact gain must be verified from comparable real-traffic windows.',
            format(
                'Compare LCP p75 for %s on %s over seven complete UTC days before and after the fix.',
                device_cohort, page_template
            ),
            jsonb_build_object(
                'detector', 'detect_lcp_issues_v1',
                'detector_version', 1,
                'source', 'rum_metrics.diagnostic_evidence.lcp',
                'generated_at', now(),
                'cause_status', 'probable'
            ),
            p_publish,
            candidate.first_observed_at,
            candidate.last_observed_at
        )
        ON CONFLICT (site_id, fingerprint) DO UPDATE SET
            severity = EXCLUDED.severity,
            confidence = EXCLUDED.confidence,
            title = EXCLUDED.title,
            symptom = EXCLUDED.symptom,
            root_cause = EXCLUDED.root_cause,
            affected_scope = EXCLUDED.affected_scope,
            observation_period = EXCLUDED.observation_period,
            sample_count = EXCLUDED.sample_count,
            session_count = EXCLUDED.session_count,
            metric_summary = EXCLUDED.metric_summary,
            evidence_summary = EXCLUDED.evidence_summary,
            recommended_fix = EXCLUDED.recommended_fix,
            expected_impact = EXCLUDED.expected_impact,
            verification_plan = EXCLUDED.verification_plan,
            provenance = EXCLUDED.provenance,
            is_published = public.rum_issue_documents.is_published OR EXCLUDED.is_published,
            last_seen_at = EXCLUDED.last_seen_at,
            updated_at = now()
        RETURNING id, (xmax = 0) INTO issue_id, was_created;


        INSERT INTO public.rum_issue_evidence (
            issue_id,
            tenant_id,
            site_id,
            evidence_kind,
            source_observation_ids,
            facts,
            evidence_weight,
            observed_at
        ) VALUES (
            issue_id,
            site_record.user_id,
            site_record.order_id,
            'rum_observation',
            candidate.source_observation_ids,
            jsonb_build_object(
                'metric', 'LCP',
                'p75_ms', candidate.p75_lcp_ms,
                'page_template', page_template,
                'target', target_name,
                'asset_url', asset_url,
                'device', device_cohort
            ),
            confidence_value,
            candidate.last_observed_at
        )
        ON CONFLICT (issue_id, evidence_kind) DO UPDATE SET
            source_observation_ids = EXCLUDED.source_observation_ids,
            facts = EXCLUDED.facts,
            evidence_weight = EXCLUDED.evidence_weight;

        INSERT INTO public.rum_issue_history (
            issue_id,
            tenant_id,
            site_id,
            event_type,
            to_status,
            details
        ) VALUES (
            issue_id,
            site_record.user_id,
            site_record.order_id,
            CASE WHEN was_created THEN 'detected' ELSE 'observation_updated' END,
            'detected',
            jsonb_build_object(
                'detector', 'detect_lcp_issues_v1',
                'sample_count', candidate.sample_count,
                'session_count', candidate.session_count,
                'p75_ms', candidate.p75_lcp_ms,
                'observation_key', fingerprint
            )
        )
        ON CONFLICT (issue_id, event_type, (details->>'observation_key'))
        WHERE details->>'observation_key' IS NOT NULL
        DO NOTHING;

        detected_count := detected_count + 1;
    END LOOP;

    RETURN detected_count;
END;
$$;

REVOKE ALL ON FUNCTION public.detect_lcp_issues_v1(uuid, timestamptz, timestamptz, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.detect_lcp_issues_v1(uuid, timestamptz, timestamptz, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.detect_lcp_issues_v1(uuid, timestamptz, timestamptz, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.detect_lcp_issues_v1(uuid, timestamptz, timestamptz, boolean) TO service_role;


