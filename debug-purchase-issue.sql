-- Debug script to check purchase table schema and test inserts
-- This will help identify why the purchase creation is failing

-- Check current purchases table structure
SELECT 
  'Purchases Table Structure' as info,
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'purchases'
ORDER BY ordinal_position;

-- Check constraints on purchases table
SELECT 
  'Purchases Table Constraints' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'purchases'::regclass
ORDER BY conname;

-- Check RLS policies on purchases table
SELECT 
  'Purchases Table RLS Policies' as info,
  policyname as policy_name,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'purchases'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
  'RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'purchases';

-- Test insert with a dummy user ID (this will fail but show the error)
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    test_purchase_id UUID;
BEGIN
    RAISE NOTICE 'Testing purchase insert with dummy user ID...';
    
    -- Try to insert a test purchase
    INSERT INTO public.purchases (user_id, stripe_session_id, amount_paid, picks_count, status)
    VALUES (test_user_id, 'test_session_' || extract(epoch from now()), 2100, 1, 'pending')
    RETURNING id INTO test_purchase_id;
    
    RAISE NOTICE 'Test insert successful - purchase ID: %', test_purchase_id;
    
    -- Clean up test data
    DELETE FROM public.purchases WHERE id = test_purchase_id;
    
    RAISE NOTICE 'Test cleanup completed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert failed: %', SQLERRM;
        RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Check recent purchases to see if any are being created
SELECT 
  'Recent Purchases' as info,
  id,
  user_id,
  stripe_session_id,
  amount_paid,
  picks_count,
  status,
  created_at
FROM purchases 
ORDER BY created_at DESC
LIMIT 5;
