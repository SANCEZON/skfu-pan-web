-- Create RPC function to delete all reports
-- This function physically deletes all reports from the database to free up space

CREATE OR REPLACE FUNCTION delete_all_reports()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete all reports
  DELETE FROM reports;
  
  -- Get the number of deleted rows
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Return the count
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_all_reports() TO authenticated;

