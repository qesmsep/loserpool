-- Fix the incorrect eliminations from the previous update
-- This will revert picks that were incorrectly marked as eliminated

-- First, let's see how many incorrect eliminations we have
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
SELECT 
    'Incorrect eliminations to fix' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks p
LEFT JOIN week2_matchups m ON m.matchup_id::text = 
    CASE 
        WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
            SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
        ELSE p.reg2_team_matchup_id
    END
WHERE p.reg2_team_matchup_id IS NOT NULL 
    AND p.status = 'eliminated'
    AND m.game_status = 'final'
    AND m.winner IS NOT NULL
    AND m.winner != CASE 
        WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
            SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
        ELSE p.reg2_team_matchup_id
    END; -- Picked team lost (correct pick, should not be eliminated)

-- Now fix the incorrect eliminations by reverting them to 'active'
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
SET status = 'active'
WHERE user_id IN (
    SELECT p.user_id
    FROM picks p
    LEFT JOIN week2_matchups m ON m.matchup_id::text = 
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
            ELSE p.reg2_team_matchup_id
        END
    WHERE p.reg2_team_matchup_id IS NOT NULL 
        AND p.status = 'eliminated'
        AND m.game_status = 'final'
        AND m.winner IS NOT NULL
        AND m.winner != CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
            ELSE p.reg2_team_matchup_id
        END -- Picked team lost (correct pick, should not be eliminated)
);

-- Show the results after the fix
SELECT 
    'After fix - Week 2 Active Picks' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
    AND status != 'eliminated';

SELECT 
    'After fix - Week 2 Eliminated Picks' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
    AND status = 'eliminated';

-- Verify the correct eliminations remain
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
SELECT 
    'Correct eliminations that should remain' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks p
LEFT JOIN week2_matchups m ON m.matchup_id::text = 
    CASE 
        WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
            SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
        ELSE p.reg2_team_matchup_id
    END
WHERE p.reg2_team_matchup_id IS NOT NULL 
    AND p.status = 'eliminated'
    AND m.game_status = 'final'
    AND (
        m.winner IS NULL -- Tie game
        OR m.winner = CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
            ELSE p.reg2_team_matchup_id
        END -- Picked team won (incorrect pick, correctly eliminated)
    );
