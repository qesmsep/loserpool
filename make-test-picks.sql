-- Make Test Picks for Mock Weekend
-- This script helps you make picks for the three mock matchups

-- First, let's see what users exist and their available picks
SELECT 
    u.id,
    u.email,
    u.username,
    u.entries_used,
    u.max_entries,
    (u.max_entries - u.entries_used) as picks_remaining
FROM users u
ORDER BY u.email;

-- To make picks for a user, use this format:
-- INSERT INTO picks (user_id, matchup_id, picked_team, created_at) VALUES
-- ('USER_ID_HERE', 'MATCHUP_ID_HERE', 'TEAM_NAME_HERE', NOW());

-- Example picks (replace USER_ID and MATCHUP_ID with actual values):
-- INSERT INTO picks (user_id, matchup_id, picked_team, created_at) VALUES
-- ('your-user-id', 'matchup-id-1', 'New York Giants', NOW()),
-- ('your-user-id', 'matchup-id-2', 'Chicago Bears', NOW()),
-- ('your-user-id', 'matchup-id-3', 'Washington Commanders', NOW());

-- To see the matchups available for picking:
SELECT 
    id,
    away_team,
    home_team,
    game_time
FROM matchups 
WHERE DATE(game_time) = '2025-08-04'
ORDER BY game_time; 