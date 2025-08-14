# Wide Pick System Summary

## Overview
The new wide pick system tracks each pick's journey through every possible week using individual columns for each week/season. This provides a clear, structured way to see where each pick has been allocated throughout the season.

## Database Schema

### Picks Table Structure
Each pick record now has individual columns for every possible week:

**Preseason (3 weeks):**
- `pre1_team_matchup_id` - UUID for PRE1 week allocation
- `pre2_team_matchup_id` - UUID for PRE2 week allocation  
- `pre3_team_matchup_id` - UUID for PRE3 week allocation

**Regular Season (18 weeks):**
- `reg1_team_matchup_id` through `reg18_team_matchup_id` - UUIDs for each regular season week

**Postseason (4 weeks):**
- `post1_team_matchup_id` through `post4_team_matchup_id` - UUIDs for each postseason week

### Team-Matchup ID Generation
Each `team_matchup_id` is a deterministic UUID generated from:
```sql
md5(matchup_id::text || team_name)::uuid
```

This ensures each team-in-matchup combination has a unique, consistent identifier.

## Pick Lifecycle

### 1. Pick Creation
- User purchases picks (free or paid)
- Picks are created with `matchup_id = NULL`, `status = 'pending'`
- All week columns start as `NULL`

### 2. Pick Allocation
When user clicks a team and allocates picks:
- System finds available picks (`matchup_id IS NULL`)
- Updates `matchup_id`, `team_picked`, `status = 'active'`
- Generates `team_matchup_id` and stores in appropriate week column
- **Game lock check**: Prevents allocation if game has already started

### 3. Game Lock
- Once `game_time < NOW()`, picks for that matchup become locked
- No further allocations or changes allowed for that game

### 4. Status Updates
After each week's games are final:
- **WIN** (picked team lost): `status = 'active'` - pick survives
- **LOSS** (picked team won): `status = 'lost'` - pick eliminated
- **PENDING**: `status = 'pending'` for unallocated picks

## Key Functions

### `assign_pick_to_week(pick_id, week_column, matchup_id, team_picked)`
- Assigns a pick to a specific week column
- Generates and stores the `team_matchup_id`

### `update_pick_statuses_after_week(week_number)`
- Updates all pick statuses after games are final
- Determines wins/losses and updates accordingly

### `get_user_picks_with_status(user_id)`
- Returns all picks for a user with current status
- Shows which week each pick is currently in

### `is_game_locked(matchup_id)`
- Checks if a game has started (picks are locked)

## API Changes

### `/api/picks/allocate`
- Now updates existing picks instead of creating new ones
- Assigns picks to specific week columns
- Includes game lock validation
- Uses `assign_pick_to_week` function

## Benefits

1. **Clear Tracking**: Each pick's journey is visible in a single record
2. **Week-by-Week History**: Easy to see where picks were allocated
3. **Performance**: No need for complex joins to track pick history
4. **Locking**: Automatic game lock prevents late allocations
5. **Status Management**: Clear status transitions (pending → active → lost)
6. **Future-Proof**: UUID system ensures unique team-matchup combinations

## Example Pick Journey

**Pick "Cowboys Fan"**:
- Week 1: `reg1_team_matchup_id = md5(week1_matchup_id + 'Cowboys')`
- Week 2: `reg2_team_matchup_id = md5(week2_matchup_id + 'Cowboys')`  
- Week 3: `reg3_team_matchup_id = md5(week3_matchup_id + 'Eagles')`
- Week 4: `reg4_team_matchup_id = NULL` (pick lost in Week 3)

This shows the pick survived Weeks 1-2 with Cowboys, switched to Eagles in Week 3, then was eliminated.

## Migration Files

1. `add-week-columns-to-picks.sql` - Adds all week columns and functions
2. `update-pick-statuses-after-games.sql` - Status update functions
3. `fix-all-purchase-apis.sql` - Ensures purchase APIs work with new system

## Testing

Use `test-wide-pick-system.sql` to verify the system works correctly and understand the data flow.
