-- Base schema required for bootstrapping a fresh local Supabase database
-- Safe to run against existing databases via IF NOT EXISTS guards.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    role text NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS public.orders (
    order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    website_name text NOT NULL UNIQUE,
    website_address text NOT NULL,
    order_date timestamptz NOT NULL DEFAULT now(),
    order_status boolean NOT NULL DEFAULT true,
    favicon_file text,
    report_email text,
    rum_connection boolean DEFAULT false,
    usage_by_site integer NOT NULL DEFAULT 0,
    weekly_report boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.cloudflare_auth (
    id bigserial PRIMARY KEY,
    site_id uuid UNIQUE REFERENCES public.orders(order_id) ON DELETE CASCADE,
    token text,
    config_backup jsonb,
    status text,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.wordpress_cred (
    cred_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    payment_id text,
    wp_address text NOT NULL,
    wp_login_url text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.wp_key (
    id bigserial PRIMARY KEY,
    domain text UNIQUE REFERENCES public.orders(website_name) ON DELETE CASCADE,
    wp_secret text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL,
    message text NOT NULL,
    link text,
    read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject text NOT NULL,
    message text NOT NULL,
    related_order text,
    status text DEFAULT 'open',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message text NOT NULL,
    sender_name text,
    sender_role text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_reporting (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    optional_email text,
    report_verbosity integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.website_metadata (
    id bigserial PRIMARY KEY,
    url text NOT NULL,
    title text,
    description text,
    site_type text,
    mobile_optimized boolean,
    last_updated timestamptz
);

CREATE TABLE IF NOT EXISTS public.rum_metrics (
    id bigserial PRIMARY KEY,
    session_id text,
    domain_name text,
    current_page text,
    previous_page text,
    events jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rum_daily_distributions (
    day date NOT NULL,
    device_type text NOT NULL,
    domain_name text NOT NULL REFERENCES public.orders(website_name) ON DELETE CASCADE,
    good jsonb NOT NULL DEFAULT '{}'::jsonb,
    needs_improvement jsonb NOT NULL DEFAULT '{}'::jsonb,
    poor jsonb NOT NULL DEFAULT '{}'::jsonb,
    inserted_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (day, device_type, domain_name)
);

CREATE TABLE IF NOT EXISTS public.rum_history_new (
    day date NOT NULL,
    domain_name text NOT NULL REFERENCES public.orders(website_name) ON DELETE CASCADE,
    cls jsonb NOT NULL DEFAULT '{}'::jsonb,
    fcp jsonb NOT NULL DEFAULT '{}'::jsonb,
    inp jsonb NOT NULL DEFAULT '{}'::jsonb,
    lcp jsonb NOT NULL DEFAULT '{}'::jsonb,
    ttfb jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (day, domain_name)
);

CREATE TABLE IF NOT EXISTS public.rum_origin_hits_agg (
    agg_time timestamptz NOT NULL,
    domain_name text NOT NULL REFERENCES public.orders(website_name) ON DELETE CASCADE,
    origin_hit_count integer NOT NULL,
    origin_hit_percentage double precision NOT NULL,
    total_origin_events integer NOT NULL,
    PRIMARY KEY (agg_time, domain_name)
);

-- Legacy pre-2025 tables only needed when initializing an empty database before 20250101000001
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_services'
    ) THEN
        CREATE TABLE IF NOT EXISTS public.plan_metadata (
            plan text PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS public.subscriptions (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL,
            stripe_customer_id text,
            stripe_subscription_id text,
            status text,
            plan text REFERENCES public.plan_metadata(plan),
            period_ends_at timestamptz,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.one_time_orders (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            plan text REFERENCES public.plan_metadata(plan)
        );

        CREATE OR REPLACE VIEW public.subscription_with_limit AS
        SELECT user_id, 50000::integer AS usage_limit
        FROM public.subscriptions;
    END IF;
END $$;
