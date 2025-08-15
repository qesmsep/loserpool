-- Add Signup Confirmation Email Template
-- Run this in your Supabase SQL editor

-- Insert a new email template for signup confirmation
-- First, delete any existing template with the same name to avoid conflicts
DELETE FROM email_templates WHERE name = 'Signup Confirmation - Welcome to The Loser Pool!';

-- Insert the new email template
INSERT INTO email_templates (name, subject, body, trigger_type, timing, is_active) VALUES
  (
    'Signup Confirmation - Welcome to The Loser Pool!',
    '🎉 Welcome to The Loser Pool! Confirm Your Email',
    'Hi {{user_name}}!

🎉 **Welcome to The Loser Pool!** 🎉

You''ve just joined the most exciting NFL elimination pool around! We''re thrilled to have you on board.

🏈 **What is The Loser Pool?**
- Pick teams that you think will LOSE each week
- If your pick wins, you''re eliminated from that pick
- Last person standing wins the entire pool!
- It''s simple, exciting, and anyone can win!

🚀 **What happens next?**
1. **Confirm your email** by clicking the button below
2. **Log into your account** and explore your dashboard
3. **Purchase picks** to get started (you get 10 picks to start!)
4. **Make your first picks** for the upcoming week
5. **Watch the games** and hope your picks lose!

⏰ **Important:** You need to confirm your email before you can start playing.

🔗 **Ready to get started?**
Click the button below to confirm your email and activate your account:

[CONFIRM EMAIL BUTTON]

If the button doesn''t work, copy and paste this link into your browser:
{{confirmation_link}}

🎯 **Quick Tips:**
- Check your spam folder if you don''t see this email
- Make sure to confirm your email within 24 hours
- Once confirmed, you can log in and start playing immediately

🏆 **Pool Highlights:**
- Weekly elimination format
- Real-time leaderboards
- Mobile-friendly interface
- Fair and transparent rules
- Exciting prizes for winners

We can''t wait to see you in action! Good luck, and remember - you''re picking teams to LOSE!

Best regards,
The Loser Pool Team

---
Questions? Reply to this email or contact us at support@loserpool.com
Follow us on social media for updates and announcements!',
    'signup_confirmation',
    'immediately',
    true
  );

-- Verify the template was added
SELECT 
  name,
  trigger_type,
  timing,
  is_active,
  created_at
FROM email_templates
WHERE trigger_type = 'signup_confirmation'
ORDER BY created_at;
