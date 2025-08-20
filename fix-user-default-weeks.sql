-- Fix user default weeks to ensure correct season access
-- Non-testers should see REG1 (week 1), testers should see PRE3 (week 3)

-- Update non-testers to see REG1 (week 1)
UPDATE users 
SET default_week = 1 
WHERE user_type != 'tester' AND is_admin = false;

-- Update testers to see PRE3 (week 3)  
UPDATE users 
SET default_week = 3 
WHERE user_type = 'tester' OR is_admin = true;

-- Verify the changes
SELECT 
  email,
  user_type,
  is_admin,
  default_week,
  CASE 
    WHEN user_type = 'tester' OR is_admin = true THEN 'Should see PRE3'
    ELSE 'Should see REG1'
  END as expected_season
FROM users 
ORDER BY user_type, email;
