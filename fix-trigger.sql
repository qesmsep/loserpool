-- Fix Trigger and Create User Profile
-- Run this in Supabase SQL Editor

-- First, let's check if the auth user exists
SELECT id, email, created_at FROM auth.users WHERE id = '04777ec2-60f9-45db-ae99-5b0e3bbc111e';

-- If the auth user exists, create the profile
-- Replace 'your-email@example.com' with your actual email
INSERT INTO users (id, email, username, is_admin) 
VALUES ('04777ec2-60f9-45db-ae99-5b0e3bbc111e', 'your-email@example.com', NULL, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Verify the user was created
SELECT * FROM users WHERE id = '04777ec2-60f9-45db-ae99-5b0e3bbc111e';

-- Make yourself admin (replace with your email)
UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';

-- Now let's fix the trigger for future users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Wait a moment for the auth user to be fully committed
  PERFORM pg_sleep(0.1);
  
  -- Check if user already exists in users table
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
    BEGIN
      INSERT INTO users (id, email, username, is_admin)
      VALUES (NEW.id, NEW.email, NULL, FALSE);
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error but don't fail the auth signup
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Test the trigger by checking if it exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created'; 