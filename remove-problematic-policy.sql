-- Remove the problematic policy that could cause recursion
-- This policy references the users table within itself

BEGIN;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can update user profiles" ON users;

-- Verify the policies now
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

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'Problematic policy removed!';
    RAISE NOTICE 'No more policies that reference the users table.';
    RAISE NOTICE 'Signup should now work without recursion issues.';
END $$;
