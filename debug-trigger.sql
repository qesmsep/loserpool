-- Debug the trigger to see if it's being called
-- This will help us understand why the signup is still failing

-- Check if the trigger is active on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing,
    event_object_schema,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- Check if there are any triggers that call handle_new_user
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE action_statement LIKE '%handle_new_user%';

-- Let's add some debugging to the handle_new_user function
-- First, drop the current function
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a debug version that logs what's happening
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'handle_new_user trigger called for user: %', NEW.email;
  RAISE NOTICE 'raw_user_meta_data: %', NEW.raw_user_meta_data;
  
  INSERT INTO public.users (
    id, 
    email, 
    phone, 
    first_name, 
    last_name, 
    username,
    user_type,
    is_admin,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'username',
    'registered',
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'User record created successfully for: %', NEW.email;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function directly
DO $$
DECLARE
    test_user RECORD;
BEGIN
    -- Create a test auth user record
    test_user.id := gen_random_uuid();
    test_user.email := 'test-trigger@example.com';
    test_user.raw_user_meta_data := '{"first_name": "Test", "last_name": "User"}'::jsonb;
    
    -- Call the function manually
    PERFORM handle_new_user() FROM (SELECT test_user.*) AS NEW;
    
    RAISE NOTICE 'Manual trigger test completed';
END $$;

-- Check if the test user was created
SELECT id, email, user_type, created_at 
FROM users 
WHERE email = 'test-trigger@example.com';

-- Clean up test user
DELETE FROM users WHERE email = 'test-trigger@example.com'; 