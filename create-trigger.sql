-- Create the trigger for new user signup
-- This will ensure new users get profiles created automatically

-- First, make sure the function exists
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

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Test the trigger with a manual insert
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
BEGIN
    -- Insert a test auth user
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
    VALUES (test_id, 'test-trigger@example.com', 'dummy', NOW(), NOW(), NOW(), '{"first_name": "Test", "last_name": "User"}'::jsonb);
    
    RAISE NOTICE 'Test auth user created with ID: %', test_id;
    
    -- Check if the profile was created
    IF EXISTS (SELECT 1 FROM users WHERE id = test_id) THEN
        RAISE NOTICE 'SUCCESS: User profile was created automatically';
    ELSE
        RAISE NOTICE 'FAILED: User profile was not created';
    END IF;
    
    -- Clean up
    DELETE FROM auth.users WHERE id = test_id;
    DELETE FROM users WHERE id = test_id;
END $$;
