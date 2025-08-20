-- Check recent users and their usernames
SELECT 
    'Recent users with usernames' as status,
    id,
    email,
    username,
    first_name,
    last_name,
    user_type,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- Check auth.users to see what metadata was passed
SELECT 
    'Auth users metadata' as status,
    id,
    email,
    raw_user_meta_data,
    created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
