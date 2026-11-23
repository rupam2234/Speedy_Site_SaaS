-- Live WordPress plugin and RUM status, stored after each combined check.
-- These timestamps are observational only; the settings page always performs a
-- live probe before it reports the current state.
ALTER TABLE public.wp_key
  ADD COLUMN IF NOT EXISTS plugin_active_at timestamptz,
  ADD COLUMN IF NOT EXISTS rum_active_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

-- A plugin access key must not be shared by two sites.
CREATE UNIQUE INDEX IF NOT EXISTS wp_key_wp_secret_unique
  ON public.wp_key (wp_secret)
  WHERE wp_secret IS NOT NULL;
