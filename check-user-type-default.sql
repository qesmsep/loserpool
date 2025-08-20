-- Check the current user_type default and fix it
SELECT 
    'Current user_type default' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'user_type';

-- Check the current trigger function
SELECT 
    'Current trigger function' as status,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_signup';

-- Fix the user_type default to 'registered'
ALTER TABLE users ALTER COLUMN user_type SET DEFAULT 'registered';

-- Verify the fix
SELECT 
    'Updated user_type default' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'user_type';
