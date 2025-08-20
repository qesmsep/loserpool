-- Fix the user_type column default
-- The current default is 'regular' but the constraint only allows ['registered', 'active', 'tester', 'eliminated']

-- First, let's see the current constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'users_user_type_check';

-- Update the column default to 'registered' to match the constraint
ALTER TABLE users 
ALTER COLUMN user_type SET DEFAULT 'registered';

-- Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'user_type';

-- Test inserting a user with the new default
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test-' || extract(epoch from now()) || '@example.com';
    test_user_type TEXT;
BEGIN
    RAISE NOTICE 'Testing user insertion with new default, ID: % and email: %', test_id, test_email;
    
    -- Try to insert a user without specifying user_type (should use default)
    INSERT INTO users (
        id,
        email,
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        test_id,
        test_email,
        FALSE,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'User insertion successful!';
    
    -- Check what user_type was set
    SELECT user_type INTO test_user_type FROM users WHERE id = test_id;
    RAISE NOTICE 'User type was set to: %', test_user_type;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting user: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;
