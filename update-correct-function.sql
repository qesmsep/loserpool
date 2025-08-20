-- Update the handle_new_user_signup function
-- This is the function that's actually being called by the trigger

CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Set new users as 'registered' by default (unless they're admin)
    IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data = '{}' THEN
        INSERT INTO users (
            id, 
            email, 
            user_type, 
            is_admin,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id, 
            NEW.email, 
            'registered', 
            FALSE,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    ELSE
        INSERT INTO users (
            id, 
            email, 
            user_type, 
            is_admin,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id, 
            NEW.email, 
            'registered', 
            FALSE,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
