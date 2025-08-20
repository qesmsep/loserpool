-- Check the trigger function to ensure it sets user_type correctly
SELECT 
    'Current trigger function' as status,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_signup';

-- Check recent users to see their user_type values
SELECT 
    'Recent users user_type' as status,
    id,
    email,
    username,
    user_type,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
