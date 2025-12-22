-- Create a trigger to automatically set default role for new profiles
-- This ensures all new users get the 'user' role by default

-- First, add a default value to the role column if it doesn't exist
ALTER TABLE profiles
ALTER COLUMN role SET DEFAULT 'user';

-- Create a function to set default role if not provided
CREATE OR REPLACE FUNCTION set_default_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is NULL, set it to 'user'
  IF NEW.role IS NULL THEN
    NEW.role := 'user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that runs before insert on profiles table
DROP TRIGGER IF EXISTS ensure_default_role ON profiles;
CREATE TRIGGER ensure_default_role
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_default_role();

-- Verify the default is set
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';
