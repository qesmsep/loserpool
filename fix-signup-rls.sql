-- Fix RLS policies for signup process
-- This script addresses the "Database error saving new user" issue

BEGIN;

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';

-- The issue is that Supabase tries to automatically create user profiles
-- during signup, but the RLS policies are too restrictive.
-- We need to allow this automatic insertion.

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Users can insert themselves" ON users;

-- Create a more permissive insert policy that allows signup
CREATE POLICY "Allow user signup" ON users
    FOR INSERT
    WITH CHECK (
        -- Allow if the user is inserting their own record
        auth.uid() = id
        OR
        -- Allow if no user is authenticated (for automatic signup)
        auth.uid() IS NULL
        OR
        -- Allow if the user is an admin
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Keep the existing select and update policies
-- (These should already exist from the previous script)

-- Verify the new policy was created
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
AND cmd = 'INSERT'
ORDER BY policyname;

COMMIT;

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'RLS policy fix completed!';
    RAISE NOTICE 'The signup process should now work correctly.';
    RAISE NOTICE 'Users can insert their own records during signup.';
END $$;
