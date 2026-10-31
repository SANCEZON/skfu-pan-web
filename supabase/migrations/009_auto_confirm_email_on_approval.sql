-- Auto-confirm email when user profile is approved
-- This allows users to login immediately after their profile is approved

CREATE OR REPLACE FUNCTION auto_confirm_email_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If profile status changed from non-approved to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Confirm email if not already confirmed
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = NEW.user_id
    AND email_confirmed_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS confirm_email_on_approval ON user_profiles;

CREATE TRIGGER confirm_email_on_approval
AFTER UPDATE ON user_profiles
FOR EACH ROW
WHEN (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved'))
EXECUTE FUNCTION auto_confirm_email_on_approval();

-- Also confirm email for existing approved users
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE id IN (
  SELECT user_id FROM user_profiles WHERE status = 'approved'
)
AND email_confirmed_at IS NULL;

