-- Fix the trigger function to properly extract username and phone from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the trigger execution
    RAISE NOTICE 'TRIGGER FIRED: handle_new_user_signup() called';
    RAISE NOTICE 'NEW.id: %', NEW.id;
    RAISE NOTICE 'NEW.email: %', NEW.email;
    RAISE NOTICE 'NEW.raw_user_meta_data: %', NEW.raw_user_meta_data;

    -- Insert user profile with all metadata fields
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
        NEW.id, 
        NEW.email, 
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'username',
        'registered', 
        FALSE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET 
        phone = EXCLUDED.phone,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        username = EXCLUDED.username,
        updated_at = NOW();

    RAISE NOTICE 'SUCCESS: User profile created with all metadata fields';
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR in trigger: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the trigger is attached
SELECT 
    'Trigger verification' as status,
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_name = 'on_auth_user_created';
