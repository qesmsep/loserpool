-- Test TNF Deadline Calculation
-- Creates a proper week schedule with Thursday Night Football
-- This will test the dynamic deadline calculation

-- Clear any existing matchups for week 1
DELETE FROM matchups WHERE week = 1;

-- Insert a proper week schedule with TNF
INSERT INTO matchups (week, away_team, home_team, game_time, status, away_score, home_score, winner, created_at, updated_at) VALUES
-- Thursday Night Football (first game of the week)
(1, 'Detroit Lions', 'Kansas City Chiefs', '2025-08-07 20:20:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
-- Sunday Games
(1, 'New York Jets', 'Buffalo Bills', '2025-08-10 13:00:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
(1, 'Miami Dolphins', 'New England Patriots', '2025-08-10 13:00:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
(1, 'Cleveland Browns', 'Pittsburgh Steelers', '2025-08-10 13:00:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
(1, 'Cincinnati Bengals', 'Baltimore Ravens', '2025-08-10 13:00:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
(1, 'Tennessee Titans', 'Indianapolis Colts', '2025-08-10 13:00:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
(1, 'Jacksonville Jaguars', 'Houston Texans', '2025-08-10 13:00:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
(1, 'Los Angeles Chargers', 'Denver Broncos', '2025-08-10 16:05:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
(1, 'Las Vegas Raiders', 'Los Angeles Rams', '2025-08-10 16:05:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
(1, 'Arizona Cardinals', 'San Francisco 49ers', '2025-08-10 16:25:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
(1, 'Seattle Seahawks', 'Green Bay Packers', '2025-08-10 16:25:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
(1, 'Dallas Cowboys', 'New York Giants', '2025-08-10 20:20:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
-- Monday Night Football
(1, 'Philadelphia Eagles', 'Washington Commanders', '2025-08-11 20:15:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW());

-- Update global settings
UPDATE global_settings SET value = '1' WHERE key = 'current_week';
UPDATE global_settings SET value = 'active' WHERE key = 'pool_status';
UPDATE global_settings SET value = 'false' WHERE key = 'pool_locked';

-- Insert settings if they don't exist
INSERT INTO global_settings (key, value) VALUES 
('current_week', '1'),
('pool_status', 'active'),
('pool_locked', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Display the created matchups ordered by game time
SELECT 
    id,
    week,
    away_team,
    home_team,
    game_time,
    status,
    CASE 
        WHEN DATE(game_time) = '2025-08-07' THEN 'Thursday Night Football'
        WHEN DATE(game_time) = '2025-08-10' THEN 'Sunday Games'
        WHEN DATE(game_time) = '2025-08-11' THEN 'Monday Night Football'
        ELSE 'Other'
    END as game_day
FROM matchups 
WHERE week = 1
ORDER BY game_time;
