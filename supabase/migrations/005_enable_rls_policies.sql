-- Enable Row Level Security for all tables

-- Helper function to check if user is approved
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


-- ============================================
-- USER_PROFILES
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile (but not status)
-- Note: Status changes should be controlled at application level
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Approved users can read all profiles
CREATE POLICY "Approved users can read all profiles"
  ON user_profiles FOR SELECT
  USING (public.is_user_approved());

-- Approved users can update any profile
CREATE POLICY "Approved users can update all profiles"
  ON user_profiles FOR UPDATE
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- ============================================
-- USER_INVITATIONS
-- ============================================
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Users can read invitations with their email
CREATE POLICY "Users can read own invitations"
  ON user_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR public.is_user_approved()
  );

-- Approved users can do everything with invitations
CREATE POLICY "Approved users can manage invitations"
  ON user_invitations FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- Users can update invitations with their email (for accepting)
CREATE POLICY "Users can update own invitations"
  ON user_invitations FOR UPDATE
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ============================================
-- APPROVAL_LOGS
-- ============================================
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

-- Only approved users can read approval logs
CREATE POLICY "Approved users can read approval logs"
  ON approval_logs FOR SELECT
  USING (public.is_user_approved());

-- Only approved users can insert approval logs
CREATE POLICY "Approved users can insert approval logs"
  ON approval_logs FOR INSERT
  WITH CHECK (public.is_user_approved());

-- ============================================
-- NOTES
-- ============================================
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Users can read their own notes
CREATE POLICY "Users can read own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id OR public.is_user_approved());

-- Users can insert their own notes
CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id OR public.is_user_approved())
  WITH CHECK (auth.uid() = user_id OR public.is_user_approved());

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id OR public.is_user_approved());

-- ============================================
-- ACTIVITY_LOGS
-- ============================================
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own activity logs
CREATE POLICY "Users can read own activity logs"
  ON activity_logs FOR SELECT
  USING (auth.uid() = user_id OR public.is_user_approved());

-- Users can insert their own activity logs
CREATE POLICY "Users can insert own activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Approved users can read all activity logs
CREATE POLICY "Approved users can read all activity logs"
  ON activity_logs FOR SELECT
  USING (public.is_user_approved());

-- ============================================
-- SETTINGS
-- ============================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings
CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only approved users can update settings
CREATE POLICY "Approved users can update settings"
  ON settings FOR UPDATE
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- Only approved users can insert settings
CREATE POLICY "Approved users can insert settings"
  ON settings FOR INSERT
  WITH CHECK (public.is_user_approved());

-- ============================================
-- STUDENTS
-- ============================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Approved users can do everything with students
CREATE POLICY "Approved users can manage students"
  ON students FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- ============================================
-- TEACHERS
-- ============================================
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Approved users can do everything with teachers
CREATE POLICY "Approved users can manage teachers"
  ON teachers FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- ============================================
-- SUBJECTS
-- ============================================
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Approved users can do everything with subjects
CREATE POLICY "Approved users can manage subjects"
  ON subjects FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- ============================================
-- TEACHER_SUBJECTS
-- ============================================
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

-- Approved users can do everything with teacher_subjects
CREATE POLICY "Approved users can manage teacher_subjects"
  ON teacher_subjects FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- ============================================
-- SCHEDULES
-- ============================================
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Approved users can do everything with schedules
CREATE POLICY "Approved users can manage schedules"
  ON schedules FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- ============================================
-- SCHEDULE_SESSIONS
-- ============================================
ALTER TABLE schedule_sessions ENABLE ROW LEVEL SECURITY;

-- Approved users can do everything with schedule_sessions
CREATE POLICY "Approved users can manage schedule_sessions"
  ON schedule_sessions FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- ============================================
-- ABSENCE_REASONS
-- ============================================
ALTER TABLE absence_reasons ENABLE ROW LEVEL SECURITY;

-- Approved users can do everything with absence_reasons
CREATE POLICY "Approved users can manage absence_reasons"
  ON absence_reasons FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- ============================================
-- ATTENDANCE_RECORDS
-- ============================================
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Approved users can do everything with attendance_records
CREATE POLICY "Approved users can manage attendance_records"
  ON attendance_records FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

-- ============================================
-- REPORTS
-- ============================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Approved users can do everything with reports
CREATE POLICY "Approved users can manage reports"
  ON reports FOR ALL
  USING (public.is_user_approved())
  WITH CHECK (public.is_user_approved());

