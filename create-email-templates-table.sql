-- Create Email Templates Table
-- Run this in your Supabase SQL editor

-- Create the email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('pick_reminder', 'welcome', 'elimination', 'custom')),
  timing TEXT NOT NULL CHECK (timing IN ('immediately', 'morning_before_first_game', 'day_before', 'custom')),
  custom_timing TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_trigger_type ON email_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_timing ON email_templates(timing);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_templates_updated_at_trigger ON email_templates;
CREATE TRIGGER update_email_templates_updated_at_trigger
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Admins can view all email templates" ON email_templates;
CREATE POLICY "Admins can view all email templates" ON email_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert email templates" ON email_templates;
CREATE POLICY "Admins can insert email templates" ON email_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update email templates" ON email_templates;
CREATE POLICY "Admins can update email templates" ON email_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete email templates" ON email_templates;
CREATE POLICY "Admins can delete email templates" ON email_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Insert default templates
INSERT INTO email_templates (name, subject, body, trigger_type, timing, is_active) VALUES
  (
    'Weekly Pick Reminder',
    'Make Your Picks - Week {{week_number}}',
    'Hi {{user_name}},

Don''t forget to make your picks for Week {{week_number}}! 

Deadline: {{picks_deadline}}
Picks Remaining: {{picks_remaining}}

Make your picks at: [Pool URL]

Good luck!
{{admin_name}}',
    'pick_reminder',
    'morning_before_first_game',
    true
  ),
  (
    'Welcome to The Loser Pool',
    'Welcome to {{pool_name}}!',
    'Welcome {{user_name}}!

You''ve successfully joined {{pool_name}}. Here''s what you need to know:

- Pick teams that will LOSE each week
- If your pick wins, you''re eliminated
- Last person standing wins the pool!
- You have {{picks_remaining}} picks to use

Make your first picks at: [Pool URL]

Good luck!
{{admin_name}}',
    'welcome',
    'immediately',
    true
  ),
  (
    'Elimination Notification',
    'You''ve Been Eliminated - Week {{week_number}}',
    'Hi {{user_name}},

Unfortunately, you''ve been eliminated from {{pool_name}} in Week {{week_number}}.

{{elimination_reason}}

Game Details: {{game_details}}

You finished in position {{leaderboard_position}} out of {{total_players}} players.

Thanks for playing!
{{admin_name}}',
    'elimination',
    'immediately',
    false
  )
ON CONFLICT DO NOTHING;

-- Verify the table was created
SELECT 
  name,
  trigger_type,
  timing,
  is_active,
  created_at
FROM email_templates
ORDER BY created_at;
