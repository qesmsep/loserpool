# Setup Email Service in Supabase

## The Problem:
- Users sign up successfully
- No confirmation emails are sent
- Users can't confirm their accounts

## Solution: Configure Email Service

### Option 1: Use Supabase's Built-in Email Service (Recommended)

1. **Go to your Supabase Dashboard**
2. **Navigate to Authentication > Settings**
3. **Find "SMTP Settings" section**
4. **Enable "Enable SMTP"**
5. **Configure with one of these options:**

#### Option A: Use Supabase's Default SMTP (Free)
- **SMTP Host:** `smtp.gmail.com`
- **SMTP Port:** `587`
- **SMTP User:** Your Gmail address
- **SMTP Pass:** Your Gmail app password
- **Sender Name:** "The Loser Pool"
- **Sender Email:** Your Gmail address

#### Option B: Use a Dedicated Email Service
- **Resend.com** (recommended)
- **SendGrid**
- **Mailgun**

### Option B: Disable Email Confirmation for Testing

If you want to test without email confirmation:

1. **Go to Authentication > Settings**
2. **Find "Email Auth" section**
3. **Disable "Enable email confirmations"**
4. **Save changes**

### Option C: Enable Auto-Confirm

1. **Go to Authentication > Settings**
2. **Find "Email Auth" section**
3. **Enable "Enable auto-confirm"**
4. **Save changes**

## Test the Setup:

1. **Configure email service** (Option A)
2. **Try signing up** with a new email
3. **Check your email** for confirmation link
4. **Click the link** to confirm
5. **Sign in** to access dashboard

## Gmail App Password Setup (if using Gmail):

1. **Go to Google Account settings**
2. **Security > 2-Step Verification**
3. **App passwords**
4. **Generate new app password**
5. **Use this password in Supabase SMTP settings** 