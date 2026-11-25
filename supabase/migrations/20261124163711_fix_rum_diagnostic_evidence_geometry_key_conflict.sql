-- Correct PostgreSQL type resolution for canonical CLS evidence keys.
-- Cast the allowed-key list to text[] so geometric type names dx and dy remain string keys.

CREATE OR REPLACE FUNCTION public.rum_diagnostic_evidence_is_valid(p_evidence jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    item jsonb;
    nested jsonb;
    field jsonb;
    rect jsonb;
BEGIN
    IF p_evidence IS NULL THEN
        RETURN true;
    END IF;

    IF jsonb_typeof(p_evidence) <> 'object'
        OR octet_length(p_evidence::text) > 4096 THEN
        RETURN false;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_object_keys(p_evidence) AS key(name)
        WHERE name NOT IN (
            'lcp', 'render_blockers', 'slow_resources', 'cls_shifts', 'inp', 'errors'
        )
    ) THEN
        RETURN false;
    END IF;

    IF jsonb_typeof(p_evidence -> 'lcp') IS DISTINCT FROM 'array'
        OR jsonb_array_length(p_evidence -> 'lcp') > 3
        OR jsonb_typeof(p_evidence -> 'render_blockers') IS DISTINCT FROM 'array'
        OR jsonb_array_length(p_evidence -> 'render_blockers') > 3
        OR jsonb_typeof(p_evidence -> 'slow_resources') IS DISTINCT FROM 'array'
        OR jsonb_array_length(p_evidence -> 'slow_resources') > 5
        OR jsonb_typeof(p_evidence -> 'cls_shifts') IS DISTINCT FROM 'array'
        OR jsonb_array_length(p_evidence -> 'cls_shifts') > 3
        OR jsonb_typeof(p_evidence -> 'errors') IS DISTINCT FROM 'array'
        OR jsonb_array_length(p_evidence -> 'errors') > 5 THEN
        RETURN false;
    END IF;

    FOR item IN SELECT value FROM jsonb_array_elements(p_evidence -> 'lcp') LOOP
        IF jsonb_typeof(item) <> 'object' THEN
            RETURN false;
        END IF;
        IF EXISTS (
            SELECT 1
            FROM jsonb_object_keys(item) AS key(name)
            WHERE name NOT IN (
                'url', 'target', 'resource_load_delay_ms', 'resource_load_duration_ms',
                'element_render_delay_ms', 'candidate_ttfb_ms', 'transfer_bytes',
                'decoded_bytes', 'image_width', 'image_height', 'is_lazy',
                'fetch_priority', 'font'
            )
        ) THEN
            RETURN false;
        END IF;
        FOR field IN SELECT value FROM jsonb_each(item) LOOP
            IF jsonb_typeof(field) = 'number' AND field::text::numeric < 0 THEN
                RETURN false;
            END IF;
        END LOOP;
        IF item ? 'is_lazy' AND jsonb_typeof(item -> 'is_lazy') NOT IN ('boolean', 'null') THEN
            RETURN false;
        END IF;
        nested := item -> 'font';
        IF nested IS NOT NULL AND jsonb_typeof(nested) <> 'null' THEN
            IF jsonb_typeof(nested) <> 'object' THEN
                RETURN false;
            END IF;
            IF EXISTS (
                SELECT 1
                FROM jsonb_object_keys(nested) AS key(name)
                WHERE name NOT IN ('family', 'weight', 'size', 'url', 'transfer_bytes')
            ) THEN
                RETURN false;
            END IF;
            IF (nested -> 'transfer_bytes') IS NOT NULL
                AND jsonb_typeof(nested -> 'transfer_bytes') <> 'number' THEN
                RETURN false;
            END IF;
        END IF;
    END LOOP;


    FOR item IN SELECT value FROM jsonb_array_elements(p_evidence -> 'cls_shifts') LOOP
        IF jsonb_typeof(item) <> 'object' THEN
            RETURN false;
        END IF;
        IF EXISTS (
            SELECT 1
            FROM jsonb_object_keys(item) AS key(name)
            WHERE name::text NOT IN (
                'target', 'involved_elements', 'value', 'viewport_ratio', 'time_ms',
                'load_state', 'area_delta', 'distance_moved', 'dx', 'dy',
                'previous_rect', 'current_rect'
            )::text[]
        ) THEN
            RETURN false;
        END IF;
        IF jsonb_typeof(item -> 'involved_elements') IS DISTINCT FROM 'array'
            OR jsonb_array_length(item -> 'involved_elements') > 5 THEN
            RETURN false;
        END IF;
        IF EXISTS (
            SELECT 1
            FROM jsonb_array_elements(item -> 'involved_elements') AS element(value)
            WHERE jsonb_typeof(element.value) <> 'string'
        ) THEN
            RETURN false;
        END IF;
        FOR field IN SELECT key, value FROM jsonb_each(item) LOOP
            IF field.key IN ('value', 'viewport_ratio', 'time_ms', 'distance_moved')
                AND jsonb_typeof(field.value) = 'number'
                AND field.value::text::numeric < 0 THEN
                RETURN false;
            END IF;
        END LOOP;
        FOR rect IN SELECT value FROM jsonb_each(item) WHERE key IN ('previous_rect', 'current_rect') LOOP
            IF rect IS NOT NULL AND jsonb_typeof(rect) <> 'null' THEN
                IF jsonb_typeof(rect) <> 'object' THEN
                    RETURN false;
                END IF;
                IF EXISTS (
                    SELECT 1
                    FROM jsonb_object_keys(rect) AS key(name)
                    WHERE name NOT IN ('x', 'y', 'width', 'height')
                ) THEN
                    RETURN false;
                END IF;
                IF (rect -> 'width') IS NOT NULL
                    AND jsonb_typeof(rect -> 'width') = 'number'
                    AND (rect -> 'width')::text::numeric < 0 THEN
                    RETURN false;
                END IF;
                IF (rect -> 'height') IS NOT NULL
                    AND jsonb_typeof(rect -> 'height') = 'number'
                    AND (rect -> 'height')::text::numeric < 0 THEN
                    RETURN false;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RETURN true;
END;
$$;

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
