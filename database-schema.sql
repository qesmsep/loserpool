-- The Loser Pool Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  invited_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  picks_count INTEGER NOT NULL CHECK (picks_count > 0),
  amount_paid INTEGER NOT NULL CHECK (amount_paid > 0), -- Amount in cents
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matchups table
CREATE TABLE IF NOT EXISTS matchups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week INTEGER NOT NULL,
  away_team TEXT NOT NULL,
  home_team TEXT NOT NULL,
  game_time TIMESTAMP WITH TIME ZONE NOT NULL,
  away_score INTEGER,
  home_score INTEGER,
  winner TEXT CHECK (winner IN ('away', 'home', 'tie')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'final')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week, away_team, home_team)
);

-- Create picks table
CREATE TABLE IF NOT EXISTS picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matchup_id UUID NOT NULL REFERENCES matchups(id) ON DELETE CASCADE,
  selected_team TEXT NOT NULL CHECK (selected_team IN ('away', 'home')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'survived', 'eliminated', 'safe')),
  is_random BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, matchup_id)
);

-- Create weekly_results table
CREATE TABLE IF NOT EXISTS weekly_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  picks_survived INTEGER DEFAULT 0,
  picks_eliminated INTEGER DEFAULT 0,
  picks_safe INTEGER DEFAULT 0,
  total_picks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week, user_id)
);

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_matchups_week ON matchups(week);
CREATE INDEX IF NOT EXISTS idx_matchups_status ON matchups(status);
CREATE INDEX IF NOT EXISTS idx_picks_user_id ON picks(user_id);
CREATE INDEX IF NOT EXISTS idx_picks_matchup_id ON picks(matchup_id);
CREATE INDEX IF NOT EXISTS idx_picks_status ON picks(status);
CREATE INDEX IF NOT EXISTS idx_weekly_results_week ON weekly_results(week);
CREATE INDEX IF NOT EXISTS idx_weekly_results_user_id ON weekly_results(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invite_code ON invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_used_by ON invitations(used_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matchups_updated_at BEFORE UPDATE ON matchups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_picks_updated_at BEFORE UPDATE ON picks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weekly_results_updated_at BEFORE UPDATE ON weekly_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, username, is_admin)
  VALUES (NEW.id, NEW.email, NULL, FALSE);
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Purchases table policies
CREATE POLICY "Users can view their own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases" ON purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases" ON purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Matchups table policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view matchups" ON matchups
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage matchups" ON matchups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Picks table policies
CREATE POLICY "Users can view their own picks" ON picks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own picks" ON picks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own picks" ON picks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all picks" ON picks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can manage all picks" ON picks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Weekly results table policies
CREATE POLICY "Users can view their own weekly results" ON weekly_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all weekly results" ON weekly_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can manage weekly results" ON weekly_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Invitations table policies
CREATE POLICY "Users can view invitations they created" ON invitations
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create invitations" ON invitations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update invitations they created" ON invitations
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Admins can view all invitations" ON invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can manage all invitations" ON invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Insert some sample data for testing (optional)
-- You can uncomment these lines if you want to add some test data

-- INSERT INTO invitations (invite_code, created_by) VALUES 
-- ('TEST123', NULL),
-- ('WELCOME2024', NULL);

-- Make the first user an admin (run this after creating your first user)
-- UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com'; 