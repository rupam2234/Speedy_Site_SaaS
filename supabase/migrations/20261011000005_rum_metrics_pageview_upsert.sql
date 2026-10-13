-- ============================================================================
-- rum_metrics: one row per pageview. Continuation beacons (chunked payloads)
-- share a pageview_id and merge into the same row via this upsert RPC, so
-- analytics always counts one pageview as one row. Existing rows (pageview_id
-- null) are untouched.
-- ============================================================================

ALTER TABLE rum_metrics ADD COLUMN IF NOT EXISTS pageview_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_rum_metrics_pageview_id
    ON rum_metrics (pageview_id)
    WHERE pageview_id IS NOT NULL;

-- Order-independent merge: chunks may flush from different shards
CREATE OR REPLACE FUNCTION public.upsert_rum_metrics_batch(payloads jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO rum_metrics (pageview_id, session_id, domain_name, current_page,
                             previous_page, events, created_at)
    SELECT
        NULLIF(p->>'pageview_id', ''),
        p->>'session_id',
        p->>'domain_name',
        p->>'current_page',
        p->>'previous_page',
        COALESCE(p->'events', '[]'::jsonb),
        COALESCE(p->>'created_at', now()::text)::timestamptz
    FROM jsonb_array_elements(payloads) AS p
    ON CONFLICT (pageview_id) WHERE pageview_id IS NOT NULL DO UPDATE
        SET events = rum_metrics.events || COALESCE(EXCLUDED.events, '[]'::jsonb),
            previous_page = COALESCE(rum_metrics.previous_page, EXCLUDED.previous_page);
$$;

REVOKE ALL ON FUNCTION public.upsert_rum_metrics_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_rum_metrics_batch(jsonb) TO service_role;
