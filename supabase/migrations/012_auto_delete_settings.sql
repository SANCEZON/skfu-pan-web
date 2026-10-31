-- Add auto-delete settings to the settings table
-- These settings control automatic deletion of old data to free up space

-- Reports auto-delete settings
INSERT INTO settings (key, value, type) VALUES
  ('auto_delete_reports_enabled', 'false', 'boolean'),
  ('auto_delete_reports_days', '90', 'number'),
  ('auto_delete_reports_criteria', 'created_at', 'string')
ON CONFLICT (key) DO NOTHING;

-- Attendance records auto-delete settings
INSERT INTO settings (key, value, type) VALUES
  ('auto_delete_attendance_records_enabled', 'false', 'boolean'),
  ('auto_delete_attendance_records_days', '90', 'number'),
  ('auto_delete_attendance_records_criteria', 'created_at', 'string')
ON CONFLICT (key) DO NOTHING;

-- Activity logs auto-delete settings
INSERT INTO settings (key, value, type) VALUES
  ('auto_delete_activity_logs_enabled', 'false', 'boolean'),
  ('auto_delete_activity_logs_days', '30', 'number')
ON CONFLICT (key) DO NOTHING;

-- Notes auto-delete settings
INSERT INTO settings (key, value, type) VALUES
  ('auto_delete_notes_enabled', 'false', 'boolean'),
  ('auto_delete_notes_days', '180', 'number')
ON CONFLICT (key) DO NOTHING;

-- Last run timestamp
INSERT INTO settings (key, value, type) VALUES
  ('auto_delete_last_run', '', 'string')
ON CONFLICT (key) DO NOTHING;

