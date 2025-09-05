# Spread Fetching Cron Job Setup

## Overview
This cron job specifically fetches and updates spread data from ESPN API for all matchups in the current week. It runs every 2 hours to ensure spreads are kept up-to-date.

## Features
- ✅ **Dedicated Spread Fetching**: Focuses specifically on spread data updates
- ✅ **ESPN API Integration**: Fetches real-time spread data from ESPN
- ✅ **Comprehensive Logging**: Detailed logs of all spread updates
- ✅ **Error Handling**: Robust error handling and reporting
- ✅ **Manual Testing**: GET endpoint for manual testing

## How It Works

### Spread Data Sources
- **ESPN API**: Primary source for spread data
- **Real-time Updates**: Fetches current spreads every 2 hours
- **Database Updates**: Updates `away_spread`, `home_spread`, and `over_under` columns

### Update Logic
1. **Fetch Current Week**: Gets current NFL week from ESPN API
2. **Get ESPN Games**: Retrieves all games for current week from ESPN
3. **Match Games**: Matches ESPN games to database matchups by team names
4. **Update Spreads**: Updates spreads only when they've changed
5. **Log Results**: Provides detailed logging of all updates

## Cron Job Configuration

### Vercel Cron (Already Configured)
```json
{
  "path": "/api/cron/fetch-spreads",
  "schedule": "0 */2 * * *"
}
```

### Schedule Details
- **Frequency**: Every 2 hours
- **Times**: 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00 UTC
- **Purpose**: Keep spreads updated throughout the day

## Manual Testing

### Test the Cron Job
Visit: `https://your-domain.vercel.app/api/cron/fetch-spreads`
- This triggers spread fetching immediately
- Check console logs for detailed results
- Returns JSON with update statistics

### Expected Response
```json
{
  "success": true,
  "spreads_updated": 5,
  "total_matchups_checked": 16,
  "execution_time_ms": 1250,
  "errors": null,
  "debug": {
    "currentWeek": 1,
    "espnGamesCount": 16,
    "databaseMatchupsCount": 16,
    "espnGameKeys": ["KC-BAL", "BUF-NYJ", "..."],
    "databaseGameKeys": ["KC-BAL", "BUF-NYJ", "..."],
    "message": "Database matchups found for current week"
  }
}
```

## Troubleshooting

### Common Issues

1. **No Spreads Updated**
   - Check if ESPN API is providing spread data
   - Verify team name matching between ESPN and database
   - Check console logs for specific errors

2. **Authentication Errors**
   - Verify `CRON_SECRET_TOKEN` is set in environment variables
   - Check that the token matches in the request headers

3. **ESPN API Errors**
   - ESPN API might be temporarily unavailable
   - Check if the API endpoint has changed
   - Verify the season year is correct (currently 2025)

### Debug Information
The cron job provides extensive debug information:
- Current week from ESPN API
- Number of games found from ESPN
- Number of matchups in database
- Team name mappings
- Specific error messages

## Integration with Default Picks

This cron job works in conjunction with the default picks system:
1. **Spread Updates**: Keeps spreads current for accurate default pick assignment
2. **Largest Spread Logic**: Default picks use the most recent spread data
3. **Timing**: Runs frequently to ensure spreads are current before pick deadlines

## Monitoring

### Success Indicators
- `spreads_updated > 0`: Spreads are being updated
- `errors: null`: No errors occurred
- `espnGamesCount > 0`: ESPN API is responding
- `databaseMatchupsCount > 0`: Database has matchups for current week

### Warning Signs
- `spreads_updated = 0`: No spreads were updated (might be normal if spreads haven't changed)
- `errors` array not empty: Specific errors occurred
- `espnGamesCount = 0`: ESPN API not responding
- `databaseMatchupsCount = 0`: No matchups in database for current week
