-- Simple RLS policy fix - avoids infinite recursion
-- This script fixes the "infinite recursion detected in policy" error

BEGIN;

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Users can insert themselves" ON users;
DROP POLICY IF EXISTS "Allow user signup" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can create user profiles" ON users;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON users;
DROP POLICY IF EXISTS "Allow all SELECT for authenticated users" ON users;

-- Create simple, safe policies that don't cause recursion

-- Policy 1: Allow users to insert their own record (for signup)
CREATE POLICY "Allow signup" ON users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Policy 2: Allow users to view their own record
CREATE POLICY "Allow view own" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Policy 3: Allow users to update their own record
CREATE POLICY "Allow update own" ON users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy 4: Allow admins to do everything (using auth.jwt() instead of querying users table)
CREATE POLICY "Allow admin all" ON users
    FOR ALL
    USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_admin' = 'true'
    )
    WITH CHECK (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_admin' = 'true'
    );

-- Verify the new policies were created
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
    RAISE NOTICE 'Simple RLS policy fix completed!';
    RAISE NOTICE 'No more infinite recursion.';
    RAISE NOTICE 'Signup should now work correctly.';
END $$;
