-- Test script for team-matchup ID system
-- This demonstrates how the unique team-matchup IDs work

-- First, let's see some example matchups
SELECT 
  id as matchup_id,
  away_team,
  home_team,
  week,
  season
FROM matchups 
ORDER BY week, season
LIMIT 5;

-- Now let's see how team-matchup IDs are generated
SELECT 
  id as matchup_id,
  away_team,
  home_team,
  week,
  season,
  get_team_matchup_id(id, away_team) as away_team_matchup_id,
  get_team_matchup_id(id, home_team) as home_team_matchup_id
FROM matchups 
ORDER BY week, season
LIMIT 3;

-- Test that the same team in the same matchup always gets the same ID
WITH test_matchup AS (
  SELECT id FROM matchups LIMIT 1
)
SELECT 
  'Test 1' as test_name,
  get_team_matchup_id(tm.id, 'Cowboys') as team_matchup_id_1,
  get_team_matchup_id(tm.id, 'Cowboys') as team_matchup_id_2,
  CASE 
    WHEN get_team_matchup_id(tm.id, 'Cowboys') = get_team_matchup_id(tm.id, 'Cowboys') 
    THEN 'PASS: Same team in same matchup gets same ID'
    ELSE 'FAIL: IDs are different'
  END as test_result
FROM test_matchup tm;

-- Test that different teams get different IDs
WITH test_matchup AS (
  SELECT id FROM matchups LIMIT 1
)
SELECT 
  'Test 2' as test_name,
  get_team_matchup_id(tm.id, 'Cowboys') as cowboys_id,
  get_team_matchup_id(tm.id, 'Eagles') as eagles_id,
  CASE 
    WHEN get_team_matchup_id(tm.id, 'Cowboys') != get_team_matchup_id(tm.id, 'Eagles') 
    THEN 'PASS: Different teams get different IDs'
    ELSE 'FAIL: Different teams got same ID'
  END as test_result
FROM test_matchup tm;

-- Test that same team in different matchups gets different IDs
WITH test_matchups AS (
  SELECT id FROM matchups ORDER BY week LIMIT 2
)
SELECT 
  'Test 3' as test_name,
  get_team_matchup_id(tm1.id, 'Cowboys') as cowboys_matchup1_id,
  get_team_matchup_id(tm2.id, 'Cowboys') as cowboys_matchup2_id,
  CASE 
    WHEN get_team_matchup_id(tm1.id, 'Cowboys') != get_team_matchup_id(tm2.id, 'Cowboys') 
    THEN 'PASS: Same team in different matchups gets different IDs'
    ELSE 'FAIL: Same team in different matchups got same ID'
  END as test_result
FROM test_matchups tm1
CROSS JOIN test_matchups tm2
WHERE tm1.id < tm2.id;

-- Show existing picks with their team-matchup IDs
SELECT 
  p.id as pick_id,
  p.pick_name,
  p.team_picked,
  p.team_matchup_id,
  p.week,
  p.status,
  m.away_team,
  m.home_team,
  m.season
FROM picks p
LEFT JOIN matchups m ON p.matchup_id = m.id
WHERE p.team_matchup_id IS NOT NULL
ORDER BY p.pick_name, p.week
LIMIT 10;

-- Show how we can track a pick's journey through different team-matchups
SELECT 
  p.id as pick_id,
  p.pick_name,
  p.team_matchup_id,
  p.week,
  p.team_picked,
  p.status,
  m.away_team || ' @ ' || m.home_team as game,
  m.season
FROM picks p
LEFT JOIN matchups m ON p.matchup_id = m.id
WHERE p.pick_name = 'Pick 1'  -- Replace with actual pick name
ORDER BY p.week;
