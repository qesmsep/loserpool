# Updated Matchups Process - 10 Steps

## Overview
The matchups process has been enhanced to include season identification (PRE/REG/POST) for better data organization and user experience.

## 1. Data Sourcing (NFL.com Scraping)
- **Enhanced Puppeteer scraper** (`nfl-scraper-enhanced.ts`) directly scrapes `https://www.nfl.com/schedules/YYYY/PRE2`
- **Dynamic URL generation** based on current date:
  - `YYYY` = current year (2025)
  - `PRE` = Preseason (weeks 1-4)
  - `REG` = Regular Season (weeks 1-18)
  - `POST` = Postseason (weeks 1-4, where POST4 = Super Bowl)
- **Real-time extraction** of game data: teams, times, venues, networks, status

## 2. Schedule Caching (Performance Optimization)
- **30-minute cache** (`schedule-cache.ts`) prevents repeated scraping
- **Database storage** in `schedule_cache` table with expiration timestamps
- **Automatic cache invalidation** when data expires

## 3. Automated Updates (Cron Jobs)
- **Twice daily updates** at 6am and 6pm CST via `/api/cron/update-matchups`
- **Authentication required** using `CRON_SECRET_TOKEN`
- **Configurable on/off** via `global_settings.automated_updates_enabled`

## 4. Database Storage (Matchups Table with Season Column)
- **Complete week replacement** - deletes old matchups, inserts new ones
- **Season-based organization** with new `season` column:
  - `PRE2` = Preseason Week 2
  - `REG1` = Regular Season Week 1
  - `POST4` = Super Bowl (Postseason Week 4)
- **Week-based organization** with game times, team names, scores, status
- **Real-time status tracking** (scheduled → live → final)

### SQL Script: `add-season-column-to-matchups.sql`
```sql
-- Add season column to matchups table
ALTER TABLE public.matchups 
ADD COLUMN IF NOT EXISTS season TEXT;

-- Add constraints and indexes
CREATE INDEX IF NOT EXISTS idx_matchups_season ON public.matchups(season);
ALTER TABLE public.matchups 
ADD CONSTRAINT check_season_format 
CHECK (season ~ '^(PRE|REG|POST)\d+$');
ALTER TABLE public.matchups 
ADD CONSTRAINT unique_matchup_season_teams 
UNIQUE (season, away_team, home_team);
```

## 5. User Interface Loading (Picks Page)
- **Current week detection** from `global_settings.current_week`
- **Matchups query** filtered by week, ordered by game time
- **Season display** showing "Preseason Week 2" or "Week 1" format
- **User picks retrieval** for current week with pick counts

## 6. Deadline Calculation (Timezone Handling)
- **Dynamic deadline calculation** based on earliest game time
- **Thursday Night Football** special handling for early deadlines
- **User timezone conversion** for accurate deadline display

## 7. Pick Management (Interactive UI)
- **Add/remove picks** with +/- buttons on each team
- **Pick count tracking** against user's purchased picks
- **Deadline enforcement** - prevents changes after cutoff

## 8. Visual Display (Matchup Box Component)
- **Team color theming** using `getTeamColors()` function
- **Thursday Night Football badges** for TNF games
- **Season display** showing current season type and week
- **Pick count display** showing user's allocation per team
- **Responsive design** for mobile and desktop

## 9. Real-time Updates (Status Changes)
- **Game status progression** from scheduled → live → final
- **Score updates** as games progress
- **Pick status changes** (active → eliminated → safe)

## 10. Error Handling & Monitoring
- **Comprehensive error logging** throughout the process
- **Email notifications** for update failures
- **Fallback mechanisms** when scraping fails
- **Manual update capability** via admin interface

## Technical Implementation Details

### Season Column Format
- **PRE1-PRE4**: Preseason weeks 1-4
- **REG1-REG18**: Regular season weeks 1-18
- **POST1-POST4**: Postseason weeks 1-4 (POST4 = Super Bowl)

### Updated Scraper Methods
```typescript
// Enhanced convertToMatchupFormat with season support
static convertToMatchupFormat(game: NFLGame, weekNumber: number, seasonType: string): any {
  let season: string
  if (seasonType === 'PRE') {
    season = `PRE${weekNumber}`
  } else if (seasonType === 'REG') {
    season = `REG${weekNumber}`
  } else if (seasonType === 'POST') {
    season = `POST${weekNumber}`
  }
  
  return {
    week: weekNumber.toString(),
    season: season,
    away_team: game.away_team,
    home_team: game.home_team,
    // ... other fields
  }
}
```

### Database Queries
```sql
-- Query by season
SELECT * FROM matchups WHERE season = 'PRE2';
SELECT * FROM matchups WHERE season = 'REG1';
SELECT * FROM matchups WHERE season = 'POST4';

-- Query with week and season
SELECT * FROM matchups WHERE week = 1 AND season LIKE 'REG%';
```

## Benefits of Season Column
1. **Clear identification** of preseason vs regular season vs postseason
2. **Better data organization** for historical analysis
3. **Improved user experience** with season-specific displays
4. **Enhanced admin capabilities** for season-specific management
5. **Future-proofing** for multi-season support

## System Verification
The system functions exactly as described:
- ✅ **Data flows** from NFL.com → cache → database → UI
- ✅ **Season information** properly captured and stored
- ✅ **Automated updates** run on schedule with proper authentication
- ✅ **User interface** displays real-time data with season context
- ✅ **Error handling** includes notifications and fallbacks
- ✅ **Performance optimization** via caching prevents excessive scraping

The matchups process is **production-ready** with robust error handling, performance optimization, season-aware data organization, and user-friendly interface.
