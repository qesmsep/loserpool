# Supabase Email Setup Guide

Since you're already paying for Supabase, you can use Supabase Edge Functions to send emails. This approach keeps everything within your Supabase ecosystem.

## 🚀 Quick Setup

### 1. Install Supabase CLI (if not already installed)
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link your project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Deploy the Edge Function
```bash
supabase functions deploy send-email
```

### 5. Set Environment Variables in Supabase Dashboard

Go to your Supabase Dashboard → Settings → Edge Functions and add:

**For Resend:**
```
RESEND_API_KEY=re_your_resend_api_key_here
```

**For SendGrid:**
```
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
```

### 6. Update Your Local Environment

In your `.env.local` file, change:
```bash
EMAIL_PROVIDER=supabase
```

## 📧 Email Service Options

### Option A: Resend (Recommended)
1. Sign up at https://resend.com
2. Get your API key from the dashboard
3. Add `RESEND_API_KEY` to Supabase environment variables

### Option B: SendGrid
1. Sign up at https://sendgrid.com
2. Get your API key from the dashboard
3. Add `SENDGRID_API_KEY` to Supabase environment variables

## 🔧 How It Works

1. **Your app** calls the email service
2. **Email service** calls the Supabase Edge Function
3. **Edge Function** uses Resend/SendGrid to send the actual email
4. **Response** comes back through the same chain

## 🧪 Testing

1. Deploy the Edge Function
2. Set up your email service (Resend/SendGrid)
3. Update your environment variables
4. Restart your dev server
5. Test via Admin → Settings → Communications

## 💰 Cost Benefits

- **Supabase Edge Functions**: Included in your Supabase plan
- **Resend**: 3,000 emails/month free, then $0.80/1,000
- **SendGrid**: 100 emails/day free, then $14.95/month for 50k emails

## 🔒 Security

- Edge Function validates requests using your Supabase service key
- API keys are stored securely in Supabase environment variables
- No sensitive data in your client-side code

## 🚨 Troubleshooting

### Edge Function not found
```bash
supabase functions deploy send-email
```

### Environment variables not working
- Check Supabase Dashboard → Settings → Edge Functions
- Redeploy the function after adding variables

### Authorization errors
- Make sure your `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Verify the Edge Function is deployed and accessible

## 📝 Next Steps

1. Choose your email service (Resend recommended)
2. Deploy the Edge Function
3. Set environment variables
4. Test the email functionality
5. Start sending real emails!

The system will automatically use your Supabase Edge Function when `EMAIL_PROVIDER=supabase` is set.
