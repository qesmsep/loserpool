-- Manual test to see if the trigger works
-- This will help us understand if the trigger is the issue

-- First, let's see if there are any auth users without profiles
SELECT 
    'Auth users without profiles:' as status,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- Show some auth users that don't have profiles
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
LIMIT 5;

-- Try to manually create a user profile for a recent auth user
DO $$
DECLARE
    auth_user RECORD;
BEGIN
    -- Get a recent auth user
    SELECT * INTO auth_user
    FROM auth.users
    WHERE created_at > NOW() - INTERVAL '1 hour'
    LIMIT 1;
    
    IF auth_user.id IS NOT NULL THEN
        RAISE NOTICE 'Found auth user: %', auth_user.email;
        
        -- Try to create the profile manually
        INSERT INTO users (
            id, 
            email, 
            phone, 
            first_name, 
            last_name, 
            username,
            user_type,
            is_admin,
            created_at,
            updated_at
        )
        VALUES (
            auth_user.id,
            auth_user.email,
            auth_user.raw_user_meta_data->>'phone',
            auth_user.raw_user_meta_data->>'first_name',
            auth_user.raw_user_meta_data->>'last_name',
            auth_user.raw_user_meta_data->>'username',
            'registered',
            FALSE,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Manual profile creation attempted for: %', auth_user.email;
    ELSE
        RAISE NOTICE 'No recent auth users found';
    END IF;
END $$;

-- Check if any profiles were created
SELECT 
    'Recent user profiles:' as status,
    COUNT(*) as count
FROM users 
WHERE created_at > NOW() - INTERVAL '5 minutes';

-- Show the most recent user profiles
SELECT 
    id,
    email,
    user_type,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
