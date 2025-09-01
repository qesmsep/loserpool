-- Create a function to update user password directly, bypassing auth_audit_log issues
CREATE OR REPLACE FUNCTION public.lp_admin_set_password(
  p_user_id uuid DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Validate input
  IF p_new_password IS NULL OR p_new_password = '' THEN
    RAISE EXCEPTION 'new_password cannot be null or empty';
  END IF;

  -- Determine target user ID
  IF p_user_id IS NOT NULL THEN
    target_user_id := p_user_id;
  ELSIF p_email IS NOT NULL THEN
    -- Find user by email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = p_email;
    
    IF target_user_id IS NULL THEN
      RAISE EXCEPTION 'User not found with email: %', p_email;
    END IF;
  ELSE
    RAISE EXCEPTION 'Either user_id or email must be provided';
  END IF;

  -- Update the user's password directly in the auth.users table
  UPDATE auth.users 
  SET 
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Return true if a row was updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found with ID: %', target_user_id;
  END IF;

  -- Clear any existing sessions for this user
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION public.lp_admin_set_password(uuid, text, text) TO service_role;
