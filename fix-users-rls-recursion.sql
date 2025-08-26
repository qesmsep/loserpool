-- Fix Users Table RLS Infinite Recursion
-- The current admin policy is causing infinite recursion when checking is_admin

-- Drop the problematic admin policy that causes recursion
DROP POLICY IF EXISTS "Allow admin all" ON users;

-- Create a new admin policy that uses auth.jwt() instead of querying the users table
CREATE POLICY "Allow admin all" ON users
    FOR ALL
    USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_admin' = 'true'
    )
    WITH CHECK (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_admin' = 'true'
    );

-- Alternative approach: Use a function to check admin status without recursion
-- First, create a function that bypasses RLS for admin checks
CREATE OR REPLACE FUNCTION is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the JWT-based policy and create a function-based one
DROP POLICY IF EXISTS "Allow admin all" ON users;

CREATE POLICY "Allow admin all" ON users
    FOR ALL
    USING (is_user_admin(auth.uid()))
    WITH CHECK (is_user_admin(auth.uid()));

-- Test the fix
SELECT 
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- Test that the admin check function works
SELECT is_user_admin('a459c3a2-7393-4e0b-9d11-85f052a3650f') as is_admin;
