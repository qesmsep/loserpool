-- Insert Test Odds for Tomorrow's Matchups (Week 1)
-- Run this in your Supabase SQL editor

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
  home_odds.odds_to_lose as home_lose_odds,
  CASE 
    WHEN away_odds.odds_to_lose < home_odds.odds_to_lose THEN m.away_team
    ELSE m.home_team
  END as "Best Team to Pick (Most Likely to Lose)"
FROM matchups m
JOIN team_odds away_odds ON m.id = away_odds.matchup_id AND away_odds.team = m.away_team
JOIN team_odds home_odds ON m.id = home_odds.matchup_id AND home_odds.team = m.home_team
WHERE m.week = 1
ORDER BY m.game_time;
