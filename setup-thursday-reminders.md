# Thursday Morning Pick Reminders Setup

## Overview
The app now sends email reminders every Thursday at 9 AM to users who haven't made their picks for the current week.

## Features
- ✅ **Smart Detection**: Only sends to users with purchased picks who haven't made picks for current week
- ✅ **Time Validation**: Only runs on Thursdays between 8-10 AM
- ✅ **Security**: Requires authentication token
- ✅ **Manual Testing**: GET endpoint for testing
- ✅ **Console Logging**: Shows all emails for debugging

## Setup Steps

### 1. Environment Variable
Add to your `.env.local`:
```
CRON_SECRET_TOKEN=your-secret-token-here
```

### 2. Cron Job Setup

#### Option A: Vercel Cron (Recommended)
Add to your `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/thursday-reminders",
      "schedule": "0 9 * * 4"
    }
  ]
}
```

#### Option B: External Cron Service (Cron-job.org, EasyCron, etc.)
- URL: `https://your-domain.vercel.app/api/cron/thursday-reminders`
- Method: POST
- Headers: `Authorization: Bearer your-secret-token-here`
- Schedule: `0 9 * * 4` (Every Thursday at 9 AM)

#### Option C: GitHub Actions
Create `.github/workflows/thursday-reminders.yml`:
```yaml
name: Thursday Pick Reminders
on:
  schedule:
    - cron: '0 9 * * 4'  # Every Thursday at 9 AM UTC

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Send Thursday Reminders
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET_TOKEN }}" \
            https://your-domain.vercel.app/api/cron/thursday-reminders
```

### 3. Email Service Setup
Follow the same email service setup as purchase notifications:
- Configure Supabase SMTP, Resend, or SendGrid
- Update the `sendPickReminder` function in `src/lib/email.ts`

## Testing

### Manual Test
Visit: `https://your-domain.vercel.app/api/cron/thursday-reminders`
- This triggers reminders immediately (skips time/day checks)
- Check console logs for email content

### Automated Test
The cron job will:
1. Check if it's Thursday
2. Check if it's between 8-10 AM
3. Verify authentication token
4. Find users needing reminders
5. Send personalized emails

## Email Content
Each reminder includes:
- User's name and available picks
- Current week number
- Deadline information
- Clear instructions on how to make picks
- Quick links to dashboard and picks page

## Monitoring
- Check Vercel function logs for cron job execution
- Monitor email delivery rates
- Review console logs for debugging

## Troubleshooting
1. **No emails sent**: Check if users have purchased picks and haven't made picks for current week
2. **Authentication errors**: Verify `CRON_SECRET_TOKEN` is set correctly
3. **Time issues**: Ensure cron job runs at correct time (UTC vs local time)
4. **Email delivery**: Check email service configuration

## Security
- ✅ Token-based authentication
- ✅ Time/day validation
- ✅ Error handling and logging
- ✅ Rate limiting (via cron schedule)

## Customization
- Modify email content in `sendPickReminder` function
- Adjust time window in API route
- Add additional reminder days if needed
- Customize email templates for different scenarios 