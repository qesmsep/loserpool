-- Update User Type System v3 - Based on User Requirements
-- Run this in Supabase SQL Editor

-- Step 1: Drop the constraint FIRST to avoid violations during updates
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Step 2: Show current state
SELECT 'Current user types:' as status, 
       COUNT(*) as count,
       user_type,
       is_admin
FROM users 
GROUP BY user_type, is_admin
ORDER BY user_type, is_admin;

-- Step 3: Update all users to valid types based on new requirements
UPDATE users 
SET user_type = CASE 
  WHEN is_admin = TRUE THEN 'tester'
  WHEN user_type = 'regular' THEN 'registered'
  WHEN user_type = 'tester' THEN 'tester'
  WHEN user_type = 'active' THEN 'active'
  WHEN user_type = 'eliminated' THEN 'eliminated'
  WHEN user_type = 'pending' THEN 'registered'
  WHEN user_type IS NULL THEN 'registered'
  ELSE 'registered'
END;

-- Step 4: Show updated state
SELECT 'After update - user types:' as status, 
       COUNT(*) as count,
       user_type,
       is_admin
FROM users 
GROUP BY user_type, is_admin
ORDER BY user_type, is_admin;

-- Step 5: Add the new constraint with updated user types
ALTER TABLE users 
ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('registered', 'active', 'tester', 'eliminated'));

-- Step 6: Add default_week column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS default_week INTEGER DEFAULT 1;

-- Step 7: Update default week based on user type requirements
UPDATE users 
SET default_week = CASE 
  WHEN user_type = 'tester' THEN 3  -- Testers see Week 3 of PreSeason
  ELSE 1  -- Everyone else sees Week 1 of Regular Season
END;

-- Step 8: Create or update function to get user default week
CREATE OR REPLACE FUNCTION get_user_default_week(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  user_type_val TEXT;
  is_admin_val BOOLEAN;
BEGIN
  SELECT u.user_type, u.is_admin INTO user_type_val, is_admin_val
  FROM users u
  WHERE u.id = user_id;
  
  -- Testers see Week 3 of PreSeason
  IF user_type_val = 'tester' OR is_admin_val THEN
    RETURN 3;
  ELSE
    -- All other users see Week 1 of Regular Season
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create function to update user type on purchase completion
CREATE OR REPLACE FUNCTION update_user_type_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- When a purchase is completed, update user type to 'active'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE users 
    SET user_type = 'active'
    WHERE id = NEW.user_id 
    AND user_type = 'registered'
    AND NOT EXISTS (
      SELECT 1 FROM users 
      WHERE id = NEW.user_id 
      AND is_admin = TRUE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create trigger for purchases
DROP TRIGGER IF EXISTS update_user_type_on_purchase_complete ON purchases;
CREATE TRIGGER update_user_type_on_purchase_complete
  AFTER UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_user_type_on_purchase();

-- Step 11: Create function to update user type based on picks status
CREATE OR REPLACE FUNCTION update_user_type_based_on_picks()
RETURNS TRIGGER AS $$
DECLARE
  active_picks_count INTEGER;
  total_picks_count INTEGER;
  user_type_val TEXT;
  is_admin_val BOOLEAN;
BEGIN
  -- Get user type and admin status
  SELECT u.user_type, u.is_admin INTO user_type_val, is_admin_val
  FROM users u
  WHERE u.id = NEW.user_id;
  
  -- Don't update testers
  IF user_type_val = 'tester' OR is_admin_val THEN
    RETURN NEW;
  END IF;
  
  -- Count active picks for this user
  SELECT COUNT(*) INTO active_picks_count
  FROM picks 
  WHERE user_id = NEW.user_id 
  AND status = 'active';
  
  -- Count total picks for this user
  SELECT COUNT(*) INTO total_picks_count
  FROM picks 
  WHERE user_id = NEW.user_id;
  
  -- Update user type based on picks status
  IF total_picks_count = 0 THEN
    -- No picks at all - should be 'registered' if no purchases, 'active' if has purchases
    UPDATE users 
    SET user_type = CASE 
      WHEN EXISTS (
        SELECT 1 FROM purchases 
        WHERE user_id = NEW.user_id 
        AND status = 'completed'
      ) THEN 'active'
      ELSE 'registered'
    END
    WHERE id = NEW.user_id;
  ELSIF active_picks_count = 0 AND total_picks_count > 0 THEN
    -- Has picks but none are active - user is eliminated
    UPDATE users 
    SET user_type = 'eliminated'
    WHERE id = NEW.user_id;
  ELSE
    -- Has active picks - user is active
    UPDATE users 
    SET user_type = 'active'
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create trigger for picks changes
DROP TRIGGER IF EXISTS update_user_type_on_pick_change ON picks;
CREATE TRIGGER update_user_type_on_pick_change
  AFTER INSERT OR UPDATE OR DELETE ON picks
  FOR EACH ROW EXECUTE FUNCTION update_user_type_based_on_picks();

-- Step 13: Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Set new users as 'registered' by default (unless they're admin)
  IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data = '{}' THEN
    INSERT INTO users (id, email, user_type, is_admin)
    VALUES (NEW.id, NEW.email, 'registered', FALSE)
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO users (id, email, user_type, is_admin)
    VALUES (NEW.id, NEW.email, 'registered', FALSE)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();

-- Step 15: Create function to check if user can access a specific week
CREATE OR REPLACE FUNCTION can_access_week(user_id UUID, week_number INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  user_type_val TEXT;
  is_admin_val BOOLEAN;
BEGIN
  SELECT u.user_type, u.is_admin INTO user_type_val, is_admin_val
  FROM users u
  WHERE u.id = user_id;
  
  -- Testers can access all weeks (including preseason)
  IF user_type_val = 'tester' OR is_admin_val THEN
    RETURN TRUE;
  ELSE
    -- All other users can only access regular season (week 1 and beyond)
    RETURN week_number >= 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 16: Create function to get minimum accessible week for user
CREATE OR REPLACE FUNCTION get_minimum_accessible_week(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  user_type_val TEXT;
  is_admin_val BOOLEAN;
BEGIN
  SELECT u.user_type, u.is_admin INTO user_type_val, is_admin_val
  FROM users u
  WHERE u.id = user_id;
  
  -- Testers can access all weeks (including preseason)
  IF user_type_val = 'tester' OR is_admin_val THEN
    RETURN 0;
  ELSE
    -- All other users can only access regular season (week 1 and beyond)
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 17: Create function to manually update user types based on current state
CREATE OR REPLACE FUNCTION update_all_user_types()
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.user_type, u.is_admin
    FROM users u
  LOOP
    -- Skip testers
    IF user_record.is_admin OR user_record.user_type = 'tester' THEN
      CONTINUE;
    END IF;
    
    -- Check if user has completed purchases
    IF EXISTS (
      SELECT 1 FROM purchases 
      WHERE user_id = user_record.id 
      AND status = 'completed'
    ) THEN
      -- User has purchases, check picks status
      IF EXISTS (
        SELECT 1 FROM picks 
        WHERE user_id = user_record.id 
        AND status = 'active'
      ) THEN
        -- Has active picks
        UPDATE users SET user_type = 'active' WHERE id = user_record.id;
      ELSIF EXISTS (
        SELECT 1 FROM picks 
        WHERE user_id = user_record.id
      ) THEN
        -- Has picks but none active - eliminated
        UPDATE users SET user_type = 'eliminated' WHERE id = user_record.id;
      ELSE
        -- Has purchases but no picks - active
        UPDATE users SET user_type = 'active' WHERE id = user_record.id;
      END IF;
    ELSE
      -- No purchases - registered
      UPDATE users SET user_type = 'registered' WHERE id = user_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 18: Run the update function to fix any existing users
SELECT update_all_user_types();

-- Step 19: Final verification
SELECT 'Final verification - Users with new types:' as status, 
       id, email, username, is_admin, user_type, default_week, created_at 
FROM users 
ORDER BY created_at DESC;

-- Step 20: Show user type summary
SELECT 'User Type Summary:' as status,
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
