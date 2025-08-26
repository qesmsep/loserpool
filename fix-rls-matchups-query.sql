-- Fix RLS Policies for Matchups Table
-- This ensures the matchups table can be queried properly

-- Check current RLS status and policies
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'matchups';

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'matchups';

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Anyone can view matchups" ON matchups;
DROP POLICY IF EXISTS "Admins can manage matchups" ON matchups;

-- Create a simple, permissive policy for viewing matchups
CREATE POLICY "Anyone can view matchups" ON matchups
    FOR SELECT USING (true);

-- Create admin policy for managing matchups
CREATE POLICY "Admins can manage matchups" ON matchups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Test the query that was failing
SELECT 
    id,
    week,
    away_team,
    home_team,
    season,
    game_time,
    status
FROM matchups 
WHERE season = 'REG1'
ORDER BY week ASC, game_time ASC
LIMIT 5;

-- Verify policies are working
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'matchups';
