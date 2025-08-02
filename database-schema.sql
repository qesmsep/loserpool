-- The Loser Pool Database Schema

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Users table
CREATE TABLE users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    username TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    invited_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchases table
CREATE TABLE purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    stripe_session_id TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL, -- Amount in cents
    picks_count INTEGER NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matchups table
CREATE TABLE matchups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week INTEGER NOT NULL,
    away_team TEXT NOT NULL,
    home_team TEXT NOT NULL,
    game_time TIMESTAMP WITH TIME ZONE NOT NULL,
    away_score INTEGER,
    home_score INTEGER,
    status TEXT CHECK (status IN ('scheduled', 'live', 'final')) DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Picks table
CREATE TABLE picks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    matchup_id UUID REFERENCES matchups(id) ON DELETE CASCADE NOT NULL,
    team_picked TEXT NOT NULL,
    picks_count INTEGER NOT NULL,
    status TEXT CHECK (status IN ('active', 'eliminated', 'safe')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, matchup_id)
);

-- Weekly Results table
CREATE TABLE weekly_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week INTEGER NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    total_picks INTEGER NOT NULL,
    eliminated_picks INTEGER NOT NULL,
    active_picks INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week, user_id)
);

-- Invitations table
CREATE TABLE invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    used_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_matchups_week ON matchups(week);
CREATE INDEX idx_matchups_status ON matchups(status);
CREATE INDEX idx_picks_user_id ON picks(user_id);
CREATE INDEX idx_picks_matchup_id ON picks(matchup_id);
CREATE INDEX idx_picks_status ON picks(status);
CREATE INDEX idx_weekly_results_week ON weekly_results(week);
CREATE INDEX idx_weekly_results_user_id ON weekly_results(user_id);
CREATE INDEX idx_invitations_invite_code ON invitations(invite_code);

-- Row Level Security Policies

-- Users table RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Purchases table RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON purchases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases" ON purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases" ON purchases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Matchups table RLS
ALTER TABLE matchups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view matchups" ON matchups
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage matchups" ON matchups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Picks table RLS
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own picks" ON picks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own picks" ON picks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own picks" ON picks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all picks" ON picks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admins can manage all picks" ON picks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Weekly Results table RLS
ALTER TABLE weekly_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own results" ON weekly_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all results" ON weekly_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admins can manage results" ON weekly_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Invitations table RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invitations" ON invitations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create invitations" ON invitations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can use invitation codes" ON invitations
    FOR UPDATE USING (true);

CREATE POLICY "Admins can view all invitations" ON invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_picks_updated_at BEFORE UPDATE ON picks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate invitation codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'INV-' || upper(substring(md5(random()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, email, username, is_admin)
    VALUES (NEW.id, NEW.email, NULL, FALSE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user(); 