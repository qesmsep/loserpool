-- Create teams table for storing current team data from SportsData.io
-- Run this in your Supabase SQL editor

-- Teams table to store current team information
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id INTEGER UNIQUE NOT NULL, -- SportsData.io team ID
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  city TEXT NOT NULL,
  mascot TEXT NOT NULL,
  conference TEXT,
  division TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  logo_url TEXT,
  stadium_name TEXT,
  stadium_city TEXT,
  stadium_state TEXT,
  stadium_capacity INTEGER,
  current_record TEXT, -- e.g., "11-6"
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  season INTEGER NOT NULL, -- Current season year
  rank INTEGER, -- Current ranking (if available)
  last_api_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_team_id ON teams(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_abbreviation ON teams(abbreviation);
CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season);

-- Create unique constraint on team_id and season combination
ALTER TABLE teams ADD CONSTRAINT unique_team_season UNIQUE (team_id, season);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for teams table
CREATE TRIGGER update_teams_updated_at_trigger
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- Insert initial teams data (will be populated by API)
-- This is just a placeholder structure
INSERT INTO teams (team_id, name, abbreviation, city, mascot, season) VALUES
(1, 'Arizona Cardinals', 'ARI', 'Arizona', 'Cardinals', 2024),
(2, 'Atlanta Falcons', 'ATL', 'Atlanta', 'Falcons', 2024),
(3, 'Baltimore Ravens', 'BAL', 'Baltimore', 'Ravens', 2024),
(4, 'Buffalo Bills', 'BUF', 'Buffalo', 'Bills', 2024),
(5, 'Carolina Panthers', 'CAR', 'Carolina', 'Panthers', 2024),
(6, 'Chicago Bears', 'CHI', 'Chicago', 'Bears', 2024),
(7, 'Cincinnati Bengals', 'CIN', 'Cincinnati', 'Bengals', 2024),
(8, 'Cleveland Browns', 'CLE', 'Cleveland', 'Browns', 2024),
(9, 'Dallas Cowboys', 'DAL', 'Dallas', 'Cowboys', 2024),
(10, 'Denver Broncos', 'DEN', 'Denver', 'Broncos', 2024),
(11, 'Detroit Lions', 'DET', 'Detroit', 'Lions', 2024),
(12, 'Green Bay Packers', 'GB', 'Green Bay', 'Packers', 2024),
(13, 'Houston Texans', 'HOU', 'Houston', 'Texans', 2024),
(14, 'Indianapolis Colts', 'IND', 'Indianapolis', 'Colts', 2024),
(15, 'Jacksonville Jaguars', 'JAX', 'Jacksonville', 'Jaguars', 2024),
(16, 'Kansas City Chiefs', 'KC', 'Kansas City', 'Chiefs', 2024),
(17, 'Las Vegas Raiders', 'LV', 'Las Vegas', 'Raiders', 2024),
(18, 'Los Angeles Chargers', 'LAC', 'Los Angeles', 'Chargers', 2024),
(19, 'Los Angeles Rams', 'LAR', 'Los Angeles', 'Rams', 2024),
(20, 'Miami Dolphins', 'MIA', 'Miami', 'Dolphins', 2024),
(21, 'Minnesota Vikings', 'MIN', 'Minnesota', 'Vikings', 2024),
(22, 'New England Patriots', 'NE', 'New England', 'Patriots', 2024),
(23, 'New Orleans Saints', 'NO', 'New Orleans', 'Saints', 2024),
(24, 'New York Giants', 'NYG', 'New York', 'Giants', 2024),
(25, 'New York Jets', 'NYJ', 'New York', 'Jets', 2024),
(26, 'Philadelphia Eagles', 'PHI', 'Philadelphia', 'Eagles', 2024),
(27, 'Pittsburgh Steelers', 'PIT', 'Pittsburgh', 'Steelers', 2024),
(28, 'San Francisco 49ers', 'SF', 'San Francisco', '49ers', 2024),
(29, 'Seattle Seahawks', 'SEA', 'Seattle', 'Seahawks', 2024),
(30, 'Tampa Bay Buccaneers', 'TB', 'Tampa Bay', 'Buccaneers', 2024),
(31, 'Tennessee Titans', 'TEN', 'Tennessee', 'Titans', 2024),
(32, 'Washington Commanders', 'WAS', 'Washington', 'Commanders', 2024)
ON CONFLICT (team_id, season) DO NOTHING;
