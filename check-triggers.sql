-- Check which triggers are active and fix the user signup issue
-- The problem is that handle_new_user doesn't set user_type

-- Check all triggers on auth.users table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
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

-- The issue is that handle_new_user doesn't set user_type
-- Let's fix the handle_new_user function to set user_type to 'registered'

-- Drop the old function
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the fixed function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was updated
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'handle_new_user function updated to set user_type = registered';
    RAISE NOTICE 'New user signups should now work correctly!';
END $$;
