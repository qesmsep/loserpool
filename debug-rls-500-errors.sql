-- Debug RLS 500 Errors
-- This script will help identify why the matchups and picks queries are failing

-- 1. Check if RLS is enabled on both tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('matchups', 'picks')
ORDER BY tablename;

-- 2. Check all policies on matchups table
SELECT 
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'matchups'
ORDER BY policyname;

-- 3. Check all policies on picks table
SELECT 
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'picks'
ORDER BY policyname;

-- 4. Test the exact failing queries
-- Test matchups query
SELECT COUNT(*) as matchups_count 
FROM matchups 
WHERE season = 'REG1';

-- Test picks query (replace with actual user_id)
SELECT COUNT(*) as picks_count 
FROM picks 
WHERE user_id = 'a459c3a2-7393-4e0b-9d11-85f052a3650f';

-- 5. Check if there are any conflicting policies
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('matchups', 'picks')
GROUP BY tablename;
