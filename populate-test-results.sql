-- Populate Test Results for Mock Weekend
-- This script updates the matchups with final scores and winners
-- Matches the exact table schema with winner column

-- Update the three matchups with final scores
-- You can modify these scores to test different scenarios

-- Game 1: Dallas Cowboys @ New York Giants
UPDATE matchups 
SET 
    away_score = 24,
    home_score = 17,
    status = 'final',
    winner = 'away',
    updated_at = NOW()
WHERE DATE(game_time) = '2025-08-04' AND away_team = 'Dallas Cowboys' AND home_team = 'New York Giants';

-- Game 2: Green Bay Packers @ Chicago Bears  
UPDATE matchups 
SET 
    away_score = 31,
    home_score = 28,
    status = 'final',
    winner = 'away',
    updated_at = NOW()
WHERE DATE(game_time) = '2025-08-04' AND away_team = 'Green Bay Packers' AND home_team = 'Chicago Bears';

-- Game 3: Philadelphia Eagles @ Washington Commanders
UPDATE matchups 
SET 
    away_score = 14,
    home_score = 21,
    status = 'final',
    winner = 'home',
    updated_at = NOW()
WHERE DATE(game_time) = '2025-08-04' AND away_team = 'Philadelphia Eagles' AND home_team = 'Washington Commanders';

-- Display the final results
SELECT 
    id,
    week,
    away_team,
    home_team,
    away_score,
    home_score,
    winner,
    status,
    game_time,
    created_at,
    updated_at
FROM matchups 
WHERE DATE(game_time) = '2025-08-04'
ORDER BY game_time;

-- Show picks and their outcomes
SELECT 
    p.id as pick_id,
    u.email,
    m.away_team,
    m.home_team,
    p.picked_team,
    m.winner,
    CASE 
        WHEN p.picked_team = m.away_team AND m.winner = 'away' THEN 'LOST'
        WHEN p.picked_team = m.home_team AND m.winner = 'home' THEN 'LOST'
        WHEN p.picked_team = m.away_team AND m.winner = 'home' THEN 'WON'
        WHEN p.picked_team = m.home_team AND m.winner = 'away' THEN 'WON'
        ELSE 'TIE'
    END as pick_result
FROM picks p
JOIN matchups m ON p.matchup_id = m.id
JOIN users u ON p.user_id = u.id
WHERE DATE(m.game_time) = '2025-08-04'
ORDER BY u.email, m.game_time; 