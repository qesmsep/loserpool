-- Simple diagnostic script for picks table issues
-- Run each section separately if needed

-- 1. Check RLS status
SELECT 'RLS Status:' as info;
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'picks';

-- 2. Check RLS policies
SELECT 'RLS Policies:' as info;
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'picks';

-- 3. Check foreign keys
SELECT 'Foreign Keys:' as info;
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = ccu.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'picks';

-- 4. Check all constraints
SELECT 'All Constraints:' as info;
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'picks';

-- 5. Check current picks data
SELECT 'Current Picks Data:' as info;
SELECT 
    id,
    user_id,
    matchup_id,
    team_picked,
    picks_count,
    week,
    status
FROM picks
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check triggers
SELECT 'Triggers:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'picks';
