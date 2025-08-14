# SportsData.io Integration

This document explains the SportsData.io integration for The Loser Pool application.

## Overview

The application now uses SportsData.io as the primary data source for NFL game information, replacing the previous web scraping approach. This provides more reliable, structured data with better coverage and real-time updates.

## API Key

The SportsData.io API key is configured as:
- **API Key**: `3a12d524ec444d6f8efad7e833461d17`
- **Environment Variable**: `SPORTSDATA_API_KEY` (optional, defaults to the provided key)

## Features

### ✅ What SportsData.io Provides

1. **Game Schedules**: Complete NFL season schedules with game times
2. **Live Scores**: Real-time game scores and status updates
3. **Point Spreads**: Betting lines and spreads for games
4. **Team Information**: Complete team data and statistics
5. **Weather Data**: Game weather conditions when available
6. **Venue Information**: Stadium details and locations
7. **Current Week Detection**: Automatic current week determination
8. **Odds Data**: Betting odds and money lines

### 🔄 Integration Points

1. **Matchup Updates**: Automatic game schedule updates
2. **Score Updates**: Real-time score tracking
3. **Week Synchronization**: Automatic current week detection
4. **Spread Data**: Point spreads for default pick assignment
5. **Admin Controls**: Manual update triggers

## API Endpoints

### Test Integration
```
GET /api/test-sportsdata
```
Tests the SportsData.io connection and returns sample data.

### Admin Matchup Updates
```
POST /api/admin/update-matchups-sportsdata
GET /api/admin/update-matchups-sportsdata
```

**Actions:**
- `current` - Update current week matchups
- `next` - Update next week matchups  
- `specific` - Update specific week (requires `week` parameter)
- `season` - Update entire season schedule
- `sync-week` - Sync current week with database
- `test` - Test the service

### Cron Job Updates
```
POST /api/cron/update-matchups-sportsdata
GET /api/cron/update-matchups-sportsdata
```

**Actions:**
- `current` - Update current week matchups
- `next` - Update next week matchups
- `sync-week` - Sync current week with database
- `full-update` - Sync week and update current week
- `test` - Test the service

## Usage Examples

### Test the Integration
```bash
# Test basic connection
curl http://localhost:3000/api/test-sportsdata

# Test admin update (requires admin auth)
curl http://localhost:3000/api/admin/update-matchups-sportsdata?action=test

# Test cron update
curl http://localhost:3000/api/cron/update-matchups-sportsdata?action=test
```

### Update Current Week
```bash
# Admin endpoint
curl -X POST http://localhost:3000/api/admin/update-matchups-sportsdata \
  -H "Content-Type: application/json" \
  -d '{"action": "current", "season": 2024}'

# Cron endpoint
curl -X POST http://localhost:3000/api/cron/update-matchups-sportsdata \
  -H "Content-Type: application/json" \
  -d '{"action": "current", "season": 2024}'
```

### Update Specific Week
```bash
curl -X POST http://localhost:3000/api/admin/update-matchups-sportsdata \
  -H "Content-Type: application/json" \
  -d '{"action": "specific", "season": 2024, "week": 5}'
```

### Sync Current Week
```bash
curl http://localhost:3000/api/cron/update-matchups-sportsdata?action=sync-week
```

## Data Mapping

### Game Status Mapping
| SportsData.io | Internal |
|---------------|----------|
| `Scheduled` | `scheduled` |
| `InProgress` | `live` |
| `Final` | `final` |
| `Postponed` | `postponed` |
| `Cancelled` | `cancelled` |
| `Suspended` | `delayed` |
| `Delayed` | `delayed` |

### Database Fields
The service maps SportsData.io fields to our database:

```typescript
{
  id: game.GameID.toString(),
  week: game.Week,
  away_team: game.AwayTeam,
  home_team: game.HomeTeam,
  game_time: game.DateTime,
  status: convertedStatus,
  away_score: game.AwayTeamScore || null,
  home_score: game.HomeTeamScore || null,
  away_spread: game.AwayPointSpread || null,
  home_spread: game.HomePointSpread || null,
  over_under: game.OverUnder || null,
  venue: game.StadiumDetails?.Name || null,
  weather: game.Weather || null,
  channel: game.Channel || null,
  data_source: 'sportsdata.io',
  last_api_update: new Date().toISOString()
}
```

## Error Handling

The service includes comprehensive error handling:

1. **API Connection Errors**: Network timeouts, authentication failures
2. **Data Validation**: Invalid response formats, missing required fields
3. **Database Errors**: Connection issues, constraint violations
4. **Rate Limiting**: Respectful API usage with delays between requests

## Monitoring

### Logs to Watch
- API connection success/failure
- Number of games retrieved
- Database update results
- Error messages and stack traces

### Common Issues
1. **API Key Issues**: Invalid or expired API key
2. **Rate Limiting**: Too many requests in short time
3. **Data Format Changes**: API response structure changes
4. **Network Issues**: Connectivity problems

## Migration from Scraping

### Benefits of SportsData.io
1. **Reliability**: No more scraping failures or site changes
2. **Structured Data**: Consistent, well-formatted responses
3. **Real-time Updates**: Live scores and status changes
4. **Better Coverage**: More comprehensive game data
5. **Professional Support**: API documentation and support

### Migration Steps
1. ✅ Created SportsData.io service
2. ✅ Created matchup update service
3. ✅ Created admin endpoints
4. ✅ Created cron job endpoints
5. ✅ Added comprehensive testing
6. ⏳ Update existing cron jobs to use new endpoints
7. ⏳ Update admin interface to use new endpoints
8. ⏳ Remove old scraping code (optional)

## Future Enhancements

### Potential Improvements
1. **Caching**: Cache API responses to reduce API calls
2. **Webhooks**: Real-time updates via webhooks
3. **Historical Data**: Access to historical game data
4. **Advanced Stats**: Player statistics and team analytics
5. **Multiple Sports**: Expand to other sports if needed

### API Limits
- **Rate Limits**: Respect API rate limits
- **Data Retention**: Consider data retention policies
- **Cost Management**: Monitor API usage costs

## Troubleshooting

### Connection Issues
```bash
# Test basic connectivity
curl "https://api.sportsdata.io/v3/nfl/scores/json/CurrentWeek?key=3a12d524ec444d6f8efad7e833461d17"
```

### Database Issues
```sql
-- Check recent matchup updates
SELECT * FROM matchups 
WHERE data_source = 'sportsdata.io' 
ORDER BY last_api_update DESC 
LIMIT 10;
```

### Log Analysis
```bash
# Check application logs for errors
grep "SportsData.io" /var/log/app.log
grep "Error" /var/log/app.log | grep "sportsdata"
```

## Support

For issues with the SportsData.io integration:
1. Check the application logs for error messages
2. Test the API connection using the test endpoints
3. Verify the API key is valid and active
4. Check SportsData.io status page for service issues
5. Review this documentation for common solutions
