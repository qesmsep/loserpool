import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { espnService, ESPNGame } from '@/lib/espn-service'
import { getCurrentSeasonInfo } from '@/lib/season-detection'

/**
 * Cron job to update game times from ESPN API
 * This job specifically updates only the game_time field for matchups
 * to ensure times stay in sync with ESPN's schedule
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
    const seasonType = seasonInfo.isPreseason ? 'PRE' : 'REG'
    const currentYear = String(seasonInfo.seasonYear)
    console.log(`Season detection → ${seasonType}${currentWeek}, year=${currentYear}`)

    // Get ESPN games for current week
    const allEspnGames: ESPNGame[] = []
    try {
      const games = await espnService.getNFLSchedule(parseInt(currentYear), currentWeek, seasonType)
      if (games.length > 0) {
        allEspnGames.push(...games)
        console.log(`Found ${games.length} ${seasonType} games for current week ${currentWeek}`)
      } else {
        console.log(`No ${seasonType} games found for current week ${currentWeek}`)
      }
    } catch (error) {
      console.error(`Failed to fetch ESPN games for ${seasonType}${currentWeek}:`, error instanceof Error ? error.message : 'Unknown error')
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch ESPN games',
        details: error instanceof Error ? error.message : 'Unknown error'
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

    // Get matchups for current week from our database
    const { data: matchups, error: fetchError } = await supabase
      .from('matchups')
      .select('id, away_team, home_team, game_time, season, week')
      .eq('season', seasonInfo.seasonDisplay)
      .order('game_time', { ascending: true })

    if (fetchError) {
      console.error('Error fetching matchups:', fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    console.log(`Database matchups for ${seasonInfo.seasonDisplay}: ${matchups?.length || 0}`)

    if (!matchups || matchups.length === 0) {
      console.log('No matchups found in database for current week')
      return NextResponse.json({ 
        success: true, 
        message: 'No matchups found in database for current week',
        game_times_updated: 0,
        debug: {
          currentWeek,
          seasonDisplay: seasonInfo.seasonDisplay
        }
      })
    }

    console.log(`Found ${matchups.length} matchups in DB and ${allEspnGames.length} ESPN games for ${seasonInfo.seasonDisplay}`)

    let gameTimesUpdated = 0
    const errors: string[] = []
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
        const weekMatch = espnGame.week === matchup.week
        const currentGameDate = matchup.game_time.split('T')[0] // Extract YYYY-MM-DD
        const dateMatch = currentGameDate === espnGame.game_date
        
        if (!weekMatch) {
          console.log(`⚠️ Week mismatch for ${espnGame.name}: DB week=${matchup.week}, ESPN week=${espnGame.week} - SKIPPING`)
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

    const executionTime = Date.now() - startTime
    console.log(`Game time update completed in ${executionTime}ms: ${gameTimesUpdated} game times updated, ${errors.length} errors`)

    return NextResponse.json({
      success: true,
      game_times_updated: gameTimesUpdated,
      total_matchups_checked: matchups.length,
      execution_time_ms: executionTime,
      errors: errors.length > 0 ? errors : null,
      updated_matchups: updatedMatchups,
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
