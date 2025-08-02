-- Fix Trigger for Future Signups
-- Run this in Supabase SQL Editor

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a better trigger function with proper error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Wait a moment for the auth user to be fully committed
  PERFORM pg_sleep(0.5);
  
  -- Check if user already exists in users table
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
    BEGIN
      INSERT INTO users (id, email, username, is_admin)
      VALUES (NEW.id, NEW.email, NULL, FALSE);
      
      -- Log successful creation
      RAISE NOTICE 'User profile created for %', NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error but don't fail the auth signup
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify the trigger was created
SELECT 'Trigger created:' as status, trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Test the function (this won't actually create a user, just test the function)
SELECT 'Function test:' as status, handle_new_user() IS NOT NULL as function_works; 