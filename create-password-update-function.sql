-- Create a function to update user password directly
CREATE OR REPLACE FUNCTION update_user_password_direct(user_id uuid, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user's password directly in the auth.users table
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = user_id;
  
  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION update_user_password_direct(uuid, text) TO service_role;
