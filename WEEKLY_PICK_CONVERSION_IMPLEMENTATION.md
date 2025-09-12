# Weekly Pick Conversion Implementation

## Overview

This implementation adds the logic to convert "safe" picks to "pending" status at the end of each week (typically Monday night after the last game ends), and ensures picks are set to "active" when users make selections.

## Status Flow

### New Status Flow:
1. **Purchase**: Picks are created with `status = 'pending'` (waiting for user selection)
2. **User Selection**: When user makes a pick, status changes to `status = 'active'`
3. **End of Week**: "Safe" picks convert to `status = 'pending'` (waiting for next week's pick)
4. **Next Week**: User makes new pick, status changes to `status = 'active'`

### Status Definitions:
- **`pending`**: Pick is waiting to be used (either newly purchased or converted from safe)
- **`active`**: Pick is currently in play for the current week
- **`safe`**: Pick survived the week and will be converted to pending
- **`eliminated`**: Pick was eliminated (user picked a winning team)

## Database Changes

### 1. Updated Status Constraint
```sql
-- Updated picks table to include 'pending' status
ALTER TABLE public.picks 
DROP CONSTRAINT IF EXISTS picks_status_check;

ALTER TABLE public.picks 
ADD CONSTRAINT picks_status_check 
CHECK (status IN ('active', 'eliminated', 'safe', 'pending'));
```

### 2. New Functions

#### `convert_safe_picks_to_pending()`
- Converts all 'safe' picks to 'pending' status
- Returns count of converted picks
- Used at end of each week

#### `get_week_end_time(p_week INTEGER)`
- Calculates when a week ends (last game + 4 hours)
- Returns timestamp for week end

#### `is_week_ended(p_week INTEGER)`
- Checks if current time is past week end time
- Returns boolean

#### `auto_convert_safe_picks_for_week(p_week INTEGER)`
- Automatically converts safe picks when week ends
- Returns count of converted picks

#### `admin_convert_safe_to_pending()`
- Admin function to manually trigger conversion
- Returns JSON with conversion details

#### `get_picks_ready_for_conversion()`
- Returns all picks with 'safe' status
- Used for monitoring and admin interface

## API Changes

### New Endpoint: `/api/admin/convert-safe-picks`

#### POST
- Triggers safe-to-pending conversion
- Admin only access
- Returns conversion results

#### GET
- Shows picks ready for conversion
- Shows current status distribution
- Admin only access

## Frontend Changes

### Admin Page Updates
- **Active Picks Card**: Now shows breakdown of all statuses (active, pending, safe, eliminated)
- **Weekly Conversion Button**: New admin action to trigger conversion
- **Status Counts**: Real-time display of pick status distribution

### Admin Stats Modal Updates
- **New Tabs**: Added "Safe Picks" and "Pending Picks" tabs
- **Detailed Views**: Shows all pick statuses with detailed information
- **Status Breakdown**: Complete overview of pick lifecycle

## Pick Creation Logic

### Existing Logic (Already Correct)
- **Stripe Webhook**: Creates picks with `status = 'pending'` ✅
- **Free Purchase**: Creates picks with `status = 'pending'` ✅
- **Pick Allocation**: Sets `status = 'active'` when user makes selection ✅

## Usage Instructions

### For Admins

1. **Monitor Status**: Use the admin page to see current pick status distribution
2. **Weekly Conversion**: Click "Weekly Conversion" button at end of each week
3. **View Details**: Use the stats modal to see detailed pick information

### For Users

1. **Purchase Picks**: Picks start as 'pending' (waiting for selection)
2. **Make Selection**: Pick becomes 'active' for current week
3. **End of Week**: If pick survives, it becomes 'safe'
4. **Next Week**: 'Safe' picks become 'pending' and ready for new selection

## Testing

### Test Script
Run `test-weekly-conversion.sql` to test the implementation:

```sql
-- Test current status distribution
-- Test conversion functions
-- Test admin functions
-- Test week end calculations
```

### Manual Testing
1. Create test picks with different statuses
2. Run conversion function
3. Verify status changes
4. Test admin interface

## Files Modified

### Database
- `implement-weekly-pick-conversion.sql` - New database functions
- `test-weekly-conversion.sql` - Test script

### API
- `src/app/api/admin/convert-safe-picks/route.ts` - New admin endpoint

### Frontend
- `src/app/admin/page.tsx` - Updated admin interface
- `src/components/admin-stats-modal.tsx` - Enhanced stats modal

### Documentation
- `WEEKLY_PICK_CONVERSION_IMPLEMENTATION.md` - This file

## Benefits

1. **Clear Status Flow**: Users understand pick lifecycle
2. **Weekly Automation**: Admins can easily convert picks at week end
3. **Better Monitoring**: Real-time status tracking
4. **User Experience**: Picks are ready for next week automatically
5. **Admin Control**: Manual override capability for edge cases

## Future Enhancements

1. **Automatic Scheduling**: Cron job to auto-convert at week end
2. **Email Notifications**: Notify users when picks are ready
3. **Status History**: Track status changes over time
4. **Bulk Operations**: Convert picks for specific users/weeks

