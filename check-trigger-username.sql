-- Check the current trigger function to see if it handles username
SELECT 
    'Current trigger function' as status,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_signup';

-- Check if username field exists in users table
SELECT 
    'Users table structure' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'username';

-- Check the current trigger function to see what it handles
SELECT 
    'Current trigger function' as status,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_signup';
