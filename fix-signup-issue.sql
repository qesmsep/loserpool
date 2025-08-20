-- Fix Signup Issue - Focus on Upsert Logic
-- Run this in Supabase SQL Editor to fix the database error

-- 1. First, ensure all required columns exist in the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'registered';
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_week INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_password_change BOOLEAN DEFAULT FALSE;

-- 2. Update the user_type constraint to allow all valid values
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('registered', 'active', 'tester', 'eliminated'));

-- 3. Create a robust trigger function with better upsert logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already exists first
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    -- Insert user profile with all required fields
    INSERT INTO public.users (
      id, 
      email, 
      phone, 
      first_name, 
      last_name, 
      username,
      user_type,
      is_admin,
      default_week,
      needs_password_change,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
      COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
      COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
      COALESCE(NEW.raw_user_meta_data->>'username', NULL),
      COALESCE(NEW.raw_user_meta_data->>'user_type', 'registered'),
      COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, FALSE),
      COALESCE((NEW.raw_user_meta_data->>'default_week')::integer, 1),
      COALESCE((NEW.raw_user_meta_data->>'needs_password_change')::boolean, FALSE),
      NOW(),
      NOW()
    );
  ELSE
    -- User already exists, update with new data if provided
    UPDATE public.users SET
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
      first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', first_name),
      last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', last_name),
      username = COALESCE(NEW.raw_user_meta_data->>'username', username),
      user_type = COALESCE(NEW.raw_user_meta_data->>'user_type', user_type),
      is_admin = COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, is_admin),
      default_week = COALESCE((NEW.raw_user_meta_data->>'default_week')::integer, default_week),
      needs_password_change = COALESCE((NEW.raw_user_meta_data->>'needs_password_change')::boolean, needs_password_change),
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Failed to create/update user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verify the trigger was created
SELECT 'Trigger created:' as status, trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 6. Test the function (this won't create a real user)
DO $$
DECLARE
  test_result boolean;
BEGIN
  -- Test if the function can be called
  SELECT handle_new_user() IS NOT NULL INTO test_result;
  RAISE NOTICE 'Trigger function test: %', CASE WHEN test_result THEN 'PASSED' ELSE 'FAILED' END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Trigger function test FAILED: %', SQLERRM;
END $$;

-- 7. Show current users table structure
SELECT 'Users table structure:' as status, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;
