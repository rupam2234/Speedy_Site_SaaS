-- Migration: Order-scoped communication channels with role-gated access (ADR-0002)
-- Implements order_conversations and order_messages tables with strict RLS enforcement.

-- 1. Helper function to check if the authenticated user is the order owner
CREATE OR REPLACE FUNCTION public.is_order_owner(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.orders
        WHERE order_id = p_order_id AND user_id = auth.uid()
    );
$$;

-- 2. Helper function to check if the authenticated user is the active assigned expert
CREATE OR REPLACE FUNCTION public.is_active_order_expert(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.order_assignments
        WHERE order_id = p_order_id AND expert_id = auth.uid() AND is_active = true
    );
$$;

-- 3. Create order_conversations table
CREATE TABLE IF NOT EXISTS public.order_conversations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        uuid NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    channel_type    text NOT NULL CHECK (channel_type IN ('client', 'internal')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    last_message_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_order_channel UNIQUE (order_id, channel_type)
);

CREATE INDEX IF NOT EXISTS idx_order_conversations_order
    ON public.order_conversations (order_id);

-- 4. Create order_messages table
CREATE TABLE IF NOT EXISTS public.order_messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.order_conversations(id) ON DELETE CASCADE,
    sender_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body            text NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 5000),
    is_system       boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    read_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_order_messages_convo_created
    ON public.order_messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_messages_sender
    ON public.order_messages (sender_id);

-- 5. Helper function to seed or ensure conversation records exist
CREATE OR REPLACE FUNCTION public.ensure_order_conversations(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.order_conversations (order_id, channel_type)
    VALUES
        (p_order_id, 'client'),
        (p_order_id, 'internal')
    ON CONFLICT (order_id, channel_type) DO NOTHING;
END;
$$;

-- 6. Trigger to automatically provision conversations on new orders
CREATE OR REPLACE FUNCTION public.trg_auto_create_order_conversations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.ensure_order_conversations(NEW.order_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_create_conversations ON public.orders;
CREATE TRIGGER trg_orders_create_conversations
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_auto_create_order_conversations();

-- 7. Trigger to bump last_message_at and updated_at on conversation
CREATE OR REPLACE FUNCTION public.update_conversation_last_message_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.order_conversations
    SET
        last_message_at = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_messages_last_message_at ON public.order_messages;
CREATE TRIGGER trg_order_messages_last_message_at
    AFTER INSERT ON public.order_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_last_message_at();

-- 8. Backfill conversations for existing orders
INSERT INTO public.order_conversations (order_id, channel_type)
SELECT o.order_id, c.channel_type
FROM public.orders o
CROSS JOIN (VALUES ('client'), ('internal')) AS c(channel_type)
ON CONFLICT (order_id, channel_type) DO NOTHING;

-- 9. Row Level Security: order_conversations
ALTER TABLE public.order_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_conversations_select" ON public.order_conversations;
CREATE POLICY "order_conversations_select" ON public.order_conversations
    FOR SELECT
    TO authenticated
    USING (
        public.get_current_user_role() = 'admin'
        OR (channel_type = 'client' AND public.is_order_owner(order_id))
        OR public.is_active_order_expert(order_id)
    );

DROP POLICY IF EXISTS "order_conversations_insert" ON public.order_conversations;
CREATE POLICY "order_conversations_insert" ON public.order_conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_current_user_role() = 'admin'
        OR (channel_type = 'client' AND public.is_order_owner(order_id))
        OR public.is_active_order_expert(order_id)
    );

-- 10. Row Level Security: order_messages
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_messages_select" ON public.order_messages;
CREATE POLICY "order_messages_select" ON public.order_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.order_conversations c
            WHERE c.id = order_messages.conversation_id
            AND (
                public.get_current_user_role() = 'admin'
                OR (c.channel_type = 'client' AND public.is_order_owner(c.order_id))
                OR public.is_active_order_expert(c.order_id)
            )
        )
    );

DROP POLICY IF EXISTS "order_messages_insert" ON public.order_messages;
CREATE POLICY "order_messages_insert" ON public.order_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.order_conversations c
            WHERE c.id = order_messages.conversation_id
            AND (
                -- Admin is strictly restricted to internal channel only
                (public.get_current_user_role() = 'admin' AND c.channel_type = 'internal')
                -- Customer is strictly restricted to client channel only
                OR (c.channel_type = 'client' AND public.is_order_owner(c.order_id))
                -- Assigned expert can participate in both channels
                OR public.is_active_order_expert(c.order_id)
            )
        )
    );

DROP POLICY IF EXISTS "order_messages_update_read" ON public.order_messages;
CREATE POLICY "order_messages_update_read" ON public.order_messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.order_conversations c
            WHERE c.id = order_messages.conversation_id
            AND (
                public.get_current_user_role() = 'admin'
                OR (c.channel_type = 'client' AND public.is_order_owner(c.order_id))
                OR public.is_active_order_expert(c.order_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.order_conversations c
            WHERE c.id = order_messages.conversation_id
            AND (
                public.get_current_user_role() = 'admin'
                OR (c.channel_type = 'client' AND public.is_order_owner(c.order_id))
                OR public.is_active_order_expert(c.order_id)
            )
        )
    );

-- 11. Realtime publication registration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_conversations;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
