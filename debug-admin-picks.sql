-- Debug Admin Picks Creation
-- Run this to check what's preventing picks from being created

-- Check current table structure
SELECT 
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'picks'
ORDER BY ordinal_position;

-- Check if there are any picks in the table
SELECT COUNT(*) as total_picks FROM picks;

-- Check recent purchases
SELECT 
  id,
  user_id,
  picks_count,
  status,
  created_at
FROM purchases
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 10;

-- Check if the table constraints are blocking inserts
-- This will show any constraint violations
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.picks'::regclass
ORDER BY conname;

-- Check RLS policies again
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'picks'
ORDER BY policyname;
