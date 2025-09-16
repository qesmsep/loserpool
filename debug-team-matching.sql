-- Debug script to see why picks for the same team are being treated differently
-- This will show us the team matching logic issues

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
    'DEBUG: Team matching issues' as description,
    p.user_id,
    p.reg2_team_matchup_id as full_matchup_id,
    CASE 
        WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
            SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
        ELSE p.reg2_team_matchup_id
    END as picked_team_from_matchup_id,
    CASE 
        WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
            SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
        ELSE p.reg2_team_matchup_id
    END as actual_matchup_id,
    m.away_team,
    m.home_team,
    m.winner as game_winner,
    p.status as current_status,
    CASE 
        WHEN m.winner IS NULL THEN 'Tie game'
        WHEN m.winner = CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
            ELSE p.reg2_team_matchup_id
        END THEN 'Picked team WON (should be eliminated)'
        ELSE 'Picked team LOST (should be active)'
    END as expected_status,
    CASE 
        WHEN m.winner IS NULL THEN 'Tie game'
        WHEN m.winner = CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
            ELSE p.reg2_team_matchup_id
        END THEN 'ELIMINATED'
        ELSE 'ACTIVE'
    END as should_be_status
FROM picks p
LEFT JOIN week2_matchups m ON m.matchup_id::text = 
    CASE 
        WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
            SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
        ELSE p.reg2_team_matchup_id
    END
WHERE p.reg2_team_matchup_id IS NOT NULL
    AND m.game_status = 'final'
ORDER BY 
    CASE 
        WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
            SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
        ELSE p.reg2_team_matchup_id
    END,
    p.user_id
LIMIT 50;
