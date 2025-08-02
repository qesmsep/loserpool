-- Implement Improved Trigger Function
-- Run this in Supabase SQL Editor

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the improved trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta jsonb;
  user_email text;
BEGIN
  meta := NEW.raw_user_meta_data;
  user_email := meta->>'email';

  BEGIN
    INSERT INTO public.users (id, email, username, is_admin)
    VALUES (NEW.id, user_email, NULL, FALSE);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Insert failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify the trigger was created
SELECT 'Trigger created:' as status, trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Show current users
SELECT 'Current users:' as status, COUNT(*) as count FROM users;

-- Show function definition
SELECT 'Function created:' as status, routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user'; 