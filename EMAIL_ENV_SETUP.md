# Resend Email Environment Variables

## Required Environment Variables for .env.local

Add these to your `.env.local` file:

```env
# Email Service Configuration
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_your_resend_api_key_here
FROM_EMAIL=onboarding@resend.dev

# App Configuration (if not already set)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Where to Get Your Resend API Key

1. **Go to [resend.com](https://resend.com)** and sign in
2. **Navigate to API Keys** in your dashboard
3. **Create a new API key** or copy your existing one
4. **Replace `re_your_resend_api_key_here`** with your actual API key

## Example .env.local

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Service (Resend)
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_1234567890abcdef1234567890abcdef12345678
FROM_EMAIL=onboarding@resend.dev

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Other existing variables...
```

## Important Notes

- **API Key Format**: Resend API keys start with `re_`
- **FROM_EMAIL**: Use `onboarding@resend.dev` for testing (no domain verification needed)
- **Local Testing**: Use `http://localhost:3000` for `NEXT_PUBLIC_APP_URL`
- **Production**: Change `NEXT_PUBLIC_APP_URL` to your actual domain
- **Custom Domain**: If you want to use your own domain later, verify it in Resend first

## Test the Setup

After adding the environment variables:

1. **Restart your development server**
2. **Try signing up** with a test email
3. **Check console logs** for email sending status
4. **Verify the email** is received with the beautiful template

## Troubleshooting

If emails aren't sending:
- Check that `EMAIL_PROVIDER=resend` is set
- Verify your API key is correct and starts with `re_`
- Use `onboarding@resend.dev` as FROM_EMAIL (no verification needed)
- Check console logs for error messages
