-- Script to identify picks that should be marked as eliminated but are still active
-- This will help us find the 31 picks that are causing the Week 2 to Week 3 discrepancy

-- First, let's see the current state of Week 2 picks
SELECT 
    'Current Week 2 Active Picks' as description,
    COUNT(*) as count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
    AND status != 'eliminated';

-- Now let's identify which Week 2 picks should be eliminated based on game results
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
-- Find picks that should be eliminated (picked team won or game was a tie)
SELECT 
    'Picks that should be eliminated' as description,
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

-- Show the specific picks that should be eliminated
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
    'DETAILED LIST - Picks that should be eliminated:' as description,
    user_id,
    reg2_team_matchup_id,
    picked_team_key,
    actual_matchup_id,
    CONCAT(away_team, ' @ ', home_team) as game,
    winner,
    picks_count,
    status as current_status,
    'Should be eliminated because: ' || 
    CASE 
        WHEN winner IS NULL THEN 'Tie game'
        WHEN winner = picked_team_key THEN 'Picked team won'
        ELSE 'Picked team won (partial match)'
    END as reason
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

-- Summary of what we found
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
    'Total Week 2 picks that should be eliminated but are still active' as details,
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
