-- Enable public read access for attendance viewing
-- This allows anonymous users to view student attendance records

-- ============================================
-- STUDENTS
-- ============================================
-- Allow anonymous users to read active students only
CREATE POLICY "Anonymous users can read active students"
  ON students FOR SELECT
  TO anon
  USING (status = 'active');

-- ============================================
-- ATTENDANCE_RECORDS
-- ============================================
-- Allow anonymous users to read only absence records (not present)
CREATE POLICY "Anonymous users can read absence records"
  ON attendance_records FOR SELECT
  TO anon
  USING (status IN ('absent', 'late', 'vacation', 'sick'));

-- ============================================
-- SCHEDULE_SESSIONS
-- ============================================
-- Allow anonymous users to read all schedule sessions
CREATE POLICY "Anonymous users can read schedule sessions"
  ON schedule_sessions FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- SCHEDULES
-- ============================================
-- Allow anonymous users to read all schedules
CREATE POLICY "Anonymous users can read schedules"
  ON schedules FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- SUBJECTS
-- ============================================
-- Allow anonymous users to read all subjects
CREATE POLICY "Anonymous users can read subjects"
  ON subjects FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- TEACHERS
-- ============================================
-- Allow anonymous users to read all teachers
CREATE POLICY "Anonymous users can read teachers"
  ON teachers FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- ABSENCE_REASONS
-- ============================================
-- Allow anonymous users to read active absence reasons
CREATE POLICY "Anonymous users can read active absence reasons"
  ON absence_reasons FOR SELECT
  TO anon
  USING (is_active = true);

