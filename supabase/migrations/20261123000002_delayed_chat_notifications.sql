-- Migration: Delayed Chat Email Notifications (15-Minute Grace Window & Unread Digest)
-- Adds email_notified_at timestamp, partial indexing, and Supabase pg_cron job.

-- 1. Add email_notified_at column to order_messages
ALTER TABLE public.order_messages
ADD COLUMN IF NOT EXISTS email_notified_at timestamptz NULL;

-- 2. Partial index for scanning unread and unnotified messages efficiently
CREATE INDEX IF NOT EXISTS idx_order_messages_unnotified_unread
ON public.order_messages (conversation_id, created_at)
WHERE read_at IS NULL AND email_notified_at IS NULL;

-- 3. Composite scan index supporting created_at threshold filtering
CREATE INDEX IF NOT EXISTS idx_order_messages_cron_digest
ON public.order_messages (created_at)
WHERE read_at IS NULL AND email_notified_at IS NULL;

-- 4. Enable pg_cron and pg_net extensions if available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 5. Register recurring scheduled job (every 5 minutes)
-- Safely unschedule first if previously registered
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('process-unread-chat-notifications')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'process-unread-chat-notifications'
        );

        PERFORM cron.schedule(
            'process-unread-chat-notifications',
            '*/5 * * * *',
            $cron$
            SELECT net.http_post(
                url := coalesce(current_setting('app.settings.service_url', true), 'http://localhost:3000') || '/api/cron/chat-notifications',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.cron_secret', true), '')
                ),
                body := '{}'::jsonb
            );
            $cron$
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron registration skipped or deferred: %', SQLERRM;
END $$;
