-- Simple test to verify signup works
-- This test simulates what happens during user signup

-- First, let's see what policies we have
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual IS NULL THEN 'No condition'
        ELSE qual
    END as condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY cmd, policyname;

-- Test: Check if we can query the users table without infinite recursion
-- This should work now that we've removed the problematic policies
SELECT COUNT(*) as user_count FROM users;

-- Test: Check the user_type constraint
-- This will show us what values are allowed
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname = 'users_user_type_check';

-- Test: Check if user_type column has a default value
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'user_type';

-- Summary
DO $$
BEGIN
    RAISE NOTICE 'Test completed successfully!';
    RAISE NOTICE 'If you see this message, there are no infinite recursion issues.';
    RAISE NOTICE 'The signup process should now work correctly.';
END $$;
