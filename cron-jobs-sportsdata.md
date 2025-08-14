# SportsData.io Cron Jobs Configuration

This document outlines the cron job setup for automated SportsData.io updates at 6am and 6pm daily.

## Cron Job Endpoints

### 1. All Seasons Update (6am and 6pm)
**Endpoint**: `/api/cron/update-all-seasons-sportsdata`
**Method**: POST
**Body**: 
```json
{
  "season": 2025,
  "action": "all-seasons"
}
```

### 2. Current Week Update (6am and 6pm)
**Endpoint**: `/api/cron/update-all-seasons-sportsdata`
**Method**: POST
**Body**: 
```json
{
  "season": 2025,
  "action": "current-week-all-seasons"
}
```

## Cron Job Schedule

### 6:00 AM Daily
- Update all seasons (preseason, regular season, postseason)
- Sync current week with database
- Update current week matchups

### 6:00 PM Daily
- Update all seasons (preseason, regular season, postseason)
- Sync current week with database
- Update current week matchups

## Vercel Cron Configuration

Add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-all-seasons-sportsdata",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/update-all-seasons-sportsdata",
      "schedule": "0 18 * * *"
    }
  ]
}
```

## Environment Variables Required

Make sure these environment variables are set in Vercel:

```env
SPORTSDATA_API_KEY=3a12d524ec444d6f8efad7e833461d17
CRON_SECRET_TOKEN=your_cron_secret_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Manual Testing

You can test the cron jobs manually:

```bash
# Test all seasons update
curl -X POST http://localhost:3000/api/cron/update-all-seasons-sportsdata \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_cron_secret_token" \
  -d '{"season": 2025, "action": "all-seasons"}'

# Test current week update
curl -X POST http://localhost:3000/api/cron/update-all-seasons-sportsdata \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_cron_secret_token" \
  -d '{"season": 2025, "action": "current-week-all-seasons"}'

# Test preseason only
curl "http://localhost:3000/api/cron/update-all-seasons-sportsdata?action=preseason&season=2025"

# Test regular season only
curl "http://localhost:3000/api/cron/update-all-seasons-sportsdata?action=regular-season&season=2025"

# Test postseason only
curl "http://localhost:3000/api/cron/update-all-seasons-sportsdata?action=postseason&season=2025"
```

## Season Types

The system handles three season types:

1. **Preseason (PRE)**: Weeks 1-4
   - Season format: `PRE1`, `PRE2`, `PRE3`, `PRE4`

2. **Regular Season (REG)**: Weeks 1-18
   - Season format: `REG1`, `REG2`, ..., `REG18`

3. **Postseason (POST)**: Weeks 1-4 (Super Bowl, etc.)
   - Season format: `POST1`, `POST2`, `POST3`, `POST4`

## Database Schema

The matchups table uses the following season format:
- `season` column: Text format like `PRE1`, `REG2`, `POST4`
- `week` column: Numeric week number from SportsData.io
- Unique constraint: `(season, away_team, home_team)`

## Error Handling

The cron jobs include comprehensive error handling:
- API connection failures
- Database constraint violations
- Rate limiting
- Invalid data formats

All errors are logged and returned in the response for monitoring.

## Monitoring

Monitor the cron jobs by:
1. Checking Vercel function logs
2. Reviewing database matchup updates
3. Testing endpoints manually
4. Setting up alerts for failures

## Rate Limiting

The service includes delays between API calls to respect SportsData.io rate limits:
- 1 second delay between weeks
- 2 second delay between seasons
- Respectful API usage patterns
