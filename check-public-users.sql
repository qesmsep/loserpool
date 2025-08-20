-- Check the public.users table to see if usernames and phone are stored
SELECT 
    'Public users table' as status,
    id,
    email,
    username,
    phone,
    first_name,
    last_name,
    user_type,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 10;
