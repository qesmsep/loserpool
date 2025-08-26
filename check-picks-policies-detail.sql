-- Check Detailed Picks Table RLS Policies
-- This will show the actual qualification conditions that might be causing issues

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'picks'
ORDER BY cmd, policyname;

-- Test a simple query to see if it works
SELECT COUNT(*) as total_picks FROM picks LIMIT 1;

-- Test a user-specific query (this should work for authenticated users)
SELECT COUNT(*) as user_picks 
FROM picks 
WHERE user_id = auth.uid() 
LIMIT 1;

-- Check if RLS is enabled on picks table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'picks';
