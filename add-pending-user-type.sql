-- SAFE MIGRATION: Add 'pending' user type to the users table
-- This migration is designed to be safe and non-destructive

-- Step 1: First, let's see what we're working with (READ-ONLY)
SELECT 'Current user types in database:' as info;
SELECT 
  user_type,
  COUNT(*) as count
FROM users 
GROUP BY user_type 
ORDER BY user_type;

-- Step 2: Check what users would be affected (READ-ONLY)
SELECT 'Users who would be updated to pending:' as info;
SELECT 
  u.id,
  u.email,
  u.user_type,
  COUNT(p.id) as completed_purchases,
  COUNT(pick.id) as active_picks
FROM users u 
LEFT JOIN purchases p ON u.id = p.user_id AND p.status = 'completed'
LEFT JOIN picks pick ON u.id = pick.user_id AND pick.status = 'active'
WHERE u.user_type = 'registered'
GROUP BY u.id, u.email, u.user_type
HAVING COUNT(p.id) > 0 AND COUNT(pick.id) = 0;

-- Step 3: Check current constraint (READ-ONLY)
SELECT 'Current constraint info:' as info;
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND contype = 'c';

-- Step 4: Only proceed if constraint doesn't already include 'pending'
-- This prevents errors if the constraint is already updated
DO $$
BEGIN
  -- Check if 'pending' is already allowed in the constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'users'::regclass 
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%pending%'
  ) THEN
    -- Update the CHECK constraint to include 'pending' (SAFE - only adds, doesn't remove)
    ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS users_user_type_check;

    ALTER TABLE users 
    ADD CONSTRAINT users_user_type_check 
    CHECK (user_type IN ('registered', 'active', 'tester', 'eliminated', 'pending'));
    
    RAISE NOTICE 'Successfully updated constraint to include pending user type';
  ELSE
    RAISE NOTICE 'Constraint already includes pending user type - no changes needed';
  END IF;
END $$;

-- Step 5: Update users to pending status (SAFE - only updates specific users)
-- This only affects users who are 'registered' but have completed purchases and no active picks
UPDATE users 
SET user_type = 'pending' 
WHERE user_type = 'registered' 
AND id IN (
  SELECT DISTINCT u.id 
  FROM users u 
  JOIN purchases p ON u.id = p.user_id 
  WHERE p.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM picks pick 
    WHERE pick.user_id = u.id 
    AND pick.status = 'active'
  )
);

-- Step 6: Show final results (READ-ONLY)
SELECT 'Final user type distribution:' as info;
SELECT 
  user_type,
  COUNT(*) as count
FROM users 
GROUP BY user_type 
ORDER BY user_type;

-- Step 7: Show what was changed (READ-ONLY)
SELECT 'Users updated to pending:' as info;
SELECT 
  u.id,
  u.email,
  u.user_type,
  COUNT(p.id) as completed_purchases
FROM users u 
LEFT JOIN purchases p ON u.id = p.user_id AND p.status = 'completed'
WHERE u.user_type = 'pending'
GROUP BY u.id, u.email, u.user_type
ORDER BY u.email;
