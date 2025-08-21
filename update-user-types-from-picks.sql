-- COMPREHENSIVE USER TYPE UPDATE SCRIPT
-- This script analyzes users and their picks to set correct user types

-- Step 1: Show current user type distribution (READ-ONLY)
SELECT '=== CURRENT USER TYPE DISTRIBUTION ===' as info;
SELECT 
  user_type,
  COUNT(*) as count
FROM users 
GROUP BY user_type 
ORDER BY user_type;

-- Step 2: Analyze what each user should be based on their picks and purchases (READ-ONLY)
SELECT '=== ANALYSIS: WHAT EACH USER SHOULD BE ===' as info;
WITH user_analysis AS (
  SELECT 
    u.id,
    u.email,
    u.user_type as current_type,
    -- Check if user has completed purchases
    CASE WHEN EXISTS (
      SELECT 1 FROM purchases p 
      WHERE p.user_id = u.id AND p.status = 'completed'
    ) THEN true ELSE false END as has_purchases,
    -- Count active picks
    COALESCE((
      SELECT COUNT(*) 
      FROM picks pick 
      WHERE pick.user_id = u.id AND pick.status = 'active'
    ), 0) as active_picks_count,
    -- Count total picks
    COALESCE((
      SELECT COUNT(*) 
      FROM picks pick 
      WHERE pick.user_id = u.id
    ), 0) as total_picks_count,
    -- Count eliminated picks
    COALESCE((
      SELECT COUNT(*) 
      FROM picks pick 
      WHERE pick.user_id = u.id AND pick.status = 'eliminated'
    ), 0) as eliminated_picks_count
  FROM users u
)
SELECT 
  ua.id,
  ua.email,
  ua.current_type,
  ua.has_purchases,
  ua.active_picks_count,
  ua.total_picks_count,
  ua.eliminated_picks_count,
  CASE 
    WHEN u.is_admin THEN 'tester' -- Admins are always testers
    WHEN ua.current_type = 'tester' THEN 'tester' -- Don't change testers
    WHEN NOT ua.has_purchases THEN 'registered' -- No purchases = registered
    WHEN ua.has_purchases AND ua.total_picks_count = 0 THEN 'pending' -- Has purchases but no picks = pending
    WHEN ua.has_purchases AND ua.active_picks_count > 0 THEN 'active' -- Has active picks = active
    WHEN ua.has_purchases AND ua.total_picks_count > 0 AND ua.active_picks_count = 0 THEN 'eliminated' -- Has picks but none active = eliminated
    ELSE 'registered' -- Default fallback
  END as should_be_type
FROM user_analysis ua
JOIN users u ON ua.id = u.id
ORDER BY ua.email;

-- Step 3: Show users that need to be updated (READ-ONLY)
SELECT '=== USERS THAT NEED UPDATES ===' as info;
WITH user_analysis AS (
  SELECT 
    u.id,
    u.email,
    u.user_type as current_type,
    u.is_admin,
    -- Check if user has completed purchases
    CASE WHEN EXISTS (
      SELECT 1 FROM purchases p 
      WHERE p.user_id = u.id AND p.status = 'completed'
    ) THEN true ELSE false END as has_purchases,
    -- Count active picks
    COALESCE((
      SELECT COUNT(*) 
      FROM picks pick 
      WHERE pick.user_id = u.id AND pick.status = 'active'
    ), 0) as active_picks_count,
    -- Count total picks
    COALESCE((
      SELECT COUNT(*) 
      FROM picks pick 
      WHERE pick.user_id = u.id
    ), 0) as total_picks_count
  FROM users u
)
SELECT 
  ua.id,
  ua.email,
  ua.current_type,
  CASE 
    WHEN u.is_admin THEN 'tester' -- Admins are always testers
    WHEN ua.current_type = 'tester' THEN 'tester' -- Don't change testers
    WHEN NOT ua.has_purchases THEN 'registered' -- No purchases = registered
    WHEN ua.has_purchases AND ua.total_picks_count = 0 THEN 'pending' -- Has purchases but no picks = pending
    WHEN ua.has_purchases AND ua.active_picks_count > 0 THEN 'active' -- Has active picks = active
    WHEN ua.has_purchases AND ua.total_picks_count > 0 AND ua.active_picks_count = 0 THEN 'eliminated' -- Has picks but none active = eliminated
    ELSE 'registered' -- Default fallback
  END as should_be_type
FROM user_analysis ua
JOIN users u ON ua.id = u.id
WHERE ua.current_type != CASE 
  WHEN u.is_admin THEN 'tester'
  WHEN ua.current_type = 'tester' THEN 'tester'
  WHEN NOT ua.has_purchases THEN 'registered'
  WHEN ua.has_purchases AND ua.total_picks_count = 0 THEN 'pending'
  WHEN ua.has_purchases AND ua.active_picks_count > 0 THEN 'active'
  WHEN ua.has_purchases AND ua.total_picks_count > 0 AND ua.active_picks_count = 0 THEN 'eliminated'
  ELSE 'registered'
END
ORDER BY ua.email;

-- Step 4: PERFORM THE UPDATES
-- Update users to 'registered' if they have no purchases
UPDATE users 
SET user_type = 'registered'
WHERE user_type != 'tester' 
AND NOT is_admin
AND NOT EXISTS (
  SELECT 1 FROM purchases p 
  WHERE p.user_id = users.id AND p.status = 'completed'
);

-- Update users to 'pending' if they have purchases but no picks
UPDATE users 
SET user_type = 'pending'
WHERE user_type != 'tester' 
AND NOT is_admin
AND EXISTS (
  SELECT 1 FROM purchases p 
  WHERE p.user_id = users.id AND p.status = 'completed'
)
AND NOT EXISTS (
  SELECT 1 FROM picks pick 
  WHERE pick.user_id = users.id
);

-- Update users to 'active' if they have active picks
UPDATE users 
SET user_type = 'active'
WHERE user_type != 'tester' 
AND NOT is_admin
AND EXISTS (
  SELECT 1 FROM picks pick 
  WHERE pick.user_id = users.id AND pick.status = 'active'
);

-- Update users to 'eliminated' if they have picks but none are active
UPDATE users 
SET user_type = 'eliminated'
WHERE user_type != 'tester' 
AND NOT is_admin
AND EXISTS (
  SELECT 1 FROM picks pick 
  WHERE pick.user_id = users.id
)
AND NOT EXISTS (
  SELECT 1 FROM picks pick 
  WHERE pick.user_id = users.id AND pick.status = 'active'
);

-- Ensure admins are testers
UPDATE users 
SET user_type = 'tester'
WHERE is_admin = true;

-- Step 5: Show final results (READ-ONLY)
SELECT '=== FINAL USER TYPE DISTRIBUTION ===' as info;
SELECT 
  user_type,
  COUNT(*) as count
FROM users 
GROUP BY user_type 
ORDER BY user_type;

-- Step 6: Show summary of changes (READ-ONLY)
SELECT '=== SUMMARY OF CHANGES ===' as info;
SELECT 
  'User types have been updated based on their picks and purchases.' as message,
  'Check the final distribution above to see the results.' as next_step;
