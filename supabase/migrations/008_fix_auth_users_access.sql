-- Fix RLS policies that try to access auth.users directly
-- Create a helper function to get user email safely

-- Function to get current user's email
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN user_email;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email() TO anon;

-- Function to get invitation by token (for registration)
-- This allows anonymous users to check invitations during signup
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(invite_token TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  token TEXT,
  status TEXT,
  created_by UUID,
  approved_by UUID,
  note TEXT,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.id,
    ui.email,
    ui.token,
    ui.status,
    ui.created_by,
    ui.approved_by,
    ui.note,
    ui.expires_at,
    ui.used_at,
    ui.created_at,
    ui.updated_at
  FROM user_invitations ui
  WHERE ui.token = invite_token
    AND ui.status = 'pending'
    AND (ui.expires_at IS NULL OR ui.expires_at > NOW());
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon;

-- Function to create user profile (for signup)
-- This allows users to create their own profile after registration
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id UUID,
  p_invitation_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'pending'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Only allow users to create their own profile
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Can only create profile for yourself';
  END IF;

  -- Insert or update profile
  INSERT INTO user_profiles (user_id, status, invitation_id)
  VALUES (p_user_id, p_status, p_invitation_id)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    invitation_id = COALESCE(EXCLUDED.invitation_id, user_profiles.invitation_id),
    updated_at = NOW()
  RETURNING user_id INTO profile_id;

  RETURN profile_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, UUID, TEXT) TO anon;

-- ============================================
-- USER_INVITATIONS - Fix policies
-- ============================================
DROP POLICY IF EXISTS "Users can read own invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can update own invitations" ON user_invitations;

-- Users can read invitations with their email OR approved users can read all
-- Also allow anonymous users to read invitations by token (for registration)
CREATE POLICY "Users can read own invitations"
  ON user_invitations FOR SELECT
  USING (
    email = public.get_user_email()
    OR public.is_user_approved()
    OR (auth.uid() IS NULL AND status = 'pending') -- Allow anonymous users to check pending invitations by token
  );

-- Users can update invitations with their email (for accepting)
CREATE POLICY "Users can update own invitations"
  ON user_invitations FOR UPDATE
  USING (email = public.get_user_email())
  WITH CHECK (email = public.get_user_email());

-- Ensure approved users can manage invitations (SELECT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Approved users can manage invitations" ON user_invitations;

CREATE POLICY "Approved users can manage invitations"
  ON user_invitations FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- Separate policy for INSERT to ensure it works
DROP POLICY IF EXISTS "Approved users can insert invitations" ON user_invitations;

CREATE POLICY "Approved users can insert invitations"
  ON user_invitations FOR INSERT
  WITH CHECK (public.is_user_approved());

-- ============================================
-- USER_PROFILES - Ensure INSERT policy works
-- ============================================
-- Recreate INSERT policy to ensure it works for new users
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

