# Default Picks Setup Guide

## Overview
The app now automatically assigns default picks to users who haven't made their picks before TNF kickoff. Default picks are assigned to the team with the largest spread (most favored to win).

## Features
- ✅ **Smart Assignment**: Only assigns to users who haven't made picks for current week
- ✅ **Largest Spread Logic**: Picks the team with the biggest spread (most favored)
- ✅ **Admin Control**: Manual trigger via admin panel
- ✅ **Preview Mode**: See what would be assigned before executing
- ✅ **Logging**: Detailed logs of all assignments

## Database Setup

### 1. Update Matchups Table
Run this SQL to add spread columns:
```sql
ALTER TABLE matchups 
ADD COLUMN away_spread DECIMAL(4,1) DEFAULT 0,
ADD COLUMN home_spread DECIMAL(4,1) DEFAULT 0;
```

### 2. Create Functions
Run the `assign-default-picks.sql` file in your Supabase SQL editor:
```sql
-- This creates the assign_default_picks() and get_largest_spread_matchup() functions
```

## How It Works

### Spread Logic
- **Positive spread** = Team is favored (e.g., +7.5 means team is favored by 7.5 points)
- **Negative spread** = Team is underdog (e.g., -7.5 means team is underdog by 7.5 points)
- **Largest spread** = Team with the highest positive spread (most favored to win)

### Assignment Process
1. **Find users** who have purchased picks but haven't made picks for current week
2. **Calculate available picks** for each user
3. **Find matchup** with largest spread that user hasn't picked yet
4. **Assign picks** to the favored team in that matchup
5. **Log assignment** with details

## Admin Usage

### Manual Assignment
1. Go to Admin → Results
2. Click "Assign Default Picks" button
3. System will assign picks to all eligible users
4. Check logs for assignment details

### Preview Mode
1. Go to Admin → Results
2. Click "Preview Default Picks" button
3. See which users would get picks and which matchup would be used
4. No actual assignment is made

### API Endpoints
- **POST** `/api/admin/assign-default-picks` - Execute assignment
- **GET** `/api/admin/assign-default-picks` - Preview assignment

## Example Scenarios

### Week 1 Example
- **Largest Spread**: Chiefs (-6.5) vs Lions (+6.5)
- **Default Pick**: Chiefs (most favored team)
- **Logic**: Chiefs are 6.5-point favorites, largest spread of the week

### Week 3 Example
- **Largest Spread**: Chiefs (-12.5) vs Bears (+12.5)
- **Default Pick**: Chiefs (most favored team)
- **Logic**: Chiefs are 12.5-point favorites, largest spread of the week

## Testing

### 1. Set Up Test Data
```sql
-- Add spreads to existing matchups
UPDATE matchups SET away_spread = 6.5, home_spread = -6.5 WHERE id = 'week1-game1';
UPDATE matchups SET away_spread = 9.5, home_spread = -9.5 WHERE id = 'week1-game3';
```

### 2. Test Assignment
1. Create test users with purchased picks
2. Don't make picks for current week
3. Run assignment via admin panel
4. Check that picks were assigned to largest spread team

### 3. Verify Logic
```sql
-- Check largest spread matchup
SELECT * FROM get_largest_spread_matchup(1);

-- Check users needing picks
SELECT u.email, COUNT(p.id) as picks_made
FROM users u
LEFT JOIN picks p ON u.id = p.user_id AND p.week = 1
GROUP BY u.id, u.email
HAVING COUNT(p.id) = 0;
```

## Integration Points

### TNF Kickoff Automation
- Can be triggered automatically when TNF starts
- Add to existing game status update logic
- Integrate with score update process

### Email Notifications
- Send notification to users when default picks are assigned
- Include which team they were assigned and why
- Provide option to change picks if game hasn't started

## Monitoring

### Logs to Watch
- Assignment success/failure
- Number of users affected
- Which matchup was used
- Spread values for verification

### Common Issues
1. **No spreads set**: Add spread data to matchups
2. **No eligible users**: Check if users have purchased picks
3. **All games started**: Only assigns to future games
4. **Function errors**: Check SQL function syntax

## Customization

### Spread Sources
- Manual entry in admin panel
- API integration with sports data providers
- Automated updates from betting lines

### Assignment Rules
- Modify function to use different logic
- Add multiple matchup selection
- Include team strength ratings
- Consider user preferences

### Timing
- Automatic at TNF kickoff
- Manual admin trigger
- Scheduled cron job
- Real-time during game updates 