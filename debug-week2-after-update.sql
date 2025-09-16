-- Debug script to see what happened after the update
-- This will help us understand why we have 1759 instead of 1865

-- Check current Week 2 active picks
SELECT 
    'Current Week 2 Active Picks' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
    AND status != 'eliminated';

-- Check current Week 2 eliminated picks
SELECT 
    'Current Week 2 Eliminated Picks' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
    AND status = 'eliminated';

-- Check what the original Week 2 total should be
SELECT 
    'Total Week 2 Picks (all statuses)' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL;

-- Let's see what picks were marked as eliminated
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
    'Picks that were marked as eliminated' as description,
    p.user_id,
    p.reg2_team_matchup_id,
    CASE 
        WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
            SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
        ELSE p.reg2_team_matchup_id
    END as picked_team,
    CONCAT(m.away_team, ' @ ', m.home_team) as game,
    m.winner,
    p.picks_count,
    p.status,
    CASE 
        WHEN m.winner IS NULL THEN 'Tie game'
        WHEN m.winner = CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
            ELSE p.reg2_team_matchup_id
        END THEN 'Correctly eliminated - picked team won'
        ELSE 'INCORRECTLY eliminated - picked team lost'
    END as elimination_status
FROM picks p
LEFT JOIN week2_matchups m ON m.matchup_id::text = 
    CASE 
        WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
            SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
        ELSE p.reg2_team_matchup_id
    END
WHERE p.reg2_team_matchup_id IS NOT NULL 
    AND p.status = 'eliminated'
ORDER BY p.picks_count DESC, p.user_id;
