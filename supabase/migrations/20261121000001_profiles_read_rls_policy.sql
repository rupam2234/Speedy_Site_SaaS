-- Migration: profiles read RLS policies for users, experts, and admins
-- Avoids RLS recursion by using a SECURITY DEFINER helper function.

-- 1. Helper function to safely read the current user's role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and experts can read all profiles" ON public.profiles;

-- 3. Policy: Authenticated users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- 4. Policy: Admins and experts can read all profiles
CREATE POLICY "Admins and experts can read all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'expert'));
