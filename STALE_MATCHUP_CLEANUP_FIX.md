# Stale Matchup Cleanup Fix

## Problem

The `update-game-times` cron job was only creating and updating matchups from the ESPN API, but **never deleting stale matchups** that were no longer in the ESPN response. This meant:

1. If test games were created early (manually or from a different source)
2. And then the real schedule was released via ESPN API
3. The old test games would remain in the database forever
4. Users would see both test games and real games

## Root Cause

The `update-game-times` route (`src/app/api/cron/update-game-times/route.ts`) had two operations:
- ✅ **Create** new matchups from ESPN API if they don't exist
- ✅ **Update** game times for existing matchups
- ❌ **Delete** stale matchups - **MISSING**

## Solution

Added cleanup logic that:

1. **Identifies stale matchups**: Matchups in the current season/week that are NOT in the ESPN API response
2. **Checks for picks**: Before deleting, verifies that no picks reference the matchup via `team_matchup_id` columns
3. **Safely deletes**: Only deletes matchups that:
   - Are in the current season/week
   - Don't have any picks referencing them
   - Are not in the ESPN API response

## Implementation Details

### Team Matchup ID Format
Picks reference matchups via `team_matchup_id` columns in the format: `matchupId_teamName`

Example: `550e8400-e29b-41d4-a716-446655440000_Cowboys`

### Safety Check
Before deleting a stale matchup, the code checks all week columns:
- `pre1_team_matchup_id` through `pre3_team_matchup_id`
- `reg1_team_matchup_id` through `reg18_team_matchup_id`
- `post1_team_matchup_id` through `post4_team_matchup_id`

If any pick has a `team_matchup_id` starting with the matchup's ID (format: `${matchup.id}_%`), the matchup is **not deleted**.

## Code Changes

**File**: `src/app/api/cron/update-game-times/route.ts`

Added cleanup section after game time updates that:
1. Creates a set of valid ESPN matchup keys (including season for uniqueness)
2. Iterates through database matchups for current season/week
3. Identifies matchups not in ESPN response
4. Checks for picks referencing each stale matchup
5. Deletes safe-to-delete matchups
6. Logs all deletions and skips

## Response Changes

The API response now includes:
```json
{
  "success": true,
  "game_times_updated": 5,
  "matchups_created": 2,
  "stale_matchups_deleted": 3,  // NEW
  "deleted_stale_matchups": [   // NEW
    "TeamA @ TeamB (REG1)",
    "TeamC @ TeamD (REG1)"
  ],
  ...
}
```

## Testing

To test the cleanup:

1. **Manually create a test matchup** in the database for the current week
2. **Run the update-game-times cron** (or call the API endpoint)
3. **Verify** the test matchup is deleted (if no picks reference it)

```bash
# Manual test via GET endpoint
curl http://localhost:3000/api/cron/update-game-times

# Or via POST with auth token
curl -X POST http://localhost:3000/api/cron/update-game-times \
  -H "Authorization: Bearer YOUR_CRON_SECRET_TOKEN"
```

## Safety Features

1. **Only deletes for current season/week** - Won't accidentally delete old historical data
2. **Checks for picks before deletion** - Protects against data loss
3. **Logs all operations** - Easy to debug and audit
4. **Continues on errors** - One failed deletion doesn't stop the process

## Future Considerations

- Consider adding a "soft delete" flag instead of hard deletion
- Add admin UI to manually trigger cleanup
- Add metrics/alerting for cleanup operations
- Consider archiving deleted matchups for audit trail
