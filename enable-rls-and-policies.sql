-- Enable RLS and Add Policies for Existing Tables
-- Run this after the main schema is created

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Purchases table policies
CREATE POLICY "Users can view their own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases" ON public.purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases" ON public.purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Matchups table policies
CREATE POLICY "Anyone can view matchups" ON public.matchups
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage matchups" ON public.matchups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Picks table policies
CREATE POLICY "Users can view their own picks" ON public.picks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own picks" ON public.picks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own picks" ON public.picks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all picks" ON public.picks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Weekly results table policies
CREATE POLICY "Users can view their own results" ON public.weekly_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all results" ON public.weekly_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Invitations table policies
CREATE POLICY "Users can view their own invitations" ON public.invitations
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create invitations" ON public.invitations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Anyone can view invitations for signup" ON public.invitations
  FOR SELECT USING (true);

CREATE POLICY "Admins can view all invitations" ON public.invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Global settings table policies (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'global_settings') THEN
    ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Anyone can view global settings" ON public.global_settings
      FOR SELECT USING (true);

    CREATE POLICY "Admins can manage global settings" ON public.global_settings
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() AND is_admin = true
        )
      );
  END IF;
END $$; 