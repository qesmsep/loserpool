-- Debug: Check all Miami picks across all regular season weeks
-- This will help identify where the extra 169 picks (1052 - 883) are coming from

-- First, let's see the current week and season
SELECT 
  'Current Week Info' as info,
  (SELECT value FROM global_settings WHERE key = 'current_week') as current_week,
  (SELECT value FROM global_settings WHERE key = 'current_season') as current_season;

-- Check Miami picks in each regular season week column
SELECT 
  'Week 1 (reg1)' as week_column,
  COUNT(*) as total_picks,
  SUM(picks_count) as total_picks_count
FROM picks 
WHERE reg1_team_matchup_id IS NOT NULL 
  AND reg1_team_matchup_id LIKE '%_MIA%';

SELECT 
  'Week 2 (reg2)' as week_column,
  COUNT(*) as total_picks,
  SUM(picks_count) as total_picks_count
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
  AND reg2_team_matchup_id LIKE '%_MIA%';

SELECT 
  'Week 3 (reg3)' as week_column,
  COUNT(*) as total_picks,
  SUM(picks_count) as total_picks_count
FROM picks 
WHERE reg3_team_matchup_id IS NOT NULL 
  AND reg3_team_matchup_id LIKE '%_MIA%';

SELECT 
  'Week 4 (reg4)' as week_column,
  COUNT(*) as total_picks,
  SUM(picks_count) as total_picks_count
FROM picks 
WHERE reg4_team_matchup_id IS NOT NULL 
  AND reg4_team_matchup_id LIKE '%_MIA%';

SELECT 
  'Week 5 (reg5)' as week_column,
  COUNT(*) as total_picks,
  SUM(picks_count) as total_picks_count
FROM picks 
WHERE reg5_team_matchup_id IS NOT NULL 
  AND reg5_team_matchup_id LIKE '%_MIA%';

-- Check all Miami picks across ALL regular season weeks
SELECT 
  'ALL REGULAR SEASON WEEKS' as summary,
  COUNT(*) as total_pick_records,
  SUM(picks_count) as total_picks_count
FROM picks 
WHERE (
  reg1_team_matchup_id LIKE '%_MIA%' OR
  reg2_team_matchup_id LIKE '%_MIA%' OR
  reg3_team_matchup_id LIKE '%_MIA%' OR
  reg4_team_matchup_id LIKE '%_MIA%' OR
  reg5_team_matchup_id LIKE '%_MIA%' OR
  reg6_team_matchup_id LIKE '%_MIA%' OR
  reg7_team_matchup_id LIKE '%_MIA%' OR
  reg8_team_matchup_id LIKE '%_MIA%' OR
  reg9_team_matchup_id LIKE '%_MIA%' OR
  reg10_team_matchup_id LIKE '%_MIA%' OR
  reg11_team_matchup_id LIKE '%_MIA%' OR
  reg12_team_matchup_id LIKE '%_MIA%' OR
  reg13_team_matchup_id LIKE '%_MIA%' OR
  reg14_team_matchup_id LIKE '%_MIA%' OR
  reg15_team_matchup_id LIKE '%_MIA%' OR
  reg16_team_matchup_id LIKE '%_MIA%' OR
  reg17_team_matchup_id LIKE '%_MIA%' OR
  reg18_team_matchup_id LIKE '%_MIA%'
);

-- Check if there are any Miami picks in preseason weeks
SELECT 
  'PRESEASON WEEKS' as summary,
  COUNT(*) as total_pick_records,
  SUM(picks_count) as total_picks_count
FROM picks 
WHERE (
  pre1_team_matchup_id LIKE '%_MIA%' OR
  pre2_team_matchup_id LIKE '%_MIA%' OR
  pre3_team_matchup_id LIKE '%_MIA%'
);

-- Check if there are any Miami picks in postseason weeks
SELECT 
  'POSTSEASON WEEKS' as summary,
  COUNT(*) as total_pick_records,
  SUM(picks_count) as total_picks_count
FROM picks 
WHERE (
  post1_team_matchup_id LIKE '%_MIA%' OR
  post2_team_matchup_id LIKE '%_MIA%' OR
  post3_team_matchup_id LIKE '%_MIA%' OR
  post4_team_matchup_id LIKE '%_MIA%' OR
  post5_team_matchup_id LIKE '%_MIA%' OR
  post6_team_matchup_id LIKE '%_MIA%' OR
  post7_team_matchup_id LIKE '%_MIA%' OR
  post8_team_matchup_id LIKE '%_MIA%' OR
  post9_team_matchup_id LIKE '%_MIA%' OR
  post10_team_matchup_id LIKE '%_MIA%' OR
  post11_team_matchup_id LIKE '%_MIA%' OR
  post12_team_matchup_id LIKE '%_MIA%' OR
  post13_team_matchup_id LIKE '%_MIA%' OR
  post14_team_matchup_id LIKE '%_MIA%' OR
  post15_team_matchup_id LIKE '%_MIA%' OR
  post16_team_matchup_id LIKE '%_MIA%' OR
  post17_team_matchup_id LIKE '%_MIA%' OR
  post18_team_matchup_id LIKE '%_MIA%'
);

-- Check for any Miami picks that might be in multiple week columns (duplicates)
SELECT 
  'DUPLICATE CHECK' as info,
  user_id,
  COUNT(*) as records_with_miami_picks
FROM picks 
WHERE (
  reg1_team_matchup_id LIKE '%_MIA%' OR
  reg2_team_matchup_id LIKE '%_MIA%' OR
  reg3_team_matchup_id LIKE '%_MIA%' OR
  reg4_team_matchup_id LIKE '%_MIA%' OR
  reg5_team_matchup_id LIKE '%_MIA%' OR
  reg6_team_matchup_id LIKE '%_MIA%' OR
  reg7_team_matchup_id LIKE '%_MIA%' OR
  reg8_team_matchup_id LIKE '%_MIA%' OR
  reg9_team_matchup_id LIKE '%_MIA%' OR
  reg10_team_matchup_id LIKE '%_MIA%' OR
  reg11_team_matchup_id LIKE '%_MIA%' OR
  reg12_team_matchup_id LIKE '%_MIA%' OR
  reg13_team_matchup_id LIKE '%_MIA%' OR
  reg14_team_matchup_id LIKE '%_MIA%' OR
  reg15_team_matchup_id LIKE '%_MIA%' OR
  reg16_team_matchup_id LIKE '%_MIA%' OR
  reg17_team_matchup_id LIKE '%_MIA%' OR
  reg18_team_matchup_id LIKE '%_MIA%'
)
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY records_with_miami_picks DESC
LIMIT 10;
