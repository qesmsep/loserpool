-- Team-Matchup ID System Example
-- This demonstrates how the unique team-matchup IDs work in practice

-- Example: Let's say we have these matchups
-- Week 1: Cowboys @ Eagles (REG1)
-- Week 2: Cowboys @ Giants (REG1) 
-- Week 3: Eagles @ Cowboys (REG1)

-- Each team in each matchup gets a unique ID:

-- Cowboys in Week 1 Cowboys @ Eagles matchup
-- team_matchup_id = md5(matchup_id + 'Cowboys')

-- Eagles in Week 1 Cowboys @ Eagles matchup  
-- team_matchup_id = md5(matchup_id + 'Eagles')

-- Cowboys in Week 2 Cowboys @ Giants matchup
-- team_matchup_id = md5(different_matchup_id + 'Cowboys') -- Different ID!

-- Giants in Week 2 Cowboys @ Giants matchup
-- team_matchup_id = md5(different_matchup_id + 'Giants')

-- This means:
-- 1. Same team in same matchup = Same team_matchup_id
-- 2. Same team in different matchup = Different team_matchup_id  
-- 3. Different teams in same matchup = Different team_matchup_id

-- Example scenario:
-- User has "Pick 1" and picks Cowboys to lose in Week 1
-- Pick 1 survives Week 1 (Cowboys win)
-- In Week 2, Pick 1 gets allocated to Cowboys @ Giants game
-- User picks Cowboys to lose again
-- Pick 1 survives Week 2 (Cowboys win again)
-- In Week 3, Pick 1 gets allocated to Eagles @ Cowboys game
-- User picks Eagles to lose

-- The pick's journey:
-- Week 1: team_matchup_id = md5(week1_matchup_id + 'Cowboys')
-- Week 2: team_matchup_id = md5(week2_matchup_id + 'Cowboys') 
-- Week 3: team_matchup_id = md5(week3_matchup_id + 'Eagles')

-- Each week creates a new record with the same pick id but different team_matchup_id
-- This allows us to track the pick's complete journey through all weeks

-- Show how this would look in the database:
SELECT 
  'Example Pick Journey' as description,
  'Pick 1' as pick_name,
  'Week 1' as week,
  'Cowboys @ Eagles' as game,
  'Cowboys' as team_picked,
  'md5(week1_matchup_id + Cowboys)' as team_matchup_id,
  'active' as status
UNION ALL
SELECT 
  'Example Pick Journey',
  'Pick 1', 
  'Week 2',
  'Cowboys @ Giants',
  'Cowboys',
  'md5(week2_matchup_id + Cowboys)',
  'active'
UNION ALL
SELECT 
  'Example Pick Journey',
  'Pick 1',
  'Week 3', 
  'Eagles @ Cowboys',
  'Eagles',
  'md5(week3_matchup_id + Eagles)',
  'active';

-- Benefits of this system:
-- 1. Each team-matchup combination has a unique identifier
-- 2. We can track picks through multiple weeks
-- 3. We can prevent duplicate picks for the same team in the same matchup
-- 4. We can easily query pick history by team_matchup_id
-- 5. Future-proof for any changes to the pick system

-- Example queries you can run:

-- Get all picks for a specific team in a specific matchup
-- SELECT * FROM picks WHERE team_matchup_id = 'specific_team_matchup_uuid';

-- Get pick history for a specific pick
-- SELECT * FROM picks WHERE id = 'pick_uuid' ORDER BY week;

-- Get all active picks for a user
-- SELECT * FROM picks WHERE user_id = 'user_uuid' AND status = 'active';

-- Check if a user has already picked a specific team in a specific matchup
-- SELECT COUNT(*) FROM picks WHERE user_id = 'user_uuid' AND team_matchup_id = 'team_matchup_uuid';
