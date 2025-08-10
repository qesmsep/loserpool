-- Mock Weekend Testing Data
-- Creates three matchups happening today at 1pm CST (2pm EDT)
-- Date: Monday, August 4, 2025
-- Matches the exact table schema with winner column

-- Clear any existing matchups for today to avoid conflicts
DELETE FROM matchups WHERE DATE(game_time) = '2025-08-04';

-- Insert three mock matchups for today at 1pm CST
INSERT INTO matchups (week, away_team, home_team, game_time, status, away_score, home_score, winner, created_at, updated_at) VALUES
(1, 'Dallas Cowboys', 'New York Giants', '2025-08-04 14:00:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
(1, 'Green Bay Packers', 'Chicago Bears', '2025-08-04 14:00:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW()),
(1, 'Philadelphia Eagles', 'Washington Commanders', '2025-08-04 14:00:00', 'scheduled', NULL, NULL, NULL, NOW(), NOW());

-- Update global settings to set current week and ensure pool is active
UPDATE global_settings SET value = '1' WHERE key = 'current_week';
UPDATE global_settings SET value = 'active' WHERE key = 'pool_status';
UPDATE global_settings SET value = 'false' WHERE key = 'pool_locked';

-- Insert settings if they don't exist
INSERT INTO global_settings (key, value) VALUES 
('current_week', '1'),
('pool_status', 'active'),
('pool_locked', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Display the created matchups
SELECT 
    id,
    week,
    away_team,
    home_team,
    game_time,
    status,
    away_score,
    home_score,
    winner,
    created_at,
    updated_at
FROM matchups 
WHERE DATE(game_time) = '2025-08-04'
ORDER BY game_time; 