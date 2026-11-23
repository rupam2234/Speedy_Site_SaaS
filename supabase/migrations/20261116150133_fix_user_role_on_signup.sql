-- Fix: Set role from user_metadata on signup
-- The handle_new_user() trigger only inserts id + email, missing the role.
-- This updates the trigger to also copy userRole from raw_user_meta_data.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, email, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'userRole', 'user')
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;