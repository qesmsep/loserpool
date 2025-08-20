-- Debug trigger execution
-- Let's see exactly what's happening during signup

-- First, let's check the current handle_new_user_signup function
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_signup';

-- Check if the trigger is actually attached
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Let's create a debug version of the function that logs everything
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the trigger execution
    RAISE NOTICE 'TRIGGER FIRED: handle_new_user_signup() called';
    RAISE NOTICE 'NEW.id: %', NEW.id;
    RAISE NOTICE 'NEW.email: %', NEW.email;
    RAISE NOTICE 'NEW.raw_user_meta_data: %', NEW.raw_user_meta_data;
    
    -- Try to insert with explicit user_type
    BEGIN
        INSERT INTO users (
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
        );
        
        RAISE NOTICE 'SUCCESS: User profile created with user_type = registered';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR in trigger: %', SQLERRM;
        RAISE NOTICE 'Error code: %', SQLSTATE;
        
        -- Try to get more details about the constraint
        RAISE NOTICE 'Attempting to check constraint details...';
        
        -- Re-raise the error so the signup fails
        RAISE;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the trigger manually
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test-trigger-' || extract(epoch from now()) || '@example.com';
    test_user RECORD;
BEGIN
    -- Create a test auth user record
    test_user.id := test_id;
    test_user.email := test_email;
    test_user.raw_user_meta_data := '{}'::jsonb;
    
    RAISE NOTICE 'Testing trigger manually with ID: % and email: %', test_user.id, test_user.email;
    
    -- Call the function directly
    PERFORM handle_new_user_signup(test_user);
    
    RAISE NOTICE 'Manual trigger test completed';
    
    -- Check if user was created
    IF EXISTS (SELECT 1 FROM users WHERE id = test_user.id) THEN
        RAISE NOTICE 'SUCCESS: User profile created!';
        
        -- Show the created user
        SELECT * INTO test_user FROM users WHERE id = test_user.id;
        RAISE NOTICE 'Created user: ID=%, email=%, user_type=%, is_admin=%', 
            test_user.id, test_user.email, test_user.user_type, test_user.is_admin;
    ELSE
        RAISE NOTICE 'FAILURE: User profile was NOT created';
    END IF;
    
    -- Clean up
    DELETE FROM users WHERE id = test_user.id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in manual test: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Now let's test what happens when we try to insert a user directly
-- This will help us see if the issue is with the trigger or with the table itself
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test-direct-' || extract(epoch from now()) || '@example.com';
    test_user_type TEXT;
BEGIN
    RAISE NOTICE 'Testing direct user insertion with ID: % and email: %', test_id, test_email;
    
    -- Try to insert a user directly (bypassing the trigger)
    INSERT INTO users (
        id,
        email,
        user_type,
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        test_id,
        test_email,
        'registered',
        FALSE,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'SUCCESS: Direct user insertion worked!';
    
    -- Check what was actually inserted
    SELECT user_type INTO test_user_type FROM users WHERE id = test_id;
    RAISE NOTICE 'User type in database: %', test_user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in direct insertion: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;
