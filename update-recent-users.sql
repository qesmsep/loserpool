-- Update recent users with their correct metadata from auth.users
UPDATE users 
SET 
    username = auth_users.raw_user_meta_data->>'username',
    phone = auth_users.raw_user_meta_data->>'phone',
    first_name = auth_users.raw_user_meta_data->>'first_name',
    last_name = auth_users.raw_user_meta_data->>'last_name',
    updated_at = NOW()
FROM auth.users as auth_users
WHERE users.id = auth_users.id
AND users.username IS NULL
AND auth_users.raw_user_meta_data->>'username' IS NOT NULL;

-- Verify the updates
SELECT 
    'Updated users' as status,
    u.id,
    u.email,
    u.username,
    u.phone,
    u.first_name,
    u.last_name,
    u.user_type,
    u.updated_at
FROM users u
JOIN auth.users au ON u.id = au.id
WHERE au.raw_user_meta_data->>'username' IS NOT NULL
ORDER BY u.created_at DESC 
LIMIT 5;
