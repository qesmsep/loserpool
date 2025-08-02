# Email Notifications Setup

## Overview
The app now sends email notifications to all admin users whenever someone purchases picks. Currently, it logs the emails to the console, but you can easily integrate with a real email service.

## Current Implementation
- ✅ **Admin Detection**: Automatically finds all users with `is_admin = true`
- ✅ **Purchase Details**: Includes user info, pick count, amount, and purchase ID
- ✅ **Console Logging**: Currently logs emails to console for testing

## Email Service Options

### Option 1: Supabase Email Service (Recommended)
1. Configure SMTP in Supabase Dashboard:
   - Go to Authentication > Email Templates
   - Set up SMTP provider (Gmail, SendGrid, etc.)
2. Uncomment the Supabase email code in `src/lib/email.ts`

### Option 2: Resend (Popular for Next.js)
1. Sign up at [resend.com](https://resend.com)
2. Install: `npm install resend`
3. Add to `.env.local`:
   ```
   RESEND_API_KEY=your_api_key
   ```
4. Uncomment the Resend code in `src/lib/email.ts`

### Option 3: SendGrid
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Install: `npm install @sendgrid/mail`
3. Add to `.env.local`:
   ```
   SENDGRID_API_KEY=your_api_key
   ```
4. Update the email function in `src/lib/email.ts`

## Email Content
The notification includes:
- User name and email
- Number of picks purchased
- Purchase amount
- Purchase ID
- Timestamp
- Link to admin dashboard

## Testing
1. Make a test purchase
2. Check the console logs for the email notification
3. Verify admin users receive the emails

## Production Setup
1. Choose an email service provider
2. Update the `sendEmail` function in `src/lib/email.ts`
3. Test with real purchases
4. Monitor email delivery rates

## Admin Management
- Add/remove admins by updating `is_admin` field in the `users` table
- All admins will receive notifications for every purchase
- Consider adding email preferences for admins in the future 