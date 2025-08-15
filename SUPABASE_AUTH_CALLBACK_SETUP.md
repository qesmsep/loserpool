# Fix Supabase Auth Callback URL Configuration

## The Problem
The confirmation email is redirecting to `http://localhost:3000/?code=...` instead of the proper auth callback route `/auth/callback`.

## Solution: Update Supabase Site URL Configuration

### Step 1: Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Navigate to **Authentication > Settings**
3. Find the **Site URL** section

### Step 2: Update Site URL
**For Production:**
- Set **Site URL** to: `https://your-domain.com`
- Set **Redirect URLs** to include:
  - `https://your-domain.com/auth/callback`
  - `https://your-domain.com/dashboard`
  - `https://your-domain.com/login`

**For Development:**
- Set **Site URL** to: `http://localhost:3000`
- Set **Redirect URLs** to include:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/dashboard`
  - `http://localhost:3000/login`

### Step 3: Update Email Template (Optional)
1. Go to **Authentication > Email Templates**
2. Click on **"Confirm signup"** template
3. Update the **Action URL** to use the proper callback route:
   - **Current (incorrect):** `{{ .SiteURL }}?code={{ .Token }}`
   - **New (correct):** `{{ .SiteURL }}/auth/callback?code={{ .Token }}`

### Step 4: Test the Fix
1. Try signing up with a new email
2. Check the confirmation email
3. Click the confirmation link
4. Should redirect to `/auth/callback` and then to `/dashboard`

## Alternative: Environment Variable Fix

If you can't update the Supabase dashboard, you can also set the `NEXT_PUBLIC_APP_URL` environment variable:

```env
# For production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# For development  
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Expected Result
After clicking the confirmation link, users should be:
1. Redirected to `/auth/callback?code=...`
2. Automatically authenticated
3. Redirected to `/dashboard`
4. Successfully logged in

## Troubleshooting
- If still redirecting to `/?code=...`, check that the Site URL is set correctly
- If getting auth errors, ensure the redirect URLs include `/auth/callback`
- Clear browser cache and try again
