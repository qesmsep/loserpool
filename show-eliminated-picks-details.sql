-- Show detailed list of users and picks that should be marked as eliminated
-- Run this to see exactly which users and picks need to be updated

-- Detailed list of picks that should be eliminated
WITH week2_matchups AS (
    -- Get all Week 2 matchups with their results
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
            ELSE NULL -- Tie
        END as winner
    FROM matchups 
    WHERE week = 2
),
week2_picks AS (
    -- Get all Week 2 picks
    SELECT 
        user_id,
        reg2_team_matchup_id,
        picks_count,
        status
    FROM picks 
    WHERE reg2_team_matchup_id IS NOT NULL
),
picks_with_results AS (
    -- Join picks with matchup results
    SELECT 
        p.user_id,
        p.reg2_team_matchup_id,
        p.picks_count,
        p.status,
        -- Extract team from matchup_id (remove the team suffix)
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
            ELSE p.reg2_team_matchup_id
        END as picked_team_key,
        -- Extract actual matchup_id (remove team suffix)
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
            ELSE p.reg2_team_matchup_id
        END as actual_matchup_id,
        m.away_team,
        m.home_team,
        m.winner,
        m.game_status
    FROM week2_picks p
    LEFT JOIN week2_matchups m ON m.matchup_id::text = 
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
            ELSE p.reg2_team_matchup_id
        END
)
SELECT 
    'DETAILED LIST - Users and picks that should be eliminated:' as description,
    user_id,
    reg2_team_matchup_id as full_matchup_id,
    picked_team_key as picked_team,
    actual_matchup_id,
    CONCAT(away_team, ' @ ', home_team) as game,
    winner,
    picks_count,
    status as current_status,
    CASE 
        WHEN winner IS NULL THEN 'Tie game - all picks eliminated'
        WHEN winner = picked_team_key THEN 'Picked team won (incorrect in loser pool)'
        ELSE 'Picked team won (partial match - incorrect in loser pool)'
    END as elimination_reason
FROM picks_with_results 
WHERE game_status = 'final'
    AND (
        winner IS NULL -- Tie game
        OR winner = picked_team_key -- Picked team won
        OR winner ILIKE '%' || picked_team_key || '%' -- Partial match
        OR picked_team_key ILIKE '%' || winner || '%' -- Reverse partial match
    )
    AND status != 'eliminated' -- Currently not marked as eliminated
ORDER BY picks_count DESC, user_id;

-- Summary count
WITH week2_matchups AS (
    -- Get all Week 2 matchups with their results
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
            ELSE NULL -- Tie
        END as winner
    FROM matchups 
    WHERE week = 2
),
week2_picks AS (
    -- Get all Week 2 picks
    SELECT 
        user_id,
        reg2_team_matchup_id,
        picks_count,
        status
    FROM picks 
    WHERE reg2_team_matchup_id IS NOT NULL
),
picks_with_results AS (
    -- Join picks with matchup results
    SELECT 
        p.user_id,
        p.reg2_team_matchup_id,
        p.picks_count,
        p.status,
        -- Extract team from matchup_id (remove the team suffix)
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
            ELSE p.reg2_team_matchup_id
        END as picked_team_key,
        -- Extract actual matchup_id (remove team suffix)
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
            ELSE p.reg2_team_matchup_id
        END as actual_matchup_id,
        m.away_team,
        m.home_team,
        m.winner,
        m.game_status
    FROM week2_picks p
    LEFT JOIN week2_matchups m ON m.matchup_id::text = 
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
            ELSE p.reg2_team_matchup_id
        END
)
SELECT 
    'SUMMARY' as description,
    'Total users with picks that should be eliminated' as details,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks_with_results 
WHERE game_status = 'final'
    AND (
        winner IS NULL -- Tie game
        OR winner = picked_team_key -- Picked team won
        OR winner ILIKE '%' || picked_team_key || '%' -- Partial match
        OR picked_team_key ILIKE '%' || winner || '%' -- Reverse partial match
    )
    AND status != 'eliminated'; -- Currently not marked as eliminated
