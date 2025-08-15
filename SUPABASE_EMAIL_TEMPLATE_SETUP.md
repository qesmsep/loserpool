# Supabase Email Template Setup

## Overview
Since Supabase automatically sends confirmation emails, the best approach is to customize the email templates directly in Supabase's authentication settings. This ensures the confirmation links work properly and the emails are sent reliably.

## Setup Instructions

### Step 1: Access Supabase Email Templates

1. **Go to your Supabase Dashboard**
2. **Navigate to Authentication > Email Templates**
3. **You'll see templates for:**
   - Confirm signup
   - Invite user
   - Magic link
   - Change email address
   - Reset password

### Step 2: Customize the "Confirm signup" Template

Click on **"Confirm signup"** and update it with this content:

#### Subject Line:
```
🎉 Welcome to The Loser Pool! Confirm Your Email
```

#### Email Content (HTML):
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #1e40af; font-size: 28px; margin: 0 0 8px 0;">🎉 Welcome to The Loser Pool!</h1>
      <p style="color: #6b7280; font-size: 16px; margin: 0;">You've just joined the most exciting NFL elimination pool around!</p>
    </div>

    <!-- Welcome Message -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px;">🏈 What is The Loser Pool?</h2>
      <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>Pick teams that you think will <strong>LOSE</strong> each week</li>
        <li>If your pick wins, you're eliminated from that pick</li>
        <li>Last person standing wins the entire pool!</li>
        <li>It's simple, exciting, and anyone can win!</li>
      </ul>
    </div>

    <!-- Next Steps -->
    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #0369a1; margin: 0 0 16px 0;">🚀 What happens next?</h3>
      <ol style="margin: 0; padding-left: 20px; line-height: 1.6; color: #1e40af;">
        <li><strong>Confirm your email</strong> by clicking the button below</li>
        <li><strong>Log into your account</strong> and explore your dashboard</li>
        <li><strong>Purchase picks</strong> to get started (you get 10 picks to start!)</li>
        <li><strong>Make your first picks</strong> for the upcoming week</li>
        <li><strong>Watch the games</strong> and hope your picks lose!</li>
      </ol>
    </div>

    <!-- Important Notice -->
    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #92400e; font-weight: 600;">⏰ Important: You need to confirm your email before you can start playing.</p>
    </div>

    <!-- Confirmation Button -->
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
        🔗 Confirm Your Email & Get Started
      </a>
    </div>

    <!-- Fallback Link -->
    <div style="text-align: center; margin-bottom: 24px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">If the button doesn't work, copy and paste this link:</p>
      <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; word-break: break-all; margin: 0;">
        {{ .ConfirmationURL }}
      </p>
    </div>

    <!-- Quick Tips -->
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #166534; margin: 0 0 16px 0;">🎯 Quick Tips</h3>
      <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #166534;">
        <li>Check your spam folder if you don't see this email</li>
        <li>Make sure to confirm your email within 24 hours</li>
        <li>Once confirmed, you can log in and start playing immediately</li>
      </ul>
    </div>

    <!-- Pool Highlights -->
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #dc2626; margin: 0 0 16px 0;">🏆 Pool Highlights</h3>
      <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #dc2626;">
        <li>Weekly elimination format</li>
        <li>Real-time leaderboards</li>
        <li>Mobile-friendly interface</li>
        <li>Fair and transparent rules</li>
        <li>Exciting prizes for winners</li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 24px;">
      <p style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">We can't wait to see you in action!</p>
      <p style="color: #6b7280; margin: 0 0 16px 0;">Good luck, and remember - you're picking teams to LOSE!</p>
      
      <div style="margin-top: 24px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br>The Loser Pool Team</p>
      </div>
    </div>

    <!-- Contact Info -->
    <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Questions? Reply to this email or contact us at support@loserpool.com<br>
        Follow us on social media for updates and announcements!
      </p>
    </div>
  </div>
</div>
```

### Step 3: Configure SMTP Settings

1. **Go to Authentication > Settings**
2. **Find "SMTP Settings" section**
3. **Enable "Enable SMTP"**
4. **Configure with your email service:**

#### For Resend:
- **SMTP Host:** `smtp.resend.com`
- **SMTP Port:** `587`
- **SMTP User:** `resend`
- **SMTP Pass:** Your Resend API key
- **Sender Name:** "The Loser Pool"
- **Sender Email:** `onboarding@resend.dev` (or your verified domain)

### Step 4: Test the Setup

1. **Try signing up** with a new email address
2. **Check your email** for the beautiful confirmation email
3. **Click the confirmation button** to verify it works
4. **Sign in** to access your dashboard

## Benefits of This Approach

✅ **Reliable confirmation links** - Uses Supabase's built-in system
✅ **No custom API needed** - Works out of the box
✅ **Beautiful email design** - Custom HTML template
✅ **Mobile-friendly** - Responsive design
✅ **Professional branding** - Consistent with your app
✅ **Automatic sending** - No additional code required

## Troubleshooting

### Email Not Sending
- Check SMTP settings in Supabase dashboard
- Verify your email service credentials
- Test with a different email address

### Template Not Loading
- Make sure you saved the template in Supabase
- Check that SMTP is enabled
- Verify the HTML syntax is correct

### Confirmation Link Not Working
- The `{{ .ConfirmationURL }}` variable is automatically replaced by Supabase
- Links should work immediately after setup
- Check that your app URL is configured correctly

This approach gives you the best of both worlds: beautiful, custom emails with reliable confirmation links that work perfectly! 🎉
