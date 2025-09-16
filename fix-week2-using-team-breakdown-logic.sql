-- Fix Week 2 eliminations using the SAME logic as team picks breakdown
-- This ensures consistency with the working team picks breakdown

-- Step 1: Get all Week 2 matchups and their results (same as team breakdown)
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
),
-- Step 2: Get teams data for proper name matching (same as team breakdown)
teams_data AS (
    SELECT 
        name,
        abbreviation
    FROM teams 
    WHERE season = 2024
),
-- Step 3: Create teams map (same logic as team breakdown)
teams_map AS (
    SELECT 
        name,
        abbreviation,
        -- Create variations like the team breakdown does
        CASE 
            WHEN name LIKE '% %' THEN REPLACE(name, ' ', '_')
            ELSE name
        END as city_team
    FROM teams_data
),
-- Step 4: Process picks using EXACT same logic as team breakdown
picks_to_eliminate AS (
    SELECT 
        p.user_id,
        p.reg2_team_matchup_id,
        p.picks_count,
        -- Extract team and matchup ID (same as team breakdown)
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
            ELSE p.reg2_team_matchup_id
        END as actual_matchup_id,
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
            ELSE p.reg2_team_matchup_id
        END as team_key,
        m.winner,
        m.game_status,
        -- Find team data (same logic as team breakdown)
        COALESCE(
            tm1.name,
            tm2.name,
            tm3.name
        ) as team_name
    FROM picks p
    LEFT JOIN week2_matchups m ON m.matchup_id::text = 
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SPLIT_PART(p.reg2_team_matchup_id, '_', 1)
            ELSE p.reg2_team_matchup_id
        END
    -- Try to match team data (same as team breakdown)
    LEFT JOIN teams_map tm1 ON tm1.name = 
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
            ELSE p.reg2_team_matchup_id
        END
    LEFT JOIN teams_map tm2 ON tm2.abbreviation = 
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
            ELSE p.reg2_team_matchup_id
        END
    LEFT JOIN teams_map tm3 ON tm3.city_team = 
        CASE 
            WHEN p.reg2_team_matchup_id LIKE '%_%' THEN
                SUBSTRING(p.reg2_team_matchup_id FROM '^[^_]+_([^_]+.*)$')
            ELSE p.reg2_team_matchup_id
        END
    WHERE p.reg2_team_matchup_id IS NOT NULL
        AND m.game_status = 'final'
)
-- Step 5: Mark picks as eliminated using SAME logic as team breakdown
UPDATE picks 
SET status = 'eliminated'
WHERE reg2_team_matchup_id IS NOT NULL
    AND user_id IN (
        SELECT user_id
        FROM picks_to_eliminate
        WHERE game_status = 'final'
            AND (
                winner IS NULL -- Tie game (all picks eliminated)
                OR winner = team_name -- Direct match
                OR winner = team_key -- Abbreviation match
                OR (winner IS NOT NULL AND team_name IS NOT NULL AND 
                    (winner ILIKE '%' || team_name || '%' OR 
                     team_name ILIKE '%' || winner || '%')) -- Partial match
            )
    );

-- Step 6: Mark all other Week 2 picks as active
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
