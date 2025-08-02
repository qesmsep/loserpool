-- Add missing columns to users table
-- Run this in your Supabase SQL editor

-- Add first_name column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Add last_name column  
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add phone column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add needs_password_change column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS needs_password_change BOOLEAN DEFAULT FALSE;

-- Update existing users with placeholder values if needed
UPDATE public.users 
SET 
  first_name = COALESCE(first_name, ''),
  last_name = COALESCE(last_name, ''),
  phone = COALESCE(phone, ''),
  needs_password_change = COALESCE(needs_password_change, FALSE)
WHERE first_name IS NULL OR last_name IS NULL OR phone IS NULL OR needs_password_change IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position; 