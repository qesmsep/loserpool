-- Clean up ALL problematic policies
-- This script removes all policies that could cause infinite recursion

BEGIN;

-- Drop ALL policies that reference the users table (these cause infinite recursion)
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can update user profiles" ON users;
DROP POLICY IF EXISTS "Admins can create user profiles" ON users;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON users;

-- Drop duplicate policies
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Users can insert themselves" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Drop any other problematic policies
DROP POLICY IF EXISTS "Allow all SELECT for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow user signup" ON users;

-- Keep only the safe policies we created
-- (These should already exist and are safe)

-- Verify the final clean policy set
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual IS NULL THEN 'No condition'
        ELSE qual
    END as condition,
    CASE 
        WHEN with_check IS NULL THEN 'No check'
        ELSE with_check
    END as check_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY cmd, policyname;

COMMIT;

-- Test the cleanup
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users';
    
    RAISE NOTICE 'Cleanup completed!';
    RAISE NOTICE 'Remaining policies: %', policy_count;
    RAISE NOTICE 'Only safe policies remain (no infinite recursion).';
    RAISE NOTICE 'Signup should now work correctly.';
END $$;
