-- Simple script: Mark picks as eliminated if the team they chose to LOSE actually WON
-- This is the correct logic for a loser pool

-- First, reset all Week 2 picks to active status
UPDATE picks 
SET status = 'active'
WHERE reg2_team_matchup_id IS NOT NULL;

-- Now mark picks as eliminated ONLY if the picked team won
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
WHERE reg2_team_matchup_id IS NOT NULL
    AND user_id IN (
        SELECT p.user_id
        FROM picks p
        LEFT JOIN week2_matchups m ON m.matchup_id::text = 
            CASE 
                WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                    SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
                ELSE p.reg2_team_matchup_id
            END
        WHERE p.reg2_team_matchup_id IS NOT NULL
            AND m.game_status = 'final'
            AND m.winner IS NOT NULL
            AND m.winner = CASE 
                WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                    SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
                ELSE p.reg2_team_matchup_id
            END -- Picked team WON (incorrect in loser pool)
    );

-- Show the results
SELECT 
    'Week 2 Active Picks (teams that lost)' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
    AND status = 'active';

SELECT 
    'Week 2 Eliminated Picks (teams that won)' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
    AND status = 'eliminated';

-- Show which teams won and caused eliminations
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
    'Teams that won (causing eliminations)' as description,
    m.winner as winning_team,
    CONCAT(m.away_team, ' @ ', m.home_team) as game,
    COUNT(p.user_id) as users_eliminated,
    SUM(p.picks_count) as total_picks_eliminated
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
GROUP BY m.winner, m.away_team, m.home_team
ORDER BY total_picks_eliminated DESC;
