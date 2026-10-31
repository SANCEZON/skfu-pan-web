-- Add week_number and schedule_start_date to schedules table
ALTER TABLE schedules 
  ADD COLUMN IF NOT EXISTS week_number INTEGER CHECK (week_number IN (1, 2)) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS schedule_start_date DATE DEFAULT CURRENT_DATE;

-- Update existing records to have default values
UPDATE schedules 
SET week_number = 1, schedule_start_date = CURRENT_DATE 
WHERE week_number IS NULL OR schedule_start_date IS NULL;

-- Create index for faster queries by week
CREATE INDEX IF NOT EXISTS idx_schedules_week_number ON schedules(week_number);

-- Add comment for documentation
COMMENT ON COLUMN schedules.week_number IS 'Week number in the 2-week cycle (1 or 2)';
COMMENT ON COLUMN schedules.schedule_start_date IS 'Start date of the schedule cycle for calculating current week';

