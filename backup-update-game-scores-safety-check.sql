-- BACKUP: Safety Check Code from update-game-scores/route.ts
-- This is the code that was removed to fix the pick count fluctuation issue
-- Date: 2025-01-21
-- Issue: Safety check was causing picks to be skipped every 5 minutes, creating fluctuation

-- The safety check code that was removed:
/*
      // Safety check: Don't update if the pick was updated very recently (within last 5 minutes)
      // This prevents overriding manual fixes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      if (pick.updated_at && pick.updated_at > fiveMinutesAgo) {
        console.log(`Skipping pick ${pick.id} - was updated recently (${pick.updated_at}), likely a manual fix`)
        continue
      }
*/

-- Why this was causing problems:
-- 1. Cron job runs every 5 minutes
-- 2. Safety check skips picks updated in last 5 minutes
-- 3. This created a pattern where picks were processed, then skipped, then processed again
-- 4. Result: Pick counts fluctuated between different values (e.g., 883 vs 1052 for Miami)

-- The fix: Remove the safety check entirely
-- Rationale: The cron job should be idempotent (safe to run multiple times)
-- If manual fixes are needed, they should be done through proper admin interfaces
