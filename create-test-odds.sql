-- Create Team Odds Table and Test Odds for Tomorrow's Matchups
-- Run this in your Supabase SQL editor

-- First, create the team_odds table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_odds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matchup_id UUID NOT NULL REFERENCES matchups(id) ON DELETE CASCADE,
  team TEXT NOT NULL,
  opponent TEXT NOT NULL,
  week INTEGER NOT NULL,
  odds_to_win DECIMAL(5,2) NOT NULL,
  odds_to_lose DECIMAL(5,2) NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(matchup_id, team, week)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_odds_week ON team_odds(week);
CREATE INDEX IF NOT EXISTS idx_team_odds_locked ON team_odds(is_locked);
CREATE INDEX IF NOT EXISTS idx_team_odds_matchup ON team_odds(matchup_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_odds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_team_odds_updated_at_trigger ON team_odds;
CREATE TRIGGER update_team_odds_updated_at_trigger
  BEFORE UPDATE ON team_odds
  FOR EACH ROW
  EXECUTE FUNCTION update_team_odds_updated_at();

-- Enable RLS
ALTER TABLE team_odds ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Admins can view all team odds" ON team_odds;
CREATE POLICY "Admins can view all team odds" ON team_odds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert team odds" ON team_odds;
CREATE POLICY "Admins can insert team odds" ON team_odds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update team odds" ON team_odds;
CREATE POLICY "Admins can update team odds" ON team_odds
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can view team odds" ON team_odds;
CREATE POLICY "Users can view team odds" ON team_odds
  FOR SELECT USING (true);

-- Insert test odds for tomorrow's matchups (Week 1)
-- Using realistic DraftKings-style odds

-- Green Bay Packers vs Chicago Bears
INSERT INTO team_odds (matchup_id, team, opponent, week, odds_to_win, odds_to_lose, is_locked) VALUES
  ('0a0d3e22-21f2-467d-887e-370963d68f33', 'Green Bay Packers', 'Chicago Bears', 1, 0.65, 0.35, false),
  ('0a0d3e22-21f2-467d-887e-370963d68f33', 'Chicago Bears', 'Green Bay Packers', 1, 0.35, 0.65, false);

-- Dallas Cowboys vs New York Giants  
INSERT INTO team_odds (matchup_id, team, opponent, week, odds_to_win, odds_to_lose, is_locked) VALUES
  ('2ff958cc-3119-4fa0-91c1-f99671fcff42', 'Dallas Cowboys', 'New York Giants', 1, 0.75, 0.25, false),
  ('2ff958cc-3119-4fa0-91c1-f99671fcff42', 'New York Giants', 'Dallas Cowboys', 1, 0.25, 0.75, false);

-- Philadelphia Eagles vs Washington Commanders
INSERT INTO team_odds (matchup_id, team, opponent, week, odds_to_win, odds_to_lose, is_locked) VALUES
  ('cd9b4d30-58e5-48a2-a8cb-3c6939d53f30', 'Philadelphia Eagles', 'Washington Commanders', 1, 0.70, 0.30, false),
  ('cd9b4d30-58e5-48a2-a8cb-3c6939d53f30', 'Washington Commanders', 'Philadelphia Eagles', 1, 0.30, 0.70, false);

-- Verify the odds were inserted
SELECT 
  m.away_team,
  m.home_team,
  m.game_time,
  away_odds.odds_to_win as away_win_odds,
  away_odds.odds_to_lose as away_lose_odds,
  home_odds.odds_to_win as home_win_odds,
  home_odds.odds_to_lose as home_lose_odds
FROM matchups m
JOIN team_odds away_odds ON m.id = away_odds.matchup_id AND away_odds.team = m.away_team
JOIN team_odds home_odds ON m.id = home_odds.matchup_id AND home_odds.team = m.home_team
WHERE m.week = 1
ORDER BY m.game_time;
