-- Verification Script for User Type System Setup
-- Run this in Supabase SQL Editor to verify everything is working

-- 1. Check current user types and their distribution
SELECT 'User Type Distribution:' as status;
SELECT 
  user_type,
  COUNT(*) as count,
  CASE 
    WHEN user_type = 'registered' THEN 'Has account, but no picks purchased / can see Week 1 of Regular season'
    WHEN user_type = 'active' THEN 'has purchased picks available to pick / can see Week 1 of Regular Season'
    WHEN user_type = 'tester' THEN 'a Registered User with ability to purchase picks for $0 / Can see Week 3 of PreSeason'
    WHEN user_type = 'eliminated' THEN 'has purchased tickets but all picks have been Eliminated / can see what Active Users see'
    ELSE 'Unknown'
  END as description
FROM users 
GROUP BY user_type
ORDER BY user_type;

-- 2. Check default weeks for each user type
SELECT 'Default Week Distribution:' as status;
SELECT 
  user_type,
  default_week,
  COUNT(*) as count,
  CASE 
    WHEN default_week = 3 THEN 'Preseason Week 3 (Testers)'
    WHEN default_week = 1 THEN 'Regular Season Week 1 (Everyone else)'
    ELSE 'Other'
  END as week_description
FROM users 
GROUP BY user_type, default_week
ORDER BY user_type, default_week;

-- 3. Check if database functions exist
SELECT 'Database Functions Check:' as status;
SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name = 'get_user_default_week' THEN '✅ User default week function'
    WHEN routine_name = 'can_access_week' THEN '✅ Week access control function'
    WHEN routine_name = 'get_minimum_accessible_week' THEN '✅ Minimum week function'
    WHEN routine_name = 'update_user_type_on_purchase' THEN '✅ Purchase trigger function'
    WHEN routine_name = 'update_user_type_based_on_picks' THEN '✅ Picks trigger function'
    WHEN routine_name = 'handle_new_user_signup' THEN '✅ New user trigger function'
    WHEN routine_name = 'update_all_user_types' THEN '✅ Bulk update function'
    ELSE 'Other function'
  END as description
FROM information_schema.routines 
WHERE routine_name IN (
  'get_user_default_week',
  'can_access_week', 
  'get_minimum_accessible_week',
  'update_user_type_on_purchase',
  'update_user_type_based_on_picks',
  'handle_new_user_signup',
  'update_all_user_types'
)
ORDER BY routine_name;

-- 4. Check if triggers exist
SELECT 'Database Triggers Check:' as status;
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  CASE 
    WHEN trigger_name = 'update_user_type_on_purchase_complete' THEN '✅ Purchase completion trigger'
    WHEN trigger_name = 'update_user_type_on_pick_change' THEN '✅ Pick status change trigger'
    WHEN trigger_name = 'on_auth_user_created' THEN '✅ New user signup trigger'
    ELSE 'Other trigger'
  END as description
FROM information_schema.triggers 
WHERE trigger_name IN (
  'update_user_type_on_purchase_complete',
  'update_user_type_on_pick_change',
  'on_auth_user_created'
)
ORDER BY trigger_name;

-- 5. Check user type constraints
SELECT 'User Type Constraints Check:' as status;
SELECT 
  constraint_name,
  table_name,
  constraint_type,
  CASE 
    WHEN constraint_name = 'users_user_type_check' THEN '✅ User type validation constraint'
    ELSE 'Other constraint'
  END as description
FROM information_schema.table_constraints 
WHERE constraint_name = 'users_user_type_check'
AND table_name = 'users';

-- 6. Sample user data (first 5 users)
SELECT 'Sample User Data:' as status;
SELECT 
  id,
  email,
  user_type,
  default_week,
  is_admin,
  created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. Test the get_user_default_week function with a sample user
SELECT 'Function Test:' as status;
SELECT 
  'Testing get_user_default_week function' as test_description,
  get_user_default_week(id) as calculated_default_week,
  default_week as stored_default_week,
  CASE 
    WHEN get_user_default_week(id) = default_week THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
FROM users 
LIMIT 3;

-- 8. Check if there are any users with NULL user_type (should be none)
SELECT 'NULL User Type Check:' as status;
SELECT 
  COUNT(*) as users_with_null_type,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All users have valid user types'
    ELSE '❌ Found users with NULL user type'
  END as status
FROM users 
WHERE user_type IS NULL;

-- 9. Check if there are any users with NULL default_week (should be none)
SELECT 'NULL Default Week Check:' as status;
SELECT 
  COUNT(*) as users_with_null_week,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All users have valid default weeks'
    ELSE '❌ Found users with NULL default week'
  END as status
FROM users 
WHERE default_week IS NULL;
