-- Debug script to check picks deletion issue
-- This will help identify why picks aren't being deleted properly

-- Check the current picks table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'picks' 
ORDER BY ordinal_position;

-- Check for any RLS (Row Level Security) policies that might prevent deletion
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'picks';

-- Check if there are any triggers that might interfere with deletion
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'picks';

-- Check current picks data (replace 'your-user-id' with actual user ID)
-- You can get your user ID from the browser console or Supabase auth
SELECT 
    id,
    user_id,
    matchup_id,
    team_picked,
    picks_count,
    week,
    status,
    created_at,
    updated_at
FROM picks 
ORDER BY created_at DESC;

-- Check if there are any foreign key constraints that might prevent deletion
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'picks';

-- Test deletion manually (replace with actual user_id and week)
-- Uncomment and modify the lines below to test deletion:
/*
DELETE FROM picks 
WHERE user_id = 'your-user-id-here' 
AND week = 1;

-- Check if deletion worked
SELECT COUNT(*) as remaining_picks 
FROM picks 
WHERE user_id = 'your-user-id-here' 
AND week = 1;
*/
