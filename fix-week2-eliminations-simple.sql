-- Simple script: Fix Week 2 eliminations to get accurate Week 3 count
-- Mark incorrect picks as eliminated, all others as active

-- Step 1: Mark picks as eliminated if the team they picked to LOSE actually WON
-- This uses a direct UPDATE with JOIN to avoid pagination issues
WITH week2_matchups AS (
    SELECT 
        id as matchup_id,
        away_team,
        home_team,
        away_score,
        home_score,
        status as game_status,
        CASE 
            WHEN away_score > home_score THEN away_team
            WHEN home_score > away_score THEN home_team
            ELSE NULL
        END as winner
    FROM matchups 
    WHERE week = 2
)
UPDATE picks 
SET status = 'eliminated'
FROM week2_matchups m
WHERE picks.reg2_team_matchup_id IS NOT NULL
    AND m.matchup_id::text = 
        CASE 
            WHEN picks.reg2_team_matchup_id LIKE '%_%' THEN
                SPLIT_PART(picks.reg2_team_matchup_id, '_', 1)
            ELSE picks.reg2_team_matchup_id
        END
    AND m.game_status = 'final'
    AND m.winner IS NOT NULL
    AND m.winner = CASE 
        WHEN picks.reg2_team_matchup_id LIKE '%_%' THEN
            SUBSTRING(picks.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
        ELSE picks.reg2_team_matchup_id
    END; -- Picked team WON (incorrect pick)

-- Step 2: Mark all other Week 2 picks as active
UPDATE picks 
SET status = 'active'
WHERE reg2_team_matchup_id IS NOT NULL 
    AND status != 'eliminated';

-- Show the results
SELECT 
    'Week 2 Active Picks (correct picks)' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
    AND status = 'active';

SELECT 
    'Week 2 Eliminated Picks (incorrect picks)' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
    AND status = 'eliminated';

-- Show Week 3 count (should match Week 2 active)
SELECT 
    'Week 3 Active Picks (should match Week 2 active)' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg3_team_matchup_id IS NOT NULL 
    AND status = 'active';
