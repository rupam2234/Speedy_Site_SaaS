-- ============================================================================
-- System settings table for administrative configuration
-- Used for runtime feature toggles like automated expert assignment.
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage system_settings" ON public.system_settings;
CREATE POLICY "admins manage system_settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- Seed initial default: auto-assignment is enabled
INSERT INTO public.system_settings (key, value)
VALUES ('auto_assignment_enabled', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
