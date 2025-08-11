-- Create team_odds table for storing DraftKings odds
CREATE TABLE IF NOT EXISTS team_odds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    matchup_id UUID NOT NULL REFERENCES matchups(id) ON DELETE CASCADE,
    team TEXT NOT NULL,
    opponent TEXT NOT NULL,
    week INTEGER NOT NULL,
    odds_to_win DECIMAL(10,2) NOT NULL,
    odds_to_lose DECIMAL(10,2) NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate odds for same team/matchup/week
CREATE UNIQUE INDEX IF NOT EXISTS team_odds_unique_idx 
ON team_odds(matchup_id, team, week);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS team_odds_week_idx ON team_odds(week);
CREATE INDEX IF NOT EXISTS team_odds_locked_idx ON team_odds(is_locked);
CREATE INDEX IF NOT EXISTS team_odds_team_idx ON team_odds(team);

-- Add RLS policies
ALTER TABLE team_odds ENABLE ROW LEVEL SECURITY;

-- Admins can view all odds
CREATE POLICY "Admins can view all odds" ON team_odds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Admins can insert odds
CREATE POLICY "Admins can insert odds" ON team_odds
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Admins can update odds
CREATE POLICY "Admins can update odds" ON team_odds
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Admins can delete odds
CREATE POLICY "Admins can delete odds" ON team_odds
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Users can view odds (for transparency)
CREATE POLICY "Users can view odds" ON team_odds
    FOR SELECT USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_odds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_odds_updated_at
    BEFORE UPDATE ON team_odds
    FOR EACH ROW
    EXECUTE FUNCTION update_team_odds_updated_at();
