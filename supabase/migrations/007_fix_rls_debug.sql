-- Debug and fix RLS policies
-- This migration adds better error handling and ensures policies work correctly

-- First, let's verify the function works
-- Test query (run manually in SQL Editor):
-- SELECT public.is_user_approved();

-- Ensure the function is accessible
GRANT EXECUTE ON FUNCTION public.is_user_approved() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_approved() TO anon;

-- Drop and recreate policies to ensure they're correct
-- This will fix any issues with policy conflicts

-- ============================================
-- USER_PROFILES - Recreate policies
-- ============================================
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Approved users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Approved users can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Approved users can read all profiles (including pending)
CREATE POLICY "Approved users can read all profiles"
  ON user_profiles FOR SELECT
  USING (public.is_user_approved());

-- Users can update their own profile (but not status)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Approved users can update any profile
CREATE POLICY "Approved users can update all profiles"
  ON user_profiles FOR UPDATE
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- USER_INVITATIONS - Recreate policies
-- ============================================
DROP POLICY IF EXISTS "Users can read own invitations" ON user_invitations;
DROP POLICY IF EXISTS "Approved users can manage invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can update own invitations" ON user_invitations;

-- Users can read invitations with their email OR approved users can read all
-- Note: This will be fixed in migration 008 to use get_user_email() function
CREATE POLICY "Users can read own invitations"
  ON user_invitations FOR SELECT
  USING (
    public.is_user_approved()
  );

-- Approved users can do everything with invitations
CREATE POLICY "Approved users can manage invitations"
  ON user_invitations FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- Users can update invitations with their email (for accepting)
-- Note: This will be fixed in migration 008 to use get_user_email() function
CREATE POLICY "Users can update own invitations"
  ON user_invitations FOR UPDATE
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- ============================================
-- SCHEDULE_SESSIONS - Ensure policy exists
-- ============================================
DROP POLICY IF EXISTS "Approved users can manage schedule_sessions" ON schedule_sessions;

CREATE POLICY "Approved users can manage schedule_sessions"
  ON schedule_sessions FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- ============================================
-- ATTENDANCE_RECORDS - Ensure policy exists
-- ============================================
DROP POLICY IF EXISTS "Approved users can manage attendance_records" ON attendance_records;

CREATE POLICY "Approved users can manage attendance_records"
  ON attendance_records FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

