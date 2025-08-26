-- Fix RLS Policies for Picks Table
-- This ensures users can query their own picks properly

-- Check current RLS status and policies
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'picks';

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'picks';

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own picks" ON picks;
DROP POLICY IF EXISTS "Users can create their own picks" ON picks;
DROP POLICY IF EXISTS "Users can update their own picks" ON picks;
DROP POLICY IF EXISTS "Admins can view all picks" ON picks;

-- Create user policies for picks
CREATE POLICY "Users can view their own picks" ON picks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own picks" ON picks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own picks" ON picks
    FOR UPDATE USING (auth.uid() = user_id);

-- Create admin policy for viewing all picks
CREATE POLICY "Admins can view all picks" ON picks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Test a sample query (replace with actual user ID for testing)
-- SELECT 
--     id,
--     user_id,
--     matchup_id,
--     team_picked,
--     picks_count,
--     status
-- FROM picks 
-- WHERE user_id = 'some-user-id-here'
-- LIMIT 5;

-- Verify policies are working
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'picks';
