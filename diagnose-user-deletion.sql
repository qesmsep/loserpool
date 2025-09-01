-- User Deletion Diagnostic Script
-- Run this in Supabase SQL Editor to diagnose user deletion issues

-- 1. Check RLS status and policies
SELECT '=== RLS STATUS ===' as section;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('users', 'purchases', 'picks', 'weekly_results', 'invitations')
ORDER BY tablename;

-- 2. Check existing RLS policies
SELECT '=== EXISTING RLS POLICIES ===' as section;
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'DELETE' THEN '❌ NEEDS DELETE POLICY'
    ELSE cmd
  END as status
FROM pg_policies 
WHERE tablename IN ('users', 'purchases', 'picks', 'weekly_results', 'invitations')
ORDER BY tablename, cmd;

-- 3. Check for DELETE policies specifically
SELECT '=== DELETE POLICIES CHECK ===' as section;
SELECT 
  tablename,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies 
WHERE tablename IN ('users', 'purchases', 'picks', 'weekly_results', 'invitations')
GROUP BY tablename
ORDER BY tablename;

-- 4. Check foreign key constraints
SELECT '=== FOREIGN KEY CONSTRAINTS ===' as section;
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users'
ORDER BY tc.table_name;

-- 5. Check if service role key is configured (this will show in logs)
SELECT '=== SERVICE ROLE CHECK ===' as section;
SELECT 
  'Check your .env.local file for SUPABASE_SERVICE_ROLE_KEY' as instruction,
  'The key should start with "eyJ..." and be very long' as format;

-- 6. Check admin users
SELECT '=== ADMIN USERS ===' as section;
SELECT 
  id,
  email,
  is_admin,
  created_at
FROM users 
WHERE is_admin = true
ORDER BY created_at DESC;

-- 7. Check recent users for testing
SELECT '=== RECENT USERS FOR TESTING ===' as section;
SELECT 
  id,
  email,
  username,
  is_admin,
  created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- 8. Check for orphaned records
SELECT '=== ORPHANED RECORDS CHECK ===' as section;

-- Check for picks without users
SELECT 'Picks without users:' as check_type, COUNT(*) as count
FROM picks p
LEFT JOIN users u ON p.user_id = u.id
WHERE u.id IS NULL;

-- Check for purchases without users
SELECT 'Purchases without users:' as check_type, COUNT(*) as count
FROM purchases p
LEFT JOIN users u ON p.user_id = u.id
WHERE u.id IS NULL;

-- Check for weekly_results without users
SELECT 'Weekly results without users:' as check_type, COUNT(*) as count
FROM weekly_results w
LEFT JOIN users u ON w.user_id = u.id
WHERE u.id IS NULL;

-- 9. Test admin permissions
SELECT '=== ADMIN PERMISSION TEST ===' as section;
SELECT 
  'To test admin permissions, run this query as an admin user:' as instruction,
  'SELECT auth.uid() as current_user_id, is_admin FROM users WHERE id = auth.uid();' as test_query;

-- 10. Summary and recommendations
SELECT '=== SUMMARY & RECOMMENDATIONS ===' as section;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' AND cmd = 'DELETE'
    ) THEN '✅ Users table has DELETE policy'
    ELSE '❌ Users table missing DELETE policy - Run fix-user-deletion-rls.sql'
  END as users_delete_policy;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'purchases' AND cmd = 'DELETE'
    ) THEN '✅ Purchases table has DELETE policy'
    ELSE '❌ Purchases table missing DELETE policy - Run fix-user-deletion-rls.sql'
  END as purchases_delete_policy;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'picks' AND cmd = 'DELETE'
    ) THEN '✅ Picks table has DELETE policy'
    ELSE '❌ Picks table missing DELETE policy - Run fix-user-deletion-rls.sql'
  END as picks_delete_policy;

-- 11. Quick fix commands
SELECT '=== QUICK FIX COMMANDS ===' as section;
SELECT 
  'If DELETE policies are missing, run these commands:' as instruction,
  '1. Copy fix-user-deletion-rls.sql content' as step1,
  '2. Paste into Supabase SQL Editor' as step2,
  '3. Run the script' as step3,
  '4. Test user deletion again' as step4;

