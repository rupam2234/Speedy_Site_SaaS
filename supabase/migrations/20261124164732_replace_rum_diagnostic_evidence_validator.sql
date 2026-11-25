-- Replace the PL/pgSQL evidence validator with an equivalent SQL expression.
-- Explicit aliases avoid PL/pgSQL record-field ambiguity for canonical JSON keys.
CREATE OR REPLACE FUNCTION public.rum_diagnostic_evidence_is_valid(p_evidence jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $function$
    SELECT
        p_evidence IS NULL
        OR (
            jsonb_typeof(p_evidence) = 'object'
            AND octet_length(p_evidence::text) <= 4096
            AND NOT EXISTS (
                SELECT 1
                FROM jsonb_object_keys(p_evidence) AS key(name)
                WHERE name::text <> ALL (ARRAY[
                    'lcp', 'render_blockers', 'slow_resources',
                    'cls_shifts', 'inp', 'errors'
                ]::text[])
            )
            AND jsonb_typeof(p_evidence -> 'lcp') = 'array'
            AND jsonb_array_length(p_evidence -> 'lcp') <= 3
            AND jsonb_typeof(p_evidence -> 'render_blockers') = 'array'
            AND jsonb_array_length(p_evidence -> 'render_blockers') <= 3
            AND jsonb_typeof(p_evidence -> 'slow_resources') = 'array'
            AND jsonb_array_length(p_evidence -> 'slow_resources') <= 5
            AND jsonb_typeof(p_evidence -> 'cls_shifts') = 'array'
            AND jsonb_array_length(p_evidence -> 'cls_shifts') <= 3
            AND jsonb_typeof(p_evidence -> 'errors') = 'array'
            AND jsonb_array_length(p_evidence -> 'errors') <= 5
            AND NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(p_evidence -> 'lcp') AS lcp_item(item)
                WHERE jsonb_typeof(lcp_item.item) <> 'object'
                    OR EXISTS (
                        SELECT 1
                        FROM jsonb_object_keys(lcp_item.item) AS key(name)
                        WHERE name::text <> ALL (ARRAY[
                            'url', 'target', 'resource_load_delay_ms',
                            'resource_load_duration_ms', 'element_render_delay_ms',
                            'candidate_ttfb_ms', 'transfer_bytes', 'decoded_bytes',
                            'image_width', 'image_height', 'is_lazy',
                            'fetch_priority', 'font'
                        ]::text[])
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM jsonb_each(lcp_item.item) AS field(key, value)
                        WHERE jsonb_typeof(field.value) = 'number'
                            AND field.value::text::numeric < 0
                    )
                    OR (
                        lcp_item.item ? 'is_lazy'
                        AND jsonb_typeof(lcp_item.item -> 'is_lazy') NOT IN ('boolean', 'null')
                    )
                    OR (
                        lcp_item.item ? 'font'
                        AND jsonb_typeof(lcp_item.item -> 'font') NOT IN ('object', 'null')
                    )
                    OR (
                        jsonb_typeof(lcp_item.item -> 'font') = 'object'
                        AND (
                            EXISTS (
                                SELECT 1
                                FROM jsonb_object_keys(lcp_item.item -> 'font') AS key(name)
                                WHERE name::text <> ALL (ARRAY[
                                    'family', 'weight', 'size', 'url', 'transfer_bytes'
                                ]::text[])
                            )
                            OR (
                                lcp_item.item -> 'font' ? 'transfer_bytes'
                                AND jsonb_typeof(lcp_item.item -> 'font' -> 'transfer_bytes')
                                    NOT IN ('number', 'null')
                            )
                        )
                    )
            )

            AND NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(p_evidence -> 'cls_shifts') AS cls_item(item)
                WHERE jsonb_typeof(cls_item.item) <> 'object'
                    OR EXISTS (
                        SELECT 1
                        FROM jsonb_object_keys(cls_item.item) AS key(name)
                        WHERE name::text <> ALL (ARRAY[
                            'target', 'involved_elements', 'value', 'viewport_ratio',
                            'time_ms', 'load_state', 'area_delta', 'distance_moved',
                            'dx', 'dy', 'previous_rect', 'current_rect'
                        ]::text[])
                    )
                    OR jsonb_typeof(cls_item.item -> 'involved_elements') IS DISTINCT FROM 'array'
                    OR jsonb_array_length(cls_item.item -> 'involved_elements') > 5
                    OR EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements(cls_item.item -> 'involved_elements')
                            AS element(value)
                        WHERE jsonb_typeof(element.value) <> 'string'
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM jsonb_each(cls_item.item) AS field(key, value)
                        WHERE field.key::text = ANY (ARRAY[
                            'value', 'viewport_ratio', 'time_ms', 'distance_moved'
                        ]::text[])
                            AND jsonb_typeof(field.value) = 'number'
                            AND field.value::text::numeric < 0
                    )
                    OR (
                        cls_item.item ? 'previous_rect'
                        AND jsonb_typeof(cls_item.item -> 'previous_rect') NOT IN ('object', 'null')
                    )
                    OR (
                        cls_item.item ? 'current_rect'
                        AND jsonb_typeof(cls_item.item -> 'current_rect') NOT IN ('object', 'null')
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM jsonb_each(cls_item.item) AS rect(key, value)
                        WHERE rect.key::text IN ('previous_rect', 'current_rect')
                            AND jsonb_typeof(rect.value) = 'object'
                            AND (
                                EXISTS (
                                    SELECT 1
                                    FROM jsonb_object_keys(rect.value) AS key(name)
                                    WHERE name::text <> ALL (ARRAY[
                                        'x', 'y', 'width', 'height'
                                    ]::text[])
                                )
                                OR EXISTS (
                                    SELECT 1
                                    FROM jsonb_each(rect.value) AS dimension(key, value)
                                    WHERE dimension.key::text IN ('width', 'height')
                                        AND jsonb_typeof(dimension.value) = 'number'
                                        AND dimension.value::text::numeric < 0
                                )
                            )
                    )
            )
        );
$function$;

DROP FUNCTION IF EXISTS public.diagnose_rum_diagnostic_evidence_function();

ALTER TABLE public.rum_metrics
    DROP CONSTRAINT IF EXISTS rum_metrics_diagnostic_evidence_check;

ALTER TABLE public.rum_metrics
    ADD CONSTRAINT rum_metrics_diagnostic_evidence_check
        CHECK (public.rum_diagnostic_evidence_is_valid(diagnostic_evidence))
        NOT VALID;

REVOKE ALL ON FUNCTION public.rum_diagnostic_evidence_is_valid(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rum_diagnostic_evidence_is_valid(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.rum_diagnostic_evidence_is_valid(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rum_diagnostic_evidence_is_valid(jsonb) TO service_role;
