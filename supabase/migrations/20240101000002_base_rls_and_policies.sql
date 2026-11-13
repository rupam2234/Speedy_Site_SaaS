-- ============================================================================
-- Base RLS enablement and policies for pre-2025 tables (parity with prod)
-- Idempotent / safe to re-run.
-- ============================================================================

ALTER TABLE public.cloudflare_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_reporting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rum_daily_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rum_history_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rum_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rum_origin_hits_agg ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordpress_cred ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wp_key ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Delete site" ON public.orders;
CREATE POLICY "Delete site"
    ON public.orders
    FOR DELETE
    USING (((SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "email_reporting_delete_own_order" ON public.email_reporting;
CREATE POLICY "email_reporting_delete_own_order"
    ON public.email_reporting
    FOR DELETE
    TO authenticated
    USING ((EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE ((o.order_id = email_reporting.order_id) AND (o.user_id = (SELECT auth.uid() AS uid)))
    )));

DROP POLICY IF EXISTS "email_reporting_insert_own_order" ON public.email_reporting;
CREATE POLICY "email_reporting_insert_own_order"
    ON public.email_reporting
    FOR INSERT
    TO authenticated
    WITH CHECK ((EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE ((o.order_id = email_reporting.order_id) AND (o.user_id = (SELECT auth.uid() AS uid)))
    )));

DROP POLICY IF EXISTS "email_reporting_update_own_order" ON public.email_reporting;
CREATE POLICY "email_reporting_update_own_order"
    ON public.email_reporting
    FOR UPDATE
    TO authenticated
    USING ((EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE ((o.order_id = email_reporting.order_id) AND (o.user_id = (SELECT auth.uid() AS uid)))
    )))
    WITH CHECK ((EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE ((o.order_id = email_reporting.order_id) AND (o.user_id = (SELECT auth.uid() AS uid)))
    )));
