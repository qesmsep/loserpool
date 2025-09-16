-- Script to update the 31 picks that should be marked as eliminated
-- This will fix the Week 2 to Week 3 discrepancy in the weekly statistics

-- First, let's see what we're about to update (for verification)
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
    'BEFORE UPDATE - Picks that will be marked as eliminated:' as description,
    user_id,
    reg2_team_matchup_id,
    picked_team_key,
    CONCAT(away_team, ' @ ', home_team) as game,
    winner,
    picks_count,
    status as current_status,
    'Will be eliminated because: ' || 
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

-- Now perform the actual update
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
picks_to_eliminate AS (
    -- Join picks with matchup results to find picks that should be eliminated
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
    WHERE m.game_status = 'final'
        AND (
            m.winner IS NULL -- Tie game
            OR m.winner = CASE 
                WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                    SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
                ELSE p.reg2_team_matchup_id
            END -- Picked team won
            OR m.winner ILIKE '%' || CASE 
                WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                    SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
                ELSE p.reg2_team_matchup_id
            END || '%' -- Partial match
            OR CASE 
                WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                    SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
                ELSE p.reg2_team_matchup_id
            END ILIKE '%' || m.winner || '%' -- Reverse partial match
        )
        AND p.status != 'eliminated' -- Currently not marked as eliminated
)
UPDATE picks 
SET status = 'eliminated'
WHERE user_id IN (
    SELECT user_id 
    FROM picks_to_eliminate
);

-- Show the results of the update
SELECT 
    'UPDATE COMPLETE' as description,
    'Picks marked as eliminated' as details,
    COUNT(*) as users_updated
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
    AND status = 'eliminated';

-- Verify the fix by checking Week 2 to Week 3 math
SELECT 
    'VERIFICATION - Week 2 Active Picks' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg2_team_matchup_id IS NOT NULL 
    AND status != 'eliminated';

SELECT 
    'VERIFICATION - Week 3 Active Picks' as description,
    COUNT(*) as user_count,
    SUM(picks_count) as total_picks
FROM picks 
WHERE reg3_team_matchup_id IS NOT NULL 
    AND status != 'eliminated';
