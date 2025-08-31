# Environment Variables Setup for Password Reset

## Required Environment Variables

Add these to your `.env.local` file (or Vercel environment variables):

```bash
# Supabase Configuration (you already have these)
NEXT_PUBLIC_SUPABASE_URL=https://yvgcrzmriygcnuhlyrcr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Site Configuration (NEW - add this)
NEXT_PUBLIC_SITE_URL=https://loserpool.app

# Resend Configuration (NEW - add this)
RESEND_API_KEY=your_resend_api_key_here
```

## Setup Instructions

1. **Get your Supabase keys** from your Supabase dashboard
2. **Get your Resend API key** from https://resend.com
3. **Add these to Vercel** environment variables for production
4. **Add these to your local `.env.local`** for development

## Important Notes

- The `NEXT_PUBLIC_SITE_URL` should match your Vercel deployment URL
- Keep your service role key secure and never expose it to the client
- The Resend API key is used server-side only
