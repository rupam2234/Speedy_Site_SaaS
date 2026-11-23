-- Backfill: Set role='user' for existing profiles with NULL role
-- These are users who signed up before the trigger was fixed

UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL;

-- Also ensure future profiles get the role from metadata
-- (already done in 20261116150133_fix_user_role_on_signup.sql)
