# Signup Email Setup Guide

## Overview
This guide will help you set up friendly, exciting signup confirmation emails for The Loser Pool. The new system includes:

- 🎉 **Exciting welcome message** with emojis and engaging content
- 🔗 **Working confirmation button** that properly links to the confirmation URL
- 📱 **Mobile-friendly HTML design** with beautiful styling
- 📧 **Fallback text version** for email clients that don't support HTML
- ⚡ **Automatic sending** after user signup

## What's New

### 1. Custom Email Template
- Beautiful HTML email with gradient backgrounds and modern styling
- Clear explanation of how The Loser Pool works
- Step-by-step instructions for new users
- Prominent confirmation button that actually works
- Fallback text link for accessibility

### 2. Enhanced User Experience
- Friendly, exciting tone that builds anticipation
- Clear call-to-action with the confirmation button
- Helpful tips and pool highlights
- Professional branding and design

### 3. Technical Improvements
- Proper confirmation link generation using Supabase
- Automatic email sending after signup
- Error handling and fallbacks
- Console logging for debugging

## Setup Instructions

### Step 1: Configure Email Service

Choose one of these email service options:

#### Option A: Supabase Edge Function (Recommended)
1. **Deploy the Edge Function:**
   ```bash
   cd supabase/functions/send-email
   supabase functions deploy send-email
   ```

2. **Set Environment Variables in Supabase Dashboard:**
   - Go to Settings > API
   - Add these environment variables:
     ```
     RESEND_API_KEY=your_resend_api_key
     # OR
     SENDGRID_API_KEY=your_sendgrid_api_key
     ```

3. **Configure Email Provider:**
   - **Resend.com** (recommended): Sign up at [resend.com](https://resend.com)
   - **SendGrid**: Sign up at [sendgrid.com](https://sendgrid.com)
   - Get your API key and add it to Supabase environment variables

#### Option B: Direct Email Service Integration
1. **Add to your `.env.local`:**
   ```
   EMAIL_PROVIDER=resend
   EMAIL_API_KEY=your_api_key
   FROM_EMAIL=noreply@yourdomain.com
   ```

2. **Install email package:**
   ```bash
   npm install resend
   # OR
   npm install @sendgrid/mail
   ```

### Step 2: Add Email Template to Database

Run this SQL in your Supabase SQL Editor:

```sql
-- Add Signup Confirmation Email Template
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
  )
ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  trigger_type = EXCLUDED.trigger_type,
  timing = EXCLUDED.timing,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
```

### Step 3: Test the Setup

1. **Test Signup Flow:**
   - Go to your signup page
   - Create a new account with a test email
   - Check that the custom email is sent
   - Verify the confirmation button works

2. **Check Console Logs:**
   - Look for these success messages:
     ```
     ✅ Custom signup confirmation email sent
     ✅ Built-in signup confirmation email sent successfully to user@example.com
     ```

3. **Verify Email Content:**
   - Email should have beautiful HTML styling
   - Confirmation button should be prominent and clickable
   - Text should be friendly and exciting
   - Confirmation link should work properly

## Troubleshooting

### Email Not Sending
1. **Check Environment Variables:**
   - Verify `EMAIL_PROVIDER` is set correctly
   - Ensure `EMAIL_API_KEY` is valid
   - Check `FROM_EMAIL` is configured

2. **Check Console Logs:**
   - Look for error messages in browser console
   - Check server logs for API errors
   - Verify email service API key is working

3. **Test Email Service:**
   - Try sending a test email directly through your email service
   - Verify domain authentication if using custom domain

### Confirmation Link Not Working
1. **Check Supabase Configuration:**
   - Verify `NEXT_PUBLIC_APP_URL` is set correctly
   - Ensure Supabase service role key has proper permissions
   - Check that email confirmation is enabled in Supabase

2. **Test Link Generation:**
   - Check the API route logs for link generation errors
   - Verify the generated link format is correct

### Template Not Loading
1. **Check Database:**
   - Verify the email template was inserted correctly
   - Ensure `is_active` is set to `true`
   - Check that `trigger_type` is `signup_confirmation`

2. **Check Template Processing:**
   - Look for template variable replacement errors
   - Verify all required variables are provided

## Customization

### Modify Email Content
1. **Update Database Template:**
   - Edit the template in the `email_templates` table
   - Use variables like `{{user_name}}`, `{{confirmation_link}}`

2. **Update Built-in Template:**
   - Modify the `emailTemplates['signup-confirmation']` object in `src/lib/email-templates.ts`
   - Update both HTML and text versions

### Styling Changes
1. **HTML Styling:**
   - Modify the inline CSS in the HTML template
   - Test across different email clients
   - Use web-safe fonts and colors

2. **Branding:**
   - Update colors to match your brand
   - Add your logo or branding elements
   - Customize the footer information

## Production Checklist

- [ ] Email service API key is configured
- [ ] Domain authentication is set up (if using custom domain)
- [ ] Email templates are active in database
- [ ] Confirmation links are working properly
- [ ] Email delivery rates are monitored
- [ ] Spam folder instructions are included
- [ ] Support contact information is accurate
- [ ] Mobile responsiveness is tested

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Test the email service independently
4. Review the troubleshooting section above

For additional help, check the main documentation or contact support.
