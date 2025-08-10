-- Create Week Zero picks for testing
-- This will allow us to display "Week Zero Picks" in the history

-- First, let's add Week 0 to the global settings
INSERT INTO global_settings (key, value, description)
VALUES ('week_zero_enabled', 'true', 'Enable Week Zero picks for testing')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Update existing test picks to be Week 0
UPDATE picks 
SET week = 0 
WHERE week = 1 
AND user_id IN (
    SELECT id FROM users WHERE email LIKE '%test%' OR is_admin = true
);

-- Also update any picks that might be from the current test user
UPDATE picks 
SET week = 0 
WHERE week = 1 
AND user_id = 'a459c3a2-7393-4e0b-9d11-85f052a3650f';

-- Create some additional Week 0 picks for testing
INSERT INTO picks (user_id, matchup_id, team_picked, picks_count, week, status)
SELECT 
    'a459c3a2-7393-4e0b-9d11-85f052a3650f' as user_id,
    m.id as matchup_id,
    CASE 
        WHEN m.away_team = 'Philadelphia Eagles' THEN 'Washington Commanders'
        WHEN m.away_team = 'New York Giants' THEN 'Dallas Cowboys'
        WHEN m.away_team = 'Chicago Bears' THEN 'Green Bay Packers'
        ELSE m.away_team
    END as team_picked,
    FLOOR(RANDOM() * 3) + 1 as picks_count,
    0 as week,
    'active' as status
FROM matchups m
WHERE m.week = 1
AND m.id NOT IN (
    SELECT matchup_id FROM picks 
    WHERE user_id = 'a459c3a2-7393-4e0b-9d11-85f052a3650f' 
    AND week = 0
)
LIMIT 2;

-- Verify the changes
SELECT 
    'Week 0 Picks Created' as status,
    COUNT(*) as total_picks
FROM picks 
WHERE week = 0;

SELECT 
    'Week 0 Picks by User' as info,
    user_id,
    COUNT(*) as picks_count
FROM picks 
WHERE week = 0
GROUP BY user_id;
