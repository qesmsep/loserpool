# Season-Agnostic System Documentation

## Overview

The Loser Pool app is now **season-agnostic** and will automatically work for **any NFL season** without requiring code changes or manual configuration.

## How It Works

### 🎯 **Automatic Season Detection**

The system automatically determines:

1. **Season Year**: Based on game dates (August-September = current year, January-February = previous year)
2. **Preseason Cutoff**: Calculated from available games, not hardcoded dates
3. **Current Week**: Dynamically determined based on date and available games

### 📅 **Preseason Cutoff Logic**

The system calculates the preseason cutoff date using this logic:

1. **If both preseason and regular season games exist**:
   - Preseason cutoff = 1 week before the earliest regular season game
   
2. **If only preseason games exist**:
   - Preseason cutoff = 1 week after the latest preseason game
   
3. **If only regular season games exist**:
   - Preseason cutoff = August 26th of the season year (reasonable default)

### 🏈 **Current Week Calculation**

The current week is determined by:

1. **Before Preseason Cutoff**:
   - Current week = Highest preseason week available
   - Season = `PRE{week}` (e.g., `PRE3`)

2. **After Preseason Cutoff**:
   - Current week = Earliest regular season week available
   - Season = `REG{week}` (e.g., `REG1`)

## User Behavior by Type

### 👥 **Active Users**
- **Before Preseason Cutoff**: See regular season week 1 games (if available)
- **After Preseason Cutoff**: See current regular season week games
- **Example**: Always see `REG1`, `REG2`, `REG3`, etc.

### 🧪 **Tester Users**
- **Before Preseason Cutoff**: See current preseason week games
- **After Preseason Cutoff**: See current regular season week games (same as active users)
- **Example**: See `PRE3` during preseason, then `REG1`, `REG2`, etc.

### 🚫 **Registered Users**
- Same behavior as Active users

## Files Updated

### 🔧 **Core Logic Files**
- `src/lib/season-detection.ts` - Main season detection logic
- `src/lib/current-week-calculator.ts` - Dynamic current week calculation
- `src/app/api/cron/auto-advance-week/route.ts` - Auto-advance cron job

### 🎛️ **API Endpoints**
- `src/app/api/admin/calculate-current-week/route.ts` - Admin endpoint for testing

### 📊 **SQL Scripts**
- `fix-current-week-season-agnostic.sql` - Season-agnostic current week fix

## Benefits

### ✅ **Future-Proof**
- No hardcoded dates or years
- Automatically adapts to any NFL season
- No manual configuration required

### ✅ **Intelligent**
- Calculates preseason cutoff based on actual game schedules
- Handles edge cases (only preseason games, only regular season games)
- Graceful fallbacks for missing data

### ✅ **Consistent**
- Same logic across all parts of the system
- Predictable user behavior
- Reliable week progression

## Example Scenarios

### 🏈 **2025 Season (Current)**
- **Preseason Games**: `PRE1`, `PRE2`, `PRE3` (August 2025)
- **Regular Season Games**: `REG1`, `REG2`, `REG3`, etc. (September 2025+)
- **Preseason Cutoff**: ~August 26, 2025 (1 week before first regular season game)
- **Current Week**: `1` (Regular Season Week 1)

### 🏈 **2026 Season (Future)**
- **Preseason Games**: `PRE1`, `PRE2`, `PRE3` (August 2026)
- **Regular Season Games**: `REG1`, `REG2`, `REG3`, etc. (September 2026+)
- **Preseason Cutoff**: ~August 25, 2026 (automatically calculated)
- **Current Week**: Automatically determined

### 🏈 **2027 Season (Future)**
- **Preseason Games**: `PRE1`, `PRE2`, `PRE3` (August 2027)
- **Regular Season Games**: `REG1`, `REG2`, `REG3`, etc. (September 2027+)
- **Preseason Cutoff**: ~August 24, 2027 (automatically calculated)
- **Current Week**: Automatically determined

## Migration Notes

### 🔄 **From Hardcoded System**
- Removed hardcoded `2025-08-26` date
- Replaced with dynamic calculation
- No breaking changes to user experience

### 🧹 **Database Changes**
- `current_week` in `global_settings` now dynamically calculated
- No schema changes required
- Existing data remains compatible

## Testing

### 🧪 **Manual Testing**
```bash
# Test current week calculation
curl "https://your-domain.com/api/admin/calculate-current-week"

# Test season detection
curl "https://your-domain.com/api/current-week-display?userId=your-user-id"
```

### 🔍 **SQL Testing**
```sql
-- Run the season-agnostic fix script
-- Copy and paste fix-current-week-season-agnostic.sql into Supabase SQL editor
```

## Maintenance

### 🔄 **Automatic Updates**
- Current week automatically advances via cron job
- Preseason cutoff automatically calculated each season
- No manual intervention required

### 📊 **Monitoring**
- Check logs for season detection calculations
- Monitor current week progression
- Verify user behavior matches expectations

## Conclusion

The system is now **completely season-agnostic** and will work seamlessly for:
- ✅ 2025 season (current)
- ✅ 2026 season (future)
- ✅ 2027 season (future)
- ✅ Any future NFL season

**No code changes or manual configuration required!** 🚀
