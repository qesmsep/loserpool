import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { espnService, ESPNGame } from '@/lib/espn-service'
import { getCurrentSeasonInfo } from '@/lib/season-detection'

/**
 * Cron job to update game times from ESPN API and create missing matchups
 * This job:
 * 1. Creates matchups from ESPN API if they don't exist in the database
 * 2. Updates the game_time field for existing matchups to stay in sync with ESPN's schedule
 * 
 * DOUBLE VERIFICATION SYSTEM:
 * To prevent updating the wrong matchup when teams play twice in a season,
 * this job requires BOTH of the following to match:
 * 1. Team names (away_team and home_team)
 * 2. Week number (must match between DB and ESPN)
 * 3. Game date (YYYY-MM-DD must match between DB and ESPN)
 * 
 * Only if all three match will the game_time be updated.
 * 
 * Schedule: Every 6 hours (runs at 00:00, 06:00, 12:00, 18:00 UTC)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify cron secret token
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting game time update cron job...')
    
    const supabase = createServiceRoleClient()
    
    // Determine current season/week using season detection (authoritative)
    const seasonInfo = await getCurrentSeasonInfo()
    const currentWeek = seasonInfo.currentWeek
    const currentYear = String(seasonInfo.seasonYear)
    
    // Determine season type - check all types to handle playoffs
    let seasonType = 'REG'
    if (seasonInfo.isPreseason) {
      seasonType = 'PRE'
    } else if (seasonInfo.isPostseason) {
      seasonType = 'POST'
    }
    
    console.log(`Season detection → ${seasonType}${currentWeek}, year=${currentYear}, seasonDisplay=${seasonInfo.seasonDisplay}`)

    // Get ESPN games for current week - try all season types to catch any games
    // For playoffs, also check weeks 1-4 since ESPN uses week 1-4 for playoffs
    const allEspnGames: ESPNGame[] = []
    const seasonTypes = ['PRE', 'REG', 'POST']
    
    for (const st of seasonTypes) {
      // For POST season, check weeks 1-4 (playoff weeks)
      // For other seasons, use the detected current week
      const weeksToCheck = st === 'POST' ? [1, 2, 3, 4] : [currentWeek]
      
      for (const weekToCheck of weeksToCheck) {
        try {
          const games = await espnService.getNFLSchedule(parseInt(currentYear), weekToCheck, st)
          if (games.length > 0) {
            allEspnGames.push(...games)
            console.log(`Found ${games.length} ${st} games for week ${weekToCheck}`)
          }
        } catch (error) {
          console.log(`No ${st} games found for week ${weekToCheck}:`, error instanceof Error ? error.message : 'Unknown error')
        }
      }
    }
    
    if (allEspnGames.length === 0) {
      console.log(`No games found from ESPN API for any season type`)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch ESPN games',
        details: 'No games found for any season type'
      }, { status: 500 })
    }
    
    if (allEspnGames.length === 0) {
      console.log(`No games found from ESPN API`)
      return NextResponse.json({ 
        success: true, 
        message: `No games found from ESPN API`,
        game_times_updated: 0 
      })
    }
    
    console.log(`Found ${allEspnGames.length} total games from ESPN API`)

    // Get matchups for current week from our database (for game time updates)
    const { data: matchupsData, error: fetchError } = await supabase
      .from('matchups')
      .select('id, away_team, home_team, game_time, season, week')
      .eq('season', seasonInfo.seasonDisplay)
      .order('game_time', { ascending: true })
    
    let matchups = matchupsData

    if (fetchError) {
      console.error('Error fetching matchups:', fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    console.log(`Database matchups for ${seasonInfo.seasonDisplay}: ${matchups?.length || 0}`)

    let matchupsCreated = 0
    const errors: string[] = []

    // Create a set of existing matchup keys for quick lookup
    // Check ALL matchups (not just current season) to avoid duplicates
    const { data: allExistingMatchups } = await supabase
      .from('matchups')
      .select('away_team, home_team, season')
    
    const existingMatchupKeys = new Set<string>()
    if (allExistingMatchups && allExistingMatchups.length > 0) {
      allExistingMatchups.forEach((m: { away_team: string; home_team: string; season: string }) => {
        const key = `${m.away_team}-${m.home_team}-${m.season}`
        existingMatchupKeys.add(key)
      })
      console.log(`Found ${allExistingMatchups.length} total existing matchups in database`)
    }

    // Only create NEW matchups that don't already exist
    if (allEspnGames.length > 0) {
      console.log(`Checking ${allEspnGames.length} ESPN games for new matchups to create...`)
      
      for (const espnGame of allEspnGames) {
        try {
          const convertedGame = espnService.convertToMatchupFormat(espnGame)
          
          if (!convertedGame) {
            console.log(`Could not convert ESPN game: ${espnGame.id}`)
            continue
          }

          // Determine season and week from ESPN game first
          const espnWeek = espnGame.week?.number || currentWeek
          const espnSeasonType = espnGame.season?.type
          let dbWeek = currentWeek
          let seasonDisplay = seasonInfo.seasonDisplay
          
          // ESPN season types: 1 = Preseason, 2 = Regular Season, 3 = Postseason
          if (espnSeasonType === 3) {
            // This is a playoff game - ESPN uses weeks 1-4 for playoffs
            seasonDisplay = `POST${espnWeek}`
            dbWeek = 18 + espnWeek // POST1 → 19, POST2 → 20, POST3 → 21, POST4 → 22
            console.log(`Detected playoff game: ${convertedGame.away_team} @ ${convertedGame.home_team} - ESPN week ${espnWeek} → DB week ${dbWeek}, season ${seasonDisplay}`)
          } else if (espnSeasonType === 1) {
            // Preseason
            seasonDisplay = `PRE${espnWeek}`
            dbWeek = espnWeek
          } else {
            // Regular season (type 2 or default)
            seasonDisplay = `REG${espnWeek}`
            dbWeek = espnWeek
          }

          // Check if this matchup already exists (with season to avoid false matches)
          const matchupKey = `${convertedGame.away_team}-${convertedGame.home_team}-${seasonDisplay}`
          if (existingMatchupKeys.has(matchupKey)) {
            console.log(`⏭️  Matchup already exists: ${convertedGame.away_team} @ ${convertedGame.home_team} (${seasonDisplay}) - skipping`)
            continue
          }

          // This is a new matchup - create it (seasonDisplay and dbWeek already determined above)
          const insertData = {
            week: dbWeek,
            season: seasonDisplay,
            away_team: convertedGame.away_team as string,
            home_team: convertedGame.home_team as string,
            game_time: convertedGame.game_time as string,
            status: (convertedGame.status as string) || 'scheduled',
            away_score: convertedGame.away_score as number | null,
            home_score: convertedGame.home_score as number | null,
            venue: convertedGame.venue as string | null,
            away_spread: convertedGame.away_spread as number | null,
            home_spread: convertedGame.home_spread as number | null
          }

          const { error: insertError } = await supabase
            .from('matchups')
            .insert(insertData)

          if (insertError) {
            const errorMsg = `Error creating matchup ${convertedGame.away_team} @ ${convertedGame.home_team}: ${insertError.message}`
            console.error(`❌ ${errorMsg}`)
            errors.push(errorMsg)
          } else {
            matchupsCreated++
            console.log(`✅ Created new matchup: ${convertedGame.away_team} @ ${convertedGame.home_team} (${seasonInfo.seasonDisplay})`)
            // Add to existing set to avoid duplicates in same run
            existingMatchupKeys.add(matchupKey)
          }
        } catch (error) {
          const errorMsg = `Error processing ESPN game ${espnGame.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(`❌ ${errorMsg}`)
          errors.push(errorMsg)
        }
      }

      if (matchupsCreated > 0) {
        console.log(`✅ Created ${matchupsCreated} new matchups for ${seasonInfo.seasonDisplay}`)
      } else {
        console.log(`ℹ️  No new matchups to create - all ESPN games already exist in database`)
      }
    } else {
      console.log('No ESPN games available to create matchups')
    }

    // Re-fetch matchups after creating new ones (for game time updates below)
    if (matchupsCreated > 0) {
      const { data: newMatchups, error: refetchError } = await supabase
        .from('matchups')
        .select('id, away_team, home_team, game_time, season, week')
        .eq('season', seasonInfo.seasonDisplay)
        .order('game_time', { ascending: true })

      if (!refetchError && newMatchups) {
        matchups = newMatchups
      }
    }

    console.log(`Found ${matchups?.length || 0} matchups in DB and ${allEspnGames.length} ESPN games for ${seasonInfo.seasonDisplay}`)

    let gameTimesUpdated = 0
    // errors array already declared above
    const updatedMatchups: string[] = []

    // Create a map of ESPN games by team matchup for easy lookup
    // Key format: "away_team-home_team" for team matching
    // We'll also store week number and game date for double verification
    const espnGameMap = new Map<string, { 
      game_time: string
      name: string
      week: number
      game_date: string // YYYY-MM-DD format for date comparison
    }>()
    allEspnGames.forEach(game => {
      const convertedGame = espnService.convertToMatchupFormat(game)
      if (convertedGame) {
        const key = `${convertedGame.away_team}-${convertedGame.home_team}`
        const gameTime = convertedGame.game_time as string
        // Extract date from game_time (format: 2026-01-03T21:30Z)
        const gameDate = gameTime.split('T')[0] // Get YYYY-MM-DD part
        
        espnGameMap.set(key, {
          game_time: gameTime,
          name: `${convertedGame.away_team} @ ${convertedGame.home_team}`,
          week: game.week?.number || currentWeek,
          game_date: gameDate
        })
      }
    })
    
    console.log(`ESPN game keys: ${Array.from(espnGameMap.keys()).join(', ')}`)

    // For each matchup in our database, find corresponding ESPN game and update game_time
    if (!matchups || matchups.length === 0) {
      console.log('No matchups found in database to update')
      return NextResponse.json({
        success: true,
        message: 'No matchups found to update',
        game_times_updated: 0,
        matchups_created: matchupsCreated
      })
    }

    for (const matchup of matchups) {
      try {
        const gameKey = `${matchup.away_team}-${matchup.home_team}`
        const espnGame = espnGameMap.get(gameKey)

        if (!espnGame) {
          console.log(`⚠️ No ESPN game found for: ${matchup.away_team} @ ${matchup.home_team}`)
          continue
        }
        
        // DOUBLE VERIFICATION: Check week number (required) and game date (warning if mismatch)
        // Week match is required to prevent updating wrong matchup when teams play twice
        // Date mismatch is logged but we still update (ESPN is source of truth for dates)
        // For playoffs: ESPN week 1-4 maps to DB week 19-22
        let expectedDbWeek = espnGame.week
        if (matchup.season && matchup.season.startsWith('POST')) {
          // This is a playoff matchup, ESPN week 1-4 should match DB week 19-22
          expectedDbWeek = 18 + espnGame.week // POST1 (ESPN week 1) → DB week 19
        }
        const weekMatch = expectedDbWeek === matchup.week
        const currentGameDate = matchup.game_time.split('T')[0] // Extract YYYY-MM-DD
        const dateMatch = currentGameDate === espnGame.game_date
        
        if (!weekMatch) {
          console.log(`⚠️ Week mismatch for ${espnGame.name}: DB week=${matchup.week}, ESPN week=${espnGame.week} (expected DB week=${expectedDbWeek}) - SKIPPING`)
          errors.push(`Week mismatch for ${espnGame.name}: DB week ${matchup.week} vs ESPN week ${espnGame.week}`)
          continue
        }
        
        // Week matches - proceed with update
        if (!dateMatch) {
          // Date mismatch is a warning but we still update (ESPN date is authoritative)
          console.log(`⚠️ Date mismatch for ${espnGame.name}: DB date=${currentGameDate}, ESPN date=${espnGame.game_date} - UPDATING ANYWAY (ESPN is source of truth)`)
          // Don't add to errors, just log as warning
        } else {
          console.log(`✓ Double verification passed for ${espnGame.name}: Week ${matchup.week} ✓, Date ${currentGameDate} ✓`)
        }
        
        // Check if game_time needs updating
        const currentGameTime = matchup.game_time
        const newGameTime = espnGame.game_time
        
        // Compare times (normalize for comparison)
        const currentTime = new Date(currentGameTime).getTime()
        const newTime = new Date(newGameTime).getTime()
        const timeDifference = Math.abs(currentTime - newTime)
        
        // Update if times differ by more than 1 minute (to account for minor formatting differences)
        if (timeDifference > 60000) {
          const { error: updateError } = await supabase
            .from('matchups')
            .update({ 
              game_time: newGameTime,
              updated_at: new Date().toISOString()
            })
            .eq('id', matchup.id)

          if (updateError) {
            const errorMsg = `Failed to update game_time for ${espnGame.name}: ${updateError.message}`
            console.error(`❌ ${errorMsg}`)
            errors.push(errorMsg)
          } else {
            gameTimesUpdated++
            updatedMatchups.push(espnGame.name)
            console.log(`✅ Updated game_time for: ${espnGame.name} (Week ${matchup.week}, Date ${currentGameDate})`)
            console.log(`   Old: ${currentGameTime}`)
            console.log(`   New: ${newGameTime}`)
          }
        } else {
          console.log(`✓ Game time already correct for: ${espnGame.name} (Week ${matchup.week}, Date ${currentGameDate})`)
        }

      } catch (error) {
        const errorMsg = `Error processing matchup ${matchup.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    // Cleanup: Delete stale matchups that are no longer in ESPN API response
    // Only delete matchups that:
    // 1. Are in the current season/week
    // 2. Don't have any picks referencing them
    // 3. Are not in the ESPN API response
    let staleMatchupsDeleted = 0
    const staleMatchupIds: string[] = []

    if (matchups && matchups.length > 0) {
      // Create a set of valid ESPN matchup keys (including season for uniqueness)
      const validEspnMatchupKeys = new Set<string>()
      allEspnGames.forEach(game => {
        const convertedGame = espnService.convertToMatchupFormat(game)
        if (convertedGame) {
          const espnWeek = game.week?.number || currentWeek
          const espnSeasonType = game.season?.type
          let seasonDisplay = seasonInfo.seasonDisplay
          
          if (espnSeasonType === 3) {
            seasonDisplay = `POST${espnWeek}`
          } else if (espnSeasonType === 1) {
            seasonDisplay = `PRE${espnWeek}`
          } else {
            seasonDisplay = `REG${espnWeek}`
          }
          
          const key = `${convertedGame.away_team}-${convertedGame.home_team}-${seasonDisplay}`
          validEspnMatchupKeys.add(key)
        }
      })

      // Find matchups in DB that aren't in ESPN response
      for (const matchup of matchups) {
        const matchupKey = `${matchup.away_team}-${matchup.home_team}-${matchup.season}`
        
        if (!validEspnMatchupKeys.has(matchupKey)) {
          // This matchup is not in ESPN response - check if it's safe to delete
          // Check if any picks reference this matchup via team_matchup_id columns
          // team_matchup_id format is: "matchup_id_team_name", so we check if matchup.id is at the start
          const { data: picksWithMatchup, error: picksError } = await supabase
            .from('picks')
            .select('id')
            .or(`pre1_team_matchup_id.like.${matchup.id}_%,pre2_team_matchup_id.like.${matchup.id}_%,pre3_team_matchup_id.like.${matchup.id}_%,reg1_team_matchup_id.like.${matchup.id}_%,reg2_team_matchup_id.like.${matchup.id}_%,reg3_team_matchup_id.like.${matchup.id}_%,reg4_team_matchup_id.like.${matchup.id}_%,reg5_team_matchup_id.like.${matchup.id}_%,reg6_team_matchup_id.like.${matchup.id}_%,reg7_team_matchup_id.like.${matchup.id}_%,reg8_team_matchup_id.like.${matchup.id}_%,reg9_team_matchup_id.like.${matchup.id}_%,reg10_team_matchup_id.like.${matchup.id}_%,reg11_team_matchup_id.like.${matchup.id}_%,reg12_team_matchup_id.like.${matchup.id}_%,reg13_team_matchup_id.like.${matchup.id}_%,reg14_team_matchup_id.like.${matchup.id}_%,reg15_team_matchup_id.like.${matchup.id}_%,reg16_team_matchup_id.like.${matchup.id}_%,reg17_team_matchup_id.like.${matchup.id}_%,reg18_team_matchup_id.like.${matchup.id}_%,post1_team_matchup_id.like.${matchup.id}_%,post2_team_matchup_id.like.${matchup.id}_%,post3_team_matchup_id.like.${matchup.id}_%,post4_team_matchup_id.like.${matchup.id}_%`)
            .limit(1)

          if (picksError) {
            console.error(`Error checking picks for matchup ${matchup.id}:`, picksError)
            errors.push(`Error checking picks for stale matchup ${matchup.away_team} @ ${matchup.home_team}: ${picksError.message}`)
            continue
          }

          if (picksWithMatchup && picksWithMatchup.length > 0) {
            // This matchup has picks referencing it - don't delete
            console.log(`⚠️ Skipping deletion of stale matchup ${matchup.away_team} @ ${matchup.home_team} (${matchup.season}) - has ${picksWithMatchup.length} picks referencing it`)
            continue
          }

          // Safe to delete - no picks reference this matchup
          const { error: deleteError } = await supabase
            .from('matchups')
            .delete()
            .eq('id', matchup.id)

          if (deleteError) {
            const errorMsg = `Failed to delete stale matchup ${matchup.away_team} @ ${matchup.home_team}: ${deleteError.message}`
            console.error(`❌ ${errorMsg}`)
            errors.push(errorMsg)
          } else {
            staleMatchupsDeleted++
            staleMatchupIds.push(`${matchup.away_team} @ ${matchup.home_team} (${matchup.season})`)
            console.log(`🗑️ Deleted stale matchup: ${matchup.away_team} @ ${matchup.home_team} (${matchup.season}) - not in ESPN API response`)
          }
        }
      }
    }

    const executionTime = Date.now() - startTime
    console.log(`Game time update completed in ${executionTime}ms: ${gameTimesUpdated} game times updated, ${matchupsCreated} matchups created, ${staleMatchupsDeleted} stale matchups deleted, ${errors.length} errors`)

    return NextResponse.json({
      success: true,
      game_times_updated: gameTimesUpdated,
      matchups_created: matchupsCreated,
      stale_matchups_deleted: staleMatchupsDeleted,
      total_matchups_checked: matchups.length,
      execution_time_ms: executionTime,
      errors: errors.length > 0 ? errors : null,
      updated_matchups: updatedMatchups,
      deleted_stale_matchups: staleMatchupIds.length > 0 ? staleMatchupIds : null,
      debug: {
        currentWeek,
        seasonDisplay: seasonInfo.seasonDisplay,
        espnGamesCount: allEspnGames.length,
        databaseMatchupsCount: matchups.length,
        espnGameKeys: Array.from(espnGameMap.keys()),
        databaseGameKeys: matchups.map(m => `${m.away_team}-${m.home_team}`).slice(0, 5)
      }
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Error in game time update cron:', error)
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      execution_time_ms: executionTime
    }, { status: 500 })
  }
}

// Also allow GET for manual testing
export async function GET() {
  try {
    console.log('Manual game time update triggered')
    
    // Create a mock request for the POST handler
    const mockRequest = new NextRequest('http://localhost:3000/api/cron/update-game-times', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${process.env.CRON_SECRET_TOKEN}`
      }
    })
    
    return await POST(mockRequest)
  } catch (error) {
    console.error('Error in manual game time update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
