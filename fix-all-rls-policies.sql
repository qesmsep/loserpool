-- Fix All RLS Policies
-- This script fixes the infinite recursion and ensures proper access control

BEGIN;

-- 1. Fix Users Table RLS (infinite recursion issue)
-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Allow admin all" ON users;
DROP POLICY IF EXISTS "Allow signup" ON users;
DROP POLICY IF EXISTS "Allow update own" ON users;
DROP POLICY IF EXISTS "Allow view own" ON users;

-- Create a function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate users table policies
CREATE POLICY "Allow signup" ON users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow view own" ON users
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Allow update own" ON users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow admin all" ON users
    FOR ALL
    USING (is_user_admin(auth.uid()))
    WITH CHECK (is_user_admin(auth.uid()));

-- 2. Fix Matchups Table RLS
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view matchups" ON matchups;
DROP POLICY IF EXISTS "Admins can manage matchups" ON matchups;

-- Create simple, working policies for matchups
CREATE POLICY "Anyone can view matchups" ON matchups
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage matchups" ON matchups
    FOR ALL
    USING (is_user_admin(auth.uid()))
    WITH CHECK (is_user_admin(auth.uid()));

-- 3. Fix Picks Table RLS
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own picks" ON picks;
DROP POLICY IF EXISTS "Users can create their own picks" ON picks;
DROP POLICY IF EXISTS "Users can update their own picks" ON picks;
DROP POLICY IF EXISTS "Users can delete their own picks" ON picks;
DROP POLICY IF EXISTS "Admins can view all picks" ON picks;
DROP POLICY IF EXISTS "Admins can create picks" ON picks;
DROP POLICY IF EXISTS "Admins can update all picks" ON picks;

-- Create working policies for picks
CREATE POLICY "Users can view their own picks" ON picks
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own picks" ON picks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own picks" ON picks
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own picks" ON picks
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all picks" ON picks
    FOR SELECT
    USING (is_user_admin(auth.uid()));

CREATE POLICY "Admins can create picks" ON picks
    FOR INSERT
    WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY "Admins can update all picks" ON picks
    FOR UPDATE
    USING (is_user_admin(auth.uid()))
    WITH CHECK (is_user_admin(auth.uid()));

-- 4. Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;

-- 5. Test the fixes
SELECT 'Users table policies:' as test_type;
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' ORDER BY policyname;

SELECT 'Matchups table policies:' as test_type;
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'matchups' ORDER BY policyname;

SELECT 'Picks table policies:' as test_type;
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'picks' ORDER BY policyname;

COMMIT;
