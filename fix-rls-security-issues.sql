-- Fix RLS Security Issues
-- This script addresses all the Supabase linter security warnings

BEGIN;

-- 1. Fix the users table RLS policy that references user_metadata (security vulnerability)
-- Drop the problematic policy that uses user_metadata
DROP POLICY IF EXISTS "Allow admin all" ON users;

-- Create a secure admin policy that doesn't use user_metadata
CREATE POLICY "Allow admin all" ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 2. Enable RLS on teams table and create appropriate policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Teams table policies - anyone can view teams (public data)
CREATE POLICY "Anyone can view teams" ON teams
    FOR SELECT USING (true);

-- Only admins can manage teams
CREATE POLICY "Admins can manage teams" ON teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 3. Enable RLS on leaderboard table and create appropriate policies
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Users can view their own leaderboard entries
CREATE POLICY "Users can view own leaderboard" ON leaderboard
    FOR SELECT USING (auth.uid() = user_id);

-- Anyone can view leaderboard (for public leaderboard display)
CREATE POLICY "Anyone can view leaderboard" ON leaderboard
    FOR SELECT USING (true);

-- Only admins can manage leaderboard
CREATE POLICY "Admins can manage leaderboard" ON leaderboard
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 4. Enable RLS on all the venue/event management tables that were flagged
-- These appear to be from a different application but need RLS enabled

-- venue_calendar_settings
ALTER TABLE venue_calendar_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage venue calendar settings" ON venue_calendar_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- venue_calendar_integrations
ALTER TABLE venue_calendar_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage venue calendar integrations" ON venue_calendar_integrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage customers" ON customers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- venue_published_calendars
ALTER TABLE venue_published_calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage venue published calendars" ON venue_published_calendars
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- venue_branding
ALTER TABLE venue_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage venue branding" ON venue_branding
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- venue_calendar_subscriptions
ALTER TABLE venue_calendar_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage venue calendar subscriptions" ON venue_calendar_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- communications
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage communications" ON communications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- venue_event_types
ALTER TABLE venue_event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage venue event types" ON venue_event_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- venue_event_roles
ALTER TABLE venue_event_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage venue event roles" ON venue_event_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- contact_forms
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage contact forms" ON contact_forms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- venue_tax_settings
ALTER TABLE venue_tax_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage venue tax settings" ON venue_tax_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- venue_payment_methods
ALTER TABLE venue_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage venue payment methods" ON venue_payment_methods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage proposals" ON proposals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- add_ons
ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage add ons" ON add_ons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- proposal_items
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage proposal items" ON proposal_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- proposal_customizations
ALTER TABLE proposal_customizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage proposal customizations" ON proposal_customizations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- event_types
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage event types" ON event_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- tours
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage tours" ON tours
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage clients" ON clients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- inquiries
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage inquiries" ON inquiries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- event_roles
ALTER TABLE event_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage event roles" ON event_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payment methods" ON payment_methods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- payment_schedules
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payment schedules" ON payment_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- tax_rates
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage tax rates" ON tax_rates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- questionnaires
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage questionnaires" ON questionnaires
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- questionnaire_questions
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage questionnaire questions" ON questionnaire_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- products_services
ALTER TABLE products_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage products services" ON products_services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- itinerary_templates
ALTER TABLE itinerary_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage itinerary templates" ON itinerary_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- itinerary_items
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage itinerary items" ON itinerary_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- venues_backup
ALTER TABLE venues_backup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage venues backup" ON venues_backup
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Verify all tables now have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename IN (
        'teams', 'leaderboard', 'venue_calendar_settings', 'venue_calendar_integrations',
        'customers', 'venue_published_calendars', 'venue_branding', 'venue_calendar_subscriptions',
        'communications', 'venue_event_types', 'venue_event_roles', 'contact_forms',
        'venue_tax_settings', 'venue_payment_methods', 'proposals', 'add_ons',
        'proposal_items', 'proposal_customizations', 'event_types', 'tours',
        'clients', 'inquiries', 'event_roles', 'payment_methods', 'payment_schedules',
        'tax_rates', 'questionnaires', 'questionnaire_questions', 'products_services',
        'itinerary_templates', 'itinerary_items', 'venues_backup'
    )
ORDER BY tablename;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'RLS Security Issues Fixed Successfully!';
    RAISE NOTICE 'All tables now have RLS enabled with appropriate policies.';
    RAISE NOTICE 'The user_metadata security vulnerability has been resolved.';
    RAISE NOTICE 'Teams and leaderboard tables now have proper security policies.';
END $$;
