-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Remove unused user_has_profile function if it exists
DROP FUNCTION IF EXISTS public.user_has_profile();

-- Recreate is_user_approved with explicit search_path to fix the warning
-- Using CREATE OR REPLACE to avoid dropping dependent RLS policies
CREATE OR REPLACE FUNCTION public.is_user_approved()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND status = 'approved'
  );
END;
$$;

