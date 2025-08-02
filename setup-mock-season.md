# Mock Season Setup Instructions

## Overview
This creates a mock NFL season using 2023 actual game data for the first 3 weeks, with the season starting on Monday, August 4, 2025, and picks due by 11:59 PM CST on August 3, 2025.

## Setup Steps

### 1. Run the SQL Script
Execute the `mock-season-data.sql` file in your Supabase SQL editor:

```sql
-- Copy and paste the contents of mock-season-data.sql into your Supabase SQL editor
-- This will create:
-- - 48 matchups (16 games per week for 3 weeks)
-- - Global settings for season dates
-- - Current week tracking
```

### 2. Verify the Data
After running the SQL, you can verify the setup by checking:

```sql
-- Check matchups were created
SELECT COUNT(*) as total_matchups FROM matchups;

-- Check global settings
SELECT * FROM global_settings WHERE key IN ('current_week', 'week1_picks_deadline', 'season_start_date');

-- Check Week 1 games
SELECT * FROM matchups WHERE week = 1 ORDER BY game_time;
```

### 3. Season Timeline
- **Season Start**: Monday, August 4, 2025
- **Picks Deadline**: Sunday, August 3, 2025 at 11:59 PM CST
- **Week 1 Games**: August 7-12, 2025
- **Week 2 Games**: August 14-18, 2025  
- **Week 3 Games**: August 21-25, 2025

### 4. Features Enabled
- ✅ Dynamic current week detection
- ✅ Deadline countdown on dashboard
- ✅ Deadline enforcement on picks page
- ✅ Real NFL team matchups
- ✅ Proper game scheduling

### 5. Testing the Season
1. **Purchase Picks**: Users can buy picks for $21 each (max 10 per purchase)
2. **Make Picks**: Users can allocate picks to teams they think will lose
3. **Deadline Enforcement**: Picks lock at the deadline
4. **Admin Management**: Admins can update results and manage the season

## Game Schedule Summary

### Week 1 (August 7-12, 2025)
- **Thursday Night**: Detroit Lions @ Kansas City Chiefs
- **Sunday Games**: 15 games across various time slots
- **Monday Night**: Buffalo Bills @ New York Jets

### Week 2 (August 14-18, 2025)  
- **Thursday Night**: Minnesota Vikings @ Philadelphia Eagles
- **Sunday Games**: 15 games across various time slots
- **Monday Night**: Cleveland Browns @ Pittsburgh Steelers

### Week 3 (August 21-25, 2025)
- **Thursday Night**: New York Giants @ San Francisco 49ers
- **Sunday Games**: 15 games across various time slots
- **Monday Night**: Los Angeles Rams @ Cincinnati Bengals

## Next Steps
1. Run the SQL script in Supabase
2. Test the purchase flow with the new $21 pricing
3. Test the picks system with the deadline
4. Use admin panel to manage results
5. Test the leaderboard and results pages

The mock season is now ready for testing with realistic NFL data and proper deadline enforcement! 