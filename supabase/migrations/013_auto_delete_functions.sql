-- RPC functions for safe auto-deletion of old data
-- These functions use SECURITY DEFINER to bypass RLS when needed

-- ============================================
-- DELETE OLD REPORTS
-- ============================================
CREATE OR REPLACE FUNCTION delete_old_reports(
  p_days INTEGER,
  p_criteria TEXT DEFAULT 'created_at'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date DATE;
BEGIN
  cutoff_date := CURRENT_DATE - p_days;
  
  IF p_criteria = 'session_date' THEN
    -- Delete reports where session date is older than cutoff
    DELETE FROM reports
    WHERE id IN (
      SELECT r.id
      FROM reports r
      INNER JOIN schedule_sessions ss ON r.session_id = ss.id
      WHERE ss.date < cutoff_date
    );
  ELSE
    -- Delete reports where created_at is older than cutoff (default)
    DELETE FROM reports
    WHERE created_at::DATE < cutoff_date;
  END IF;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- DELETE OLD ATTENDANCE RECORDS
-- ============================================
CREATE OR REPLACE FUNCTION delete_old_attendance_records(
  p_days INTEGER,
  p_criteria TEXT DEFAULT 'created_at'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date DATE;
BEGIN
  cutoff_date := CURRENT_DATE - p_days;
  
  IF p_criteria = 'session_date' THEN
    -- Delete attendance records where session date is older than cutoff
    DELETE FROM attendance_records
    WHERE id IN (
      SELECT ar.id
      FROM attendance_records ar
      INNER JOIN schedule_sessions ss ON ar.session_id = ss.id
      WHERE ss.date < cutoff_date
    );
  ELSE
    -- Delete attendance records where created_at is older than cutoff (default)
    DELETE FROM attendance_records
    WHERE created_at::DATE < cutoff_date;
  END IF;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- DELETE OLD ACTIVITY LOGS
-- ============================================
CREATE OR REPLACE FUNCTION delete_old_activity_logs(
  p_days INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date DATE;
BEGIN
  cutoff_date := CURRENT_DATE - p_days;
  
  DELETE FROM activity_logs
  WHERE created_at::DATE < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- DELETE OLD NOTES
-- ============================================
CREATE OR REPLACE FUNCTION delete_old_notes(
  p_days INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date DATE;
BEGIN
  cutoff_date := CURRENT_DATE - p_days;
  
  DELETE FROM notes
  WHERE created_at::DATE < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_old_reports(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_old_attendance_records(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_old_activity_logs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_old_notes(INTEGER) TO authenticated;

