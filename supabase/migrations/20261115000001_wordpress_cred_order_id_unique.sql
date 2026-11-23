-- One WordPress credential row per order.
--
-- POST /api/orders/managed/add upserts wordpress_cred with
-- ON CONFLICT (order_id), but the base schema (20240101000000) declared
-- order_id only as NOT NULL + FK to orders. Without a unique constraint on
-- it, PostgREST rejects every upsert with:
--   42P10: there is no unique or exclusion constraint matching the
--   ON CONFLICT specification
-- which surfaced in the onboarding UI as:
--   "Failed to store WordPress credentials" on the first "Connect site".
--
-- The constraint is dropped first so the migration is re-runnable locally
-- (ADD CONSTRAINT has no IF NOT EXISTS form).

ALTER TABLE public.wordpress_cred
  DROP CONSTRAINT IF EXISTS wordpress_cred_order_id_key;

ALTER TABLE public.wordpress_cred
  ADD CONSTRAINT wordpress_cred_order_id_key UNIQUE (order_id);