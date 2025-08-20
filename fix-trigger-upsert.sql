-- Fix the trigger function to use UPSERT
-- This will handle duplicate emails gracefully instead of throwing errors

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    user_type, 
    is_admin,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    'registered', 
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET 
    id = EXCLUDED.id, 
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Verify the trigger is still attached
SELECT 
    'Trigger status' as status,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Test the function
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test-upsert-' || extract(epoch from now()) || '@example.com';
    test_user RECORD;
    test_user_type TEXT;
BEGIN
    RAISE NOTICE 'Testing UPSERT trigger function';
    RAISE NOTICE 'ID: %, Email: %', test_id, test_email;
    
    -- Create a test auth user
    test_user.id := test_id;
    test_user.email := test_email;
    test_user.raw_user_meta_data := '{}'::jsonb;
    
    -- Call the function
    PERFORM handle_new_user_signup(test_user);
    
    RAISE NOTICE '✅ First insert successful';
    
    -- Try to insert the same email again (should update instead of error)
    test_user.id := gen_random_uuid();
    PERFORM handle_new_user_signup(test_user);
    
    RAISE NOTICE '✅ Second insert (same email) successful - should have updated';
    
    -- Check what was actually in the database
    SELECT user_type INTO test_user_type FROM users WHERE email = test_email;
    RAISE NOTICE 'Final user type: %', test_user_type;
    
    -- Clean up
    DELETE FROM users WHERE email = test_email;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;
