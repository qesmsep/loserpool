-- Check all triggers and functions that might affect user creation
-- There might be multiple triggers or functions causing conflicts

-- Check ALL triggers on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- Check ALL functions that might be related to user creation
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%user%'
OR routine_name LIKE '%signup%'
OR routine_name LIKE '%auth%';

-- Check if there are any other triggers on the users table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND event_object_schema = 'public';

-- Check the exact constraint definition again
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition,
    contype as constraint_type
FROM pg_constraint 
WHERE conname = 'users_user_type_check';

-- Check if there are any other constraints on the users table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass;

-- Check the users table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
