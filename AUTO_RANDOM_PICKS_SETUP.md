# Auto Random Picks Setup

## Overview
The auto random picks system automatically fetches DraftKings odds and assigns random picks to users who haven't made selections when the first game of the week starts.

## How It Works

### 1. **Automatic Process**
- **Fetch Odds**: Retrieves current odds from DraftKings for the current week
- **Lock Odds**: Locks the odds when the first game kicks off (prevents changes)
- **Assign Picks**: Automatically assigns random picks to users who haven't made selections
- **Strategy-Based**: Uses weighted random selection based on the configured strategy

### 2. **Timing**
- **Trigger**: At or shortly before the admin-determined week start time
- **Time Window**: 30 minutes before/after kickoff
- **Frequency**: Once per week, automatically

### 3. **Strategy Options**
- **Best Odds of Losing**: Favors teams with higher odds of losing (ideal for loser pool)
- **Best Odds of Winning**: Favors teams with lower odds of winning (for winner pool)

## Setup Instructions

### 1. **Enable Auto Random Picks**
1. Go to Admin → Pool Settings → Rules
2. Enable "Auto Random Picks"
3. Select your preferred strategy
4. Save the settings

### 2. **Cron Job Configuration**
The cron job is automatically configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-random-picks",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Schedule:** Runs every 5 minutes to check if it's time to process auto random picks.

### 3. **Environment Variables**
No additional environment variables needed for Vercel cron jobs. The system automatically detects legitimate Vercel cron requests.

### 4. **DraftKings API Integration** (Future)
Currently uses mock data. To integrate with DraftKings:
1. Obtain DraftKings API credentials
2. Update `src/lib/odds.ts` with actual API calls
3. Add `DRAFTKINGS_API_KEY` to environment variables

## Database Requirements

Run the SQL script to create the required table:
```sql
-- Execute create-team-odds-table.sql in your Supabase SQL editor
```

## API Endpoint

**POST** `/api/cron/auto-random-picks`

**Headers:** (Automatically handled by Vercel cron jobs)
```
User-Agent: Vercel/1.0
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully processed auto random picks for Week 1. Fetched 4 odds and assigned random picks."
}
```

**Test Endpoint:**
**GET** `/api/cron/test` - Runs every 6 hours to verify cron jobs are working

## Monitoring

### Admin Dashboard
- View auto random picks status in the admin panel
- See if the feature is enabled/disabled

### Logs
- Check server logs for processing messages
- Monitor for any errors in the cron job execution

## Troubleshooting

### Common Issues

1. **Odds Not Fetching**
   - Check if DraftKings API is accessible
   - Verify API credentials (when implemented)
   - Check server logs for errors

2. **Picks Not Assigned**
   - Verify auto random picks is enabled in rules
   - Check if users have picks remaining
   - Ensure odds are locked for the current week

3. **Cron Job Not Running**
   - Verify `vercel.json` is properly configured
   - Check Vercel deployment logs for cron job execution
   - Test the endpoint manually

### Manual Testing
You can test the endpoint manually:
```bash
curl -X POST https://your-domain.com/api/cron/auto-random-picks \
  -H "Content-Type: application/json"
```

## Security Notes

- Vercel cron jobs are automatically authenticated
- The endpoint only processes legitimate Vercel cron requests in production
- All operations are logged for audit purposes
- Only admins can modify auto random picks settings
