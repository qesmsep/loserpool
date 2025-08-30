# Password Reset System Test Guide

## Quick Test Steps

### 1. Test User Password Reset Flow

1. **Go to login page** (`/login`)
2. **Click "Forgot password?"** link
3. **Enter a test email** (use a real email you can access)
4. **Click "Send Reset Link"**
5. **Check your email** for the reset link
6. **Click the reset link** in the email
7. **Enter a new password** that meets requirements:
   - At least 8 characters
   - One uppercase letter
   - One lowercase letter
   - One number
   - One special character
8. **Click "Reset Password"**
9. **Verify you're redirected** to login page
10. **Sign in with new password**

### 2. Test Admin Password Reset Flow

1. **Go to admin settings** (`/admin/settings`)
2. **Click "Access Tool"** next to Password Reset
3. **Enter a test user's email**
4. **Enter a new password**
5. **Click "Reset Password"**
6. **Verify success message**
7. **Test user can sign in** with new password

### 3. Test Error Cases

1. **Invalid email format** - Should show validation error
2. **Non-existent email** - Should still show success message (security)
3. **Weak password** - Should show password requirements error
4. **Expired reset link** - Should show "Invalid or expired reset link"
5. **Mismatched passwords** - Should show "Passwords do not match"

## Expected Behavior

### User Flow
- ✅ Email validation works
- ✅ Reset email is sent
- ✅ Reset link works
- ✅ Password requirements enforced
- ✅ Success message shown
- ✅ Redirect to login
- ✅ New password works

### Admin Flow
- ✅ Admin access required
- ✅ Email validation works
- ✅ Password requirements enforced
- ✅ Immediate password update
- ✅ Success message shown
- ✅ User can sign in immediately

### Security
- ✅ No user enumeration (always shows success)
- ✅ Strong password requirements
- ✅ Secure token handling
- ✅ Session invalidation after reset
- ✅ Rate limiting (handled by Supabase)

## Troubleshooting

If tests fail:

1. **Check Supabase email configuration**
2. **Verify environment variables**
3. **Check browser console for errors**
4. **Check server logs for API errors**
5. **Test with different email providers**

## Success Criteria

- ✅ User can reset password via email
- ✅ Admin can reset password directly
- ✅ All error cases handled gracefully
- ✅ Security requirements met
- ✅ User experience is smooth
