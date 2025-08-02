# Disable Email Confirmation for Testing

## Steps to disable email confirmation in Supabase:

1. **Go to your Supabase Dashboard**
2. **Navigate to Authentication > Settings**
3. **Find "Email Auth" section**
4. **Disable "Enable email confirmations"**
5. **Save the changes**

## Alternative: Enable auto-confirm

1. **Go to Authentication > Settings**
2. **Find "Email Auth" section**
3. **Enable "Enable auto-confirm"**
4. **Save the changes**

## Why this helps:

- Users can sign in immediately after signup
- No need to check email for confirmation
- Better for testing and development
- Can be re-enabled for production

## Test the fix:

1. Disable email confirmation in Supabase dashboard
2. Try signing up again
3. User should be automatically signed in and redirected to dashboard
4. No more sign-in loops 