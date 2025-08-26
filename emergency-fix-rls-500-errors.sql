-- Emergency Fix for RLS 500 Errors
-- This will temporarily disable RLS to get your app working again

BEGIN;

-- 1. Temporarily disable RLS on matchups table
ALTER TABLE matchups DISABLE ROW LEVEL SECURITY;

-- 2. Temporarily disable RLS on picks table  
ALTER TABLE picks DISABLE ROW LEVEL SECURITY;

-- 3. Test that the queries work now
SELECT 'Matchups query test:' as test_type, COUNT(*) as count 
FROM matchups 
WHERE season = 'REG1';

SELECT 'Picks query test:' as test_type, COUNT(*) as count 
FROM picks 
WHERE user_id = 'a459c3a2-7393-4e0b-9d11-85f052a3650f';

-- 4. Show current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('matchups', 'picks')
ORDER BY tablename;

COMMIT;

-- NOTE: This is a temporary fix. After your app is working, 
-- we should re-enable RLS with proper policies.
