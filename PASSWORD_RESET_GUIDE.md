# Password Reset System Guide

## Overview

The Loser Pool app has a simple and reliable password reset system that uses Supabase's built-in authentication features. This system provides multiple ways for users to reset their passwords.

## How It Works

### 1. User-Initiated Password Reset (Primary Method)

**Flow:**
1. User clicks "Forgot password?" on login page
2. User enters their email address
3. System sends a password reset email via Supabase
4. User clicks the link in the email
5. User sets a new password
6. User is redirected to login page

**Files involved:**
- `/reset-password` - Request reset page
- `/reset-password/confirm` - Set new password page
- `/api/auth/request-password-reset` - Send reset email API

### 2. Admin Password Reset (Backup Method)

**Flow:**
1. Admin accesses `/admin/password-reset`
2. Admin enters user's email and new password
3. System immediately updates the user's password
4. User can sign in with the new password

**Files involved:**
- `/admin/password-reset` - Admin reset page
- `/api/auth/admin-reset-password` - Admin reset API

## User Experience

### For Regular Users

1. **Go to login page** (`/login`)
2. **Click "Forgot password?"** link
3. **Enter email address** and click "Send Reset Link"
4. **Check email** for reset link
5. **Click the link** in the email
6. **Enter new password** (must meet requirements)
7. **Click "Reset Password"**
8. **Sign in** with new password

### Password Requirements

- At least 8 characters long
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*)

### For Administrators

1. **Go to admin password reset page** (`/admin/password-reset`)
2. **Enter user's email address**
3. **Enter new password** for the user
4. **Click "Reset Password"**
5. **User can immediately sign in** with the new password

## Technical Details

### Email Configuration

The password reset emails are sent through Supabase's built-in email service. Make sure your Supabase project has email configured:

1. Go to Supabase Dashboard
2. Navigate to Authentication > Settings
3. Configure SMTP settings or use Supabase's default email service

### Environment Variables

Make sure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Security Features

- **Email validation** - Ensures valid email format
- **Password strength requirements** - Enforces strong passwords
- **Session validation** - Verifies reset links are valid
- **Rate limiting** - Prevents abuse (handled by Supabase)
- **Secure tokens** - Uses Supabase's secure token system

## Troubleshooting

### Common Issues

1. **"Invalid or expired reset link"**
   - Reset links expire after a certain time
   - User should request a new reset link

2. **"User not found"**
   - Check if the email address is correct
   - Verify the user exists in the system

3. **"Failed to send reset email"**
   - Check Supabase email configuration
   - Verify SMTP settings are correct

4. **Password requirements not met**
   - Ensure password meets all requirements
   - Check for special characters, numbers, etc.

### Debug Steps

1. **Check browser console** for error messages
2. **Check server logs** for API errors
3. **Verify Supabase configuration** in dashboard
4. **Test email delivery** with a test account

## Testing the System

### Test User Flow

1. Create a test user account
2. Try the password reset flow
3. Verify email is received
4. Test password reset completion
5. Verify user can sign in with new password

### Test Admin Flow

1. Access admin password reset page
2. Reset a test user's password
3. Verify user can sign in immediately
4. Test with invalid email addresses

## Best Practices

1. **Always use HTTPS** in production
2. **Monitor email delivery** rates
3. **Keep admin access secure**
4. **Log password reset attempts** for security
5. **Provide clear error messages** to users

## Support

If users have trouble with password resets:

1. **Guide them through the standard flow** first
2. **Use admin reset as backup** if needed
3. **Check email spam folders**
4. **Verify email address is correct**
5. **Ensure they're using the latest reset link**

## Security Notes

- Reset links are single-use and time-limited
- Admin password resets bypass email verification
- All password changes are logged in Supabase
- Users are automatically signed out after password reset
- Session tokens are invalidated after password change
