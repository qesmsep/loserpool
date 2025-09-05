import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { espnService } from '@/lib/espn-service'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify cron secret token
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting spread fetching cron job...')
    
    const supabase = createServiceRoleClient()
    
    // Use 2025 season
    const currentYear = '2025'
    console.log(`Using season year: ${currentYear}`)

    // Get current week from ESPN API
    let currentWeek: number
    try {
      currentWeek = await espnService.getCurrentNFLWeek(parseInt(currentYear))
      console.log(`Current week from ESPN API: ${currentWeek}`)
    } catch (error) {
      console.error('Error getting current week from ESPN API:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to get current week from ESPN API',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

    // Get all available games from ESPN API for current week
    const allEspnGames: any[] = []
    const seasonTypes = ['PRE', 'REG', 'POST']
    
    for (const st of seasonTypes) {
      try {
        const games = await espnService.getNFLSchedule(parseInt(currentYear), currentWeek, st)
        if (games.length > 0) {
          allEspnGames.push(...games)
          console.log(`Found ${games.length} ${st} games for week ${currentWeek}`)
        }
      } catch (error) {
        console.log(`No ${st} games found for week ${currentWeek}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }
    
    if (allEspnGames.length === 0) {
      console.log(`No games found from ESPN API for week ${currentWeek}`)
      return NextResponse.json({ 
        success: true, 
        message: `No games found from ESPN API for week ${currentWeek}`,
        spreads_updated: 0 
      })
    }
    
    console.log(`Found ${allEspnGames.length} total games from ESPN API`)

    // Get all matchups from our database for current week
    const { data: matchups, error: fetchError } = await supabase
      .from('matchups')
      .select('*')
      .eq('week', currentWeek)
      .order('game_time', { ascending: true })

    if (fetchError) {
      console.error('Error fetching matchups:', fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    if (!matchups || matchups.length === 0) {
      console.log(`No matchups found in database for week ${currentWeek}`)
      return NextResponse.json({ 
        success: true, 
        message: `No matchups found in database for week ${currentWeek}`,
        spreads_updated: 0 
      })
    }

    console.log(`Found ${matchups.length} matchups in database for week ${currentWeek}`)

    let spreadsUpdated = 0
    const errors: string[] = []

    // Create a map of ESPN games by team matchup for easy lookup
    const espnGameMap = new Map<string, any>()
    allEspnGames.forEach(game => {
      const convertedGame = espnService.convertToMatchupFormat(game)
      if (convertedGame) {
        const key = `${convertedGame.away_team}-${convertedGame.home_team}`
        espnGameMap.set(key, convertedGame)
        console.log(`ESPN game: ${convertedGame.away_team} @ ${convertedGame.home_team} - Away Spread: ${convertedGame.away_spread}, Home Spread: ${convertedGame.home_spread}`)
      }
    })
    
    console.log(`ESPN game keys: ${Array.from(espnGameMap.keys()).join(', ')}`)

    // For each matchup in our database, find corresponding ESPN game and update spreads
    for (const matchup of matchups) {
      try {
        const gameKey = `${matchup.away_team}-${matchup.home_team}`
        console.log(`Looking for database matchup: ${gameKey}`)
        const espnGame = espnGameMap.get(gameKey)

        if (!espnGame) {
          console.log(`❌ No ESPN game found for: ${matchup.away_team} @ ${matchup.home_team}`)
          continue
        }
        
        console.log(`✅ Found ESPN game for: ${matchup.away_team} @ ${matchup.home_team}`)

        // Extract spread data from ESPN API
        const awaySpread = espnGame.away_spread as number | null
        const homeSpread = espnGame.home_spread as number | null
        const overUnder = espnGame.over_under as number | null
        
        console.log(`ESPN spreads for ${gameKey}: Away=${awaySpread}, Home=${homeSpread}, O/U=${overUnder}`)

        // Check if we need to update spreads
        const needsUpdate =
          awaySpread !== matchup.away_spread ||
          homeSpread !== matchup.home_spread ||
          overUnder !== matchup.over_under

        if (needsUpdate) {
          const updateData: {
            away_spread: number | null;
            home_spread: number | null;
            over_under: number | null;
            updated_at: string;
            last_api_update: string;
          } = {
            away_spread: awaySpread,
            home_spread: homeSpread,
            over_under: overUnder,
            updated_at: new Date().toISOString(),
            last_api_update: new Date().toISOString()
          }

          const { error: updateError } = await supabase
            .from('matchups')
            .update(updateData)
            .eq('id', matchup.id)

          if (updateError) {
            console.error(`Error updating spreads for matchup ${matchup.id}:`, updateError)
            errors.push(`Failed to update spreads for ${matchup.away_team} @ ${matchup.home_team}: ${updateError.message}`)
          } else {
            spreadsUpdated++
            console.log(`✅ Updated spreads for: ${matchup.away_team} @ ${matchup.home_team} - Away: ${awaySpread}, Home: ${homeSpread}, O/U: ${overUnder}`)
          }
        } else {
          console.log(`No spread updates needed for: ${matchup.away_team} @ ${matchup.home_team}`)
        }

      } catch (error) {
        const errorMsg = `Error processing matchup ${matchup.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    const executionTime = Date.now() - startTime
    
    console.log(`Spread fetching completed in ${executionTime}ms: ${spreadsUpdated} spreads updated`)

    return NextResponse.json({
      success: true,
      spreads_updated: spreadsUpdated,
      total_matchups_checked: matchups.length,
      execution_time_ms: executionTime,
      errors: errors.length > 0 ? errors : null,
      debug: {
        currentWeek,
        espnGamesCount: allEspnGames.length,
        databaseMatchupsCount: matchups.length,
        espnGameKeys: Array.from(espnGameMap.keys()),
        databaseGameKeys: matchups.map(m => `${m.away_team}-${m.home_team}`).slice(0, 5), // First 5 for debugging
        message: matchups.length === 0 ? 'No database matchups for current week' : 'Database matchups found for current week'
      }
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Error in spread fetching cron job:', error)
    
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
    console.log('Manual spread fetching triggered')
    
    // Create a mock request for the POST handler
    const mockRequest = new NextRequest('http://localhost:3000/api/cron/fetch-spreads', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${process.env.CRON_SECRET_TOKEN}`
      }
    })
    
    return await POST(mockRequest)
  } catch (error) {
    console.error('Error in manual spread fetching:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
