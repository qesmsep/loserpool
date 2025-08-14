# Automated Matchup Updates System

## Overview

The Loser Pool now includes a comprehensive automated system that fetches and updates matchup data twice daily (6am and 6pm CST) from multiple external APIs. This system ensures real-time game information, weather data, and odds are always current.

## Features

- ✅ **ESPN API Integration**: Fetches live game data, scores, and status updates
- ✅ **Weather Data**: OpenWeatherMap integration for outdoor game conditions
- ✅ **Odds Data**: DraftKings integration for point spreads and over/under
- ✅ **Change Detection**: Only updates when data actually changes
- ✅ **Error Handling**: Comprehensive error logging and email notifications
- ✅ **Admin Dashboard**: Real-time monitoring of update status
- ✅ **Manual Override**: Ability to run updates manually for testing

## Database Schema Updates

The system adds several new fields to the `matchups` table:

### New Fields Added:
- `venue` - Game location/venue name
- `weather_forecast` - Weather description for outdoor games
- `temperature` - Temperature in Fahrenheit
- `wind_speed` - Wind speed in mph
- `humidity` - Humidity percentage
- `is_dome` - Boolean indicating if game is in a dome
- `away_spread` - Point spread for away team
- `home_spread` - Point spread for home team
- `over_under` - Total points over/under
- `odds_last_updated` - Timestamp of last odds update
- `data_source` - Source of the data (espn, manual, etc.)
- `last_api_update` - Timestamp of last API update
- `api_update_count` - Number of times updated via API
- `winner` - Game winner (away, home, tie)

### New Tables:
- `automated_update_logs` - Tracks all update attempts and results

## API Integrations

### 1. ESPN API
- **Endpoint**: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
- **Data**: Game schedules, scores, status, venue information
- **Rate Limit**: No authentication required, reasonable limits
- **Update Frequency**: Twice daily

### 2. WeatherStack API
- **Endpoint**: `http://api.weatherstack.com/current`
- **Data**: Temperature, wind speed, humidity, weather description
- **Authentication**: Optional API key (works without key for basic features)
- **Rate Limit**: 1000 calls/month (free tier)
- **Update Frequency**: Only for outdoor games

### 3. DraftKings Sportsbook API
- **Endpoint**: `https://sportsbook.draftkings.com/api/v4/odds`
- **Data**: Point spreads, over/under totals
- **Authentication**: No authentication required (public API)
- **Update Frequency**: Twice daily

## Environment Variables

Add these to your `.env.local` file:

```bash
# Required for cron job authentication
CRON_SECRET_TOKEN=your-secret-token-here

# WeatherStack API (for weather data)
WEATHERSTACK_API_KEY=your-weatherstack-api-key  # Optional - works without key

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Setup Instructions

### 1. Database Schema Update
Run the `update-matchups-schema.sql` script in your Supabase SQL editor:

```sql
-- Copy and paste the entire contents of update-matchups-schema.sql
-- This script safely adds all new fields and tables
```

### 2. Environment Configuration
1. (Optional) Get a WeatherStack API key from [weatherstack.com](https://weatherstack.com) for enhanced features
2. Add the environment variables listed above
3. Deploy to Vercel to enable cron jobs

### 3. Test the System
1. Visit `/admin/settings/automated-updates` to see the monitoring dashboard
2. Click "Manual Update" to test the system immediately
3. Check the logs to ensure everything is working

## Cron Job Schedule

The system runs automatically twice daily:
- **6:00 AM CST** - Morning update
- **6:00 PM CST** - Evening update

Cron expression: `0 6,18 * * *` (UTC time)

## Admin Dashboard

Access the automated updates dashboard at `/admin/settings/automated-updates` to:

- View system status (enabled/disabled)
- See last update time and results
- Monitor recent update logs
- View current week matchups with update status
- Run manual updates for testing

## Error Handling

### Email Notifications
- All errors are automatically emailed to `tim@828.life`
- Includes detailed error information and timestamps
- Helps with debugging and monitoring

### Logging
- All update attempts are logged to `automated_update_logs` table
- Includes success/error status, execution time, and error details
- Accessible via admin dashboard

### Graceful Degradation
- If weather API fails, games continue without weather data
- If odds API fails, spreads remain unchanged
- System continues to function even with partial failures

## Dome Venues

The system automatically detects dome venues and doesn't fetch weather data for them:

- Mercedes-Benz Stadium (Atlanta)
- NRG Stadium (Houston)
- Lucas Oil Stadium (Indianapolis)
- U.S. Bank Stadium (Minnesota)
- Caesars Superdome (New Orleans)
- SoFi Stadium (Los Angeles)
- State Farm Stadium (Arizona)
- Allegiant Stadium (Las Vegas)
- Ford Field (Detroit)
- AT&T Stadium (Dallas)
- MetLife Stadium (New York)
- Hard Rock Stadium (Miami)

## Testing

### Manual Testing
1. Visit `/api/cron/update-matchups` in your browser
2. Check the response for success/error status
3. Review the admin dashboard for results

### API Testing
1. Test ESPN API: Visit the ESPN endpoint directly
2. Test Weather API: Use your API key in a browser
3. Check logs for any authentication issues

## Troubleshooting

### Common Issues

1. **Cron jobs not running**
   - Verify `CRON_SECRET_TOKEN` is set
   - Check Vercel deployment status
   - Review Vercel function logs

2. **Weather data not updating**
   - Verify `WEATHERSTACK_API_KEY` is valid (if using one)
   - Check API rate limits
   - Review error logs

3. **No matchups found**
   - Ensure matchups exist in database for current week
   - Check team name matching between ESPN and database
   - Verify current week calculation

### Debug Steps

1. Check the admin dashboard for recent errors
2. Review the `automated_update_logs` table
3. Test manual update via admin interface
4. Check environment variables are set correctly
5. Review Vercel function logs for detailed errors

## Future Enhancements

### Planned Features
- Real DraftKings odds API integration
- Additional weather data providers as backup
- Push notifications for significant changes
- Historical data tracking and analytics
- Custom update schedules per week

### API Improvements
- Caching to reduce API calls
- Retry logic for failed requests
- Multiple odds providers for redundancy
- Enhanced error recovery

## Security Considerations

- All API calls use environment variables for authentication
- Cron jobs require secret token authentication
- Database access is restricted via RLS policies
- Error emails don't contain sensitive data
- API keys are never exposed in client-side code

## Performance

- Updates typically complete in 5-15 seconds
- Weather data is only fetched for outdoor games
- Change detection prevents unnecessary database updates
- Logs are automatically cleaned up after 30 days
- Indexes optimize database queries

## Support

For issues or questions:
1. Check the admin dashboard first
2. Review error logs in the database
3. Test manual updates
4. Contact support with specific error messages

---

**Note**: This system is designed for the 2025 preseason testing and will be used for the regular season. The current week calculation is based on the 2025 NFL season start date.
