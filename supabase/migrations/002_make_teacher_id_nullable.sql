-- Make teacher_id nullable in schedules table
ALTER TABLE schedules 
  ALTER COLUMN teacher_id DROP NOT NULL;

