-- Mock Season Data for The Loser Pool
-- Using 2023 NFL season data for the first 3 weeks
-- Season starts Monday, picks due by 11:59 PM CST on August 3, 2025

-- Week 1 Matchups (2023 actual games)
INSERT INTO matchups (id, week, away_team, home_team, game_time, status, away_score, home_score) VALUES
('week1-game1', 1, 'Detroit Lions', 'Kansas City Chiefs', '2025-08-07 20:20:00', 'scheduled', NULL, NULL),
('week1-game2', 1, 'Carolina Panthers', 'Atlanta Falcons', '2025-08-10 13:00:00', 'scheduled', NULL, NULL),
('week1-game3', 1, 'Houston Texans', 'Baltimore Ravens', '2025-08-10 13:00:00', 'scheduled', NULL, NULL),
('week1-game4', 1, 'Cincinnati Bengals', 'Cleveland Browns', '2025-08-10 13:00:00', 'scheduled', NULL, NULL),
('week1-game5', 1, 'Jacksonville Jaguars', 'Indianapolis Colts', '2025-08-10 13:00:00', 'scheduled', NULL, NULL),
('week1-game6', 1, 'Tampa Bay Buccaneers', 'Minnesota Vikings', '2025-08-10 13:00:00', 'scheduled', NULL, NULL),
('week1-game7', 1, 'Tennessee Titans', 'New Orleans Saints', '2025-08-10 13:00:00', 'scheduled', NULL, NULL),
('week1-game8', 1, 'San Francisco 49ers', 'Pittsburgh Steelers', '2025-08-10 13:00:00', 'scheduled', NULL, NULL),
('week1-game9', 1, 'Arizona Cardinals', 'Washington Commanders', '2025-08-10 13:00:00', 'scheduled', NULL, NULL),
('week1-game10', 1, 'Green Bay Packers', 'Chicago Bears', '2025-08-10 16:25:00', 'scheduled', NULL, NULL),
('week1-game11', 1, 'Las Vegas Raiders', 'Denver Broncos', '2025-08-10 16:25:00', 'scheduled', NULL, NULL),
('week1-game12', 1, 'Miami Dolphins', 'Los Angeles Chargers', '2025-08-10 16:25:00', 'scheduled', NULL, NULL),
('week1-game13', 1, 'Philadelphia Eagles', 'New England Patriots', '2025-08-10 16:25:00', 'scheduled', NULL, NULL),
('week1-game14', 1, 'Los Angeles Rams', 'Seattle Seahawks', '2025-08-10 16:25:00', 'scheduled', NULL, NULL),
('week1-game15', 1, 'Dallas Cowboys', 'New York Giants', '2025-08-11 20:20:00', 'scheduled', NULL, NULL),
('week1-game16', 1, 'Buffalo Bills', 'New York Jets', '2025-08-12 20:15:00', 'scheduled', NULL, NULL);

-- Week 2 Matchups (2023 actual games)
INSERT INTO matchups (id, week, away_team, home_team, game_time, status, away_score, home_score) VALUES
('week2-game1', 2, 'Minnesota Vikings', 'Philadelphia Eagles', '2025-08-14 20:15:00', 'scheduled', NULL, NULL),
('week2-game2', 2, 'Green Bay Packers', 'Atlanta Falcons', '2025-08-17 13:00:00', 'scheduled', NULL, NULL),
('week2-game3', 2, 'Las Vegas Raiders', 'Buffalo Bills', '2025-08-17 13:00:00', 'scheduled', NULL, NULL),
('week2-game4', 2, 'Baltimore Ravens', 'Cincinnati Bengals', '2025-08-17 13:00:00', 'scheduled', NULL, NULL),
('week2-game5', 2, 'Seattle Seahawks', 'Detroit Lions', '2025-08-17 13:00:00', 'scheduled', NULL, NULL),
('week2-game6', 2, 'Kansas City Chiefs', 'Jacksonville Jaguars', '2025-08-17 13:00:00', 'scheduled', NULL, NULL),
('week2-game7', 2, 'Los Angeles Chargers', 'Tennessee Titans', '2025-08-17 13:00:00', 'scheduled', NULL, NULL),
('week2-game8', 2, 'Chicago Bears', 'Tampa Bay Buccaneers', '2025-08-17 13:00:00', 'scheduled', NULL, NULL),
('week2-game9', 2, 'Indianapolis Colts', 'Houston Texans', '2025-08-17 13:00:00', 'scheduled', NULL, NULL),
('week2-game10', 2, 'New York Giants', 'Arizona Cardinals', '2025-08-17 13:00:00', 'scheduled', NULL, NULL),
('week2-game11', 2, 'San Francisco 49ers', 'Los Angeles Rams', '2025-08-17 13:00:00', 'scheduled', NULL, NULL),
('week2-game12', 2, 'New York Jets', 'Dallas Cowboys', '2025-08-17 16:25:00', 'scheduled', NULL, NULL),
('week2-game13', 2, 'Miami Dolphins', 'New England Patriots', '2025-08-17 16:25:00', 'scheduled', NULL, NULL),
('week2-game14', 2, 'Washington Commanders', 'Denver Broncos', '2025-08-17 16:25:00', 'scheduled', NULL, NULL),
('week2-game15', 2, 'New Orleans Saints', 'Carolina Panthers', '2025-08-17 16:25:00', 'scheduled', NULL, NULL),
('week2-game16', 2, 'Cleveland Browns', 'Pittsburgh Steelers', '2025-08-18 20:20:00', 'scheduled', NULL, NULL);

-- Week 3 Matchups (2023 actual games)
INSERT INTO matchups (id, week, away_team, home_team, game_time, status, away_score, home_score) VALUES
('week3-game1', 3, 'New York Giants', 'San Francisco 49ers', '2025-08-21 20:15:00', 'scheduled', NULL, NULL),
('week3-game2', 3, 'New England Patriots', 'New York Jets', '2025-08-24 13:00:00', 'scheduled', NULL, NULL),
('week3-game3', 3, 'Tennessee Titans', 'Cleveland Browns', '2025-08-24 13:00:00', 'scheduled', NULL, NULL),
('week3-game4', 3, 'Atlanta Falcons', 'Detroit Lions', '2025-08-24 13:00:00', 'scheduled', NULL, NULL),
('week3-game5', 3, 'New Orleans Saints', 'Green Bay Packers', '2025-08-24 13:00:00', 'scheduled', NULL, NULL),
('week3-game6', 3, 'Houston Texans', 'Jacksonville Jaguars', '2025-08-24 13:00:00', 'scheduled', NULL, NULL),
('week3-game7', 3, 'Los Angeles Chargers', 'Minnesota Vikings', '2025-08-24 13:00:00', 'scheduled', NULL, NULL),
('week3-game8', 3, 'Denver Broncos', 'Miami Dolphins', '2025-08-24 13:00:00', 'scheduled', NULL, NULL),
('week3-game9', 3, 'Buffalo Bills', 'Washington Commanders', '2025-08-24 13:00:00', 'scheduled', NULL, NULL),
('week3-game10', 3, 'Chicago Bears', 'Kansas City Chiefs', '2025-08-24 13:00:00', 'scheduled', NULL, NULL),
('week3-game11', 3, 'Indianapolis Colts', 'Baltimore Ravens', '2025-08-24 13:00:00', 'scheduled', NULL, NULL),
('week3-game12', 3, 'Pittsburgh Steelers', 'Las Vegas Raiders', '2025-08-24 13:00:00', 'scheduled', NULL, NULL),
('week3-game13', 3, 'Carolina Panthers', 'Seattle Seahawks', '2025-08-24 16:05:00', 'scheduled', NULL, NULL),
('week3-game14', 3, 'Dallas Cowboys', 'Arizona Cardinals', '2025-08-24 16:25:00', 'scheduled', NULL, NULL),
('week3-game15', 3, 'Philadelphia Eagles', 'Tampa Bay Buccaneers', '2025-08-24 16:25:00', 'scheduled', NULL, NULL),
('week3-game16', 3, 'Los Angeles Rams', 'Cincinnati Bengals', '2025-08-25 20:20:00', 'scheduled', NULL, NULL);

-- Update global settings for the season
UPDATE global_settings SET value = '2025-08-04' WHERE key = 'season_start_date';
UPDATE global_settings SET value = '2025-08-03 23:59:00' WHERE key = 'week1_picks_deadline';

-- Insert season settings if they don't exist
INSERT INTO global_settings (key, value) VALUES 
('season_start_date', '2025-08-04'),
('week1_picks_deadline', '2025-08-03 23:59:00'),
('current_week', '1'),
('pool_status', 'active')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value; 