# Team Update System

This document explains the new team data update system that replaces the hardcoded team rankings with live data from SportsData.io.

## Overview

The system now uses SportsData.io API to fetch current team data including:
- Team information (name, abbreviation, city, mascot)
- Current season records (wins, losses, ties)
- Stadium information
- Team colors and logos
- Conference and division data

## Database Schema

### Teams Table
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id INTEGER UNIQUE NOT NULL, -- SportsData.io team ID
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  city TEXT NOT NULL,
  mascot TEXT NOT NULL,
  conference TEXT,
  division TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  logo_url TEXT,
  stadium_name TEXT,
  stadium_city TEXT,
  stadium_state TEXT,
  stadium_capacity INTEGER,
  current_record TEXT, -- e.g., "11-6"
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  season INTEGER NOT NULL,
  rank INTEGER, -- Current ranking (if available)
  last_api_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### Admin Team Updates
```
POST /api/admin/update-teams
GET /api/admin/update-teams
```

**Actions:**
- `update` - Update all team data from SportsData.io
- `test` - Test the team update service
- `teams` - Get all teams from database (GET only)

### Cron Job Updates
```
POST /api/cron/update-teams
GET /api/cron/update-teams
```

**Actions:**
- `update` - Update all team data from SportsData.io
- `test` - Test the team update service

## Usage Examples

### Test the Integration
```bash
# Test basic connection
curl http://localhost:3000/api/admin/update-teams?action=test

# Test cron update
curl http://localhost:3000/api/cron/update-teams?action=test
```

### Update Team Data
```bash
# Admin endpoint
curl -X POST http://localhost:3000/api/admin/update-teams \
  -H "Content-Type: application/json" \
  -d '{"action": "update", "season": 2024}'

# Cron endpoint
curl -X POST http://localhost:3000/api/cron/update-teams \
  -H "Content-Type: application/json" \
  -d '{"action": "update", "season": 2024}'
```

### Get Team Data
```bash
curl http://localhost:3000/api/admin/update-teams?action=teams&season=2024
```

## Cron Job Setup

### Daily Team Updates
Set up a daily cron job to update team data:

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * curl -X POST http://your-domain.com/api/cron/update-teams \
  -H "Content-Type: application/json" \
  -d '{"action": "update", "season": 2024}'
```

### Vercel Cron Jobs
If using Vercel, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-teams",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## UI Changes

### Removed Features
- ❌ Outdated team rankings (2023 data)
- ❌ Hardcoded team records
- ❌ Static team stats display

### Updated Features
- ✅ Clean team cards without outdated rankings
- ✅ HOME/AWAY badges only
- ✅ Simplified venue display
- ✅ Ready for future database integration

## Migration Steps

### 1. Run Database Migration
```sql
-- Execute create-teams-table.sql in Supabase SQL editor
```

### 2. Initial Team Data Population
```bash
# Run initial team data update
curl -X POST http://localhost:3000/api/admin/update-teams \
  -H "Content-Type: application/json" \
  -d '{"action": "update", "season": 2024}'
```

### 3. Set Up Cron Job
```bash
# Add daily cron job for team updates
```

### 4. Verify Data
```bash
# Check team data in database
curl http://localhost:3000/api/admin/update-teams?action=teams&season=2024
```

## Future Enhancements

### Potential Improvements
1. **Team Rankings**: Add current power rankings from SportsData.io
2. **Team Logos**: Display team logos in UI
3. **Team Colors**: Use team colors in UI components
4. **Historical Data**: Track team performance over time
5. **Advanced Stats**: Include more detailed team statistics

### Integration Points
1. **MatchupBox Component**: Update to use database team data
2. **Team Selection**: Use team data for better team selection UI
3. **Analytics**: Use team data for pool analytics
4. **Notifications**: Team-based notifications and alerts

## Monitoring

### Logs to Watch
- Team update success/failure
- Number of teams updated
- API response times
- Database update results

### Common Issues
1. **API Key Issues**: Invalid or expired SportsData.io API key
2. **Rate Limiting**: Too many requests to SportsData.io
3. **Data Format Changes**: API response structure changes
4. **Database Errors**: Constraint violations or connection issues

## Support

For issues with the team update system:
1. Check application logs for error messages
2. Test the API connection using test endpoints
3. Verify the SportsData.io API key is valid
4. Check database connectivity and permissions
5. Review this documentation for common solutions
