import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { espnService, ESPNGame } from '@/lib/espn-service'
import { getCurrentSeasonInfo } from '@/lib/season-detection'
import { updateUserTypeBasedOnPicks } from '@/lib/user-types'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify cron secret token
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting live game score update...')
    
    const supabase = createServiceRoleClient()
    
    // Determine current season/week using season detection (authoritative)
    const seasonInfo = await getCurrentSeasonInfo()
    const currentWeek = seasonInfo.currentWeek
    const seasonType = seasonInfo.isPreseason ? 'PRE' : 'REG'
    const currentYear = String(seasonInfo.seasonYear)
    console.log(`Season detection → ${seasonType}${currentWeek}, year=${currentYear}`)

    // Get ESPN games only for the current season week
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
      console.log(`Failed to fetch ESPN games for ${seasonType}${currentWeek}:`, error instanceof Error ? error.message : 'Unknown error')
    }
    
    if (allEspnGames.length === 0) {
      console.log(`No games found from ESPN API`)
      return NextResponse.json({ 
        success: true, 
        message: `No games found from ESPN API`,
        games_updated: 0 
      })
    }
    
    console.log(`Found ${allEspnGames.length} total games from ESPN API`)

    // Get matchups for current week from our database
    const { data: matchups, error: fetchError } = await supabase
      .from('matchups')
      .select('*')
      .eq('season', seasonInfo.seasonDisplay)
      .order('game_time', { ascending: true })

    if (fetchError) {
      console.error('Error fetching matchups:', fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    // We'll process picks after updating matchup scores

    console.log(`Database matchups for ${seasonInfo.seasonDisplay}: ${matchups?.length || 0}`)

    if (!matchups || matchups.length === 0) {
      console.log('No matchups found in database for current week')
      return NextResponse.json({ 
        success: true, 
        message: 'No matchups found in database for current week',
        games_updated: 0,
        debug: {
          currentWeek,
          seasonDisplay: seasonInfo.seasonDisplay
        }
      })
    }

        if (!allEspnGames || allEspnGames.length === 0) {
      console.log('No games found from ESPN API')
      return NextResponse.json({
        success: true,
        message: 'No games found from ESPN API',
        games_updated: 0
      })
    }

    console.log(`Found ${matchups.length} matchups in DB and ${allEspnGames.length} ESPN games for ${seasonInfo.seasonDisplay}`)

    let gamesUpdated = 0
    const errors: string[] = []



    // Create a map of ESPN games by team matchup for easy lookup
    const espnGameMap = new Map<string, Record<string, unknown>>()
    allEspnGames.forEach(game => {
      const convertedGame = espnService.convertToMatchupFormat(game)
      if (convertedGame) {
        const key = `${convertedGame.away_team}-${convertedGame.home_team}`
        espnGameMap.set(key, convertedGame)
        console.log(`ESPN game: ${convertedGame.away_team} @ ${convertedGame.home_team} - Status: ${convertedGame.status}, Score: ${convertedGame.away_score}-${convertedGame.home_score}`)
      }
    })
    
    console.log(`ESPN game keys: ${Array.from(espnGameMap.keys()).join(', ')}`)

    // For each matchup in our database, find corresponding ESPN game and update
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

        // Extract data from ESPN API
        const newStatus = espnGame.status as string
        const awayScore = espnGame.away_score as number | null
        const homeScore = espnGame.home_score as number | null
        const lastUpdated = espnGame.last_api_update as string
        const quarterInfo = espnGame.quarter_info as string | null
        const broadcastInfo = espnGame.broadcast_info as string | null
        const awaySpread = espnGame.away_spread as number | null
        const homeSpread = espnGame.home_spread as number | null
        const overUnder = espnGame.over_under as number | null
        
        // ESPN doesn't provide weather data, so we'll keep existing values
        const weather = matchup.weather_forecast
        const temperature = matchup.temperature
        const humidity = matchup.humidity
        const windSpeed = matchup.wind_speed

        // Determine winner
        let winner = null
        if (awayScore !== null && homeScore !== null) {
          if (awayScore > homeScore) {
            winner = 'away'
          } else if (homeScore > awayScore) {
            winner = 'home'
          } else {
            winner = 'tie'
          }
        }

        // Check if we need to update this matchup
        const existingWinner: string | null = (matchup as { winner?: string | null }).winner ?? null
        const needsUpdate =
          newStatus !== matchup.status ||
          awayScore !== matchup.away_score ||
          homeScore !== matchup.home_score ||
          awaySpread !== matchup.away_spread ||
          homeSpread !== matchup.home_spread ||
          overUnder !== matchup.over_under ||
          temperature !== matchup.temperature ||
          windSpeed !== matchup.wind_speed ||
          weather !== matchup.weather_forecast ||
          quarterInfo !== matchup.quarter_info ||
          broadcastInfo !== matchup.broadcast_info ||
          // Ensure we persist winner changes even if nothing else changed
          winner !== existingWinner

               if (needsUpdate) {
                 const updateData: {
                   status: string;
                   away_score: number | null;
                   home_score: number | null;
                   away_spread: number | null;
                   home_spread: number | null;
                   over_under: number | null;
                   quarter_info: string | null;
                   broadcast_info: string | null;
                   updated_at: string;
                   last_api_update: string;
                   winner?: string;
                   temperature?: number | null;
                   wind_speed?: number | null;
                   weather_forecast?: string | null;
                 } = {
                   status: newStatus,
                   away_score: awayScore,
                   home_score: homeScore,
                   away_spread: awaySpread,
                   home_spread: homeSpread,
                   over_under: overUnder,
                   quarter_info: quarterInfo,
                   broadcast_info: broadcastInfo,
                   updated_at: new Date().toISOString(),
                   last_api_update: new Date().toISOString()
                 }

                 // Add winner if we have scores
                 if (winner) {
                   updateData.winner = winner
                 }

                 // Add weather data if available
                 if (temperature !== null) updateData.temperature = temperature
                 if (windSpeed !== null) updateData.wind_speed = windSpeed
                 if (weather !== null) updateData.weather_forecast = weather

          const { error: updateError } = await supabase
            .from('matchups')
            .update(updateData)
            .eq('id', matchup.id)

          if (updateError) {
            console.error(`Error updating matchup ${matchup.id}:`, updateError)
            errors.push(`Failed to update ${matchup.away_team} @ ${matchup.home_team}: ${updateError.message}`)
                           } else {
                   gamesUpdated++
                   console.log(`Updated game: ${matchup.away_team} @ ${matchup.home_team} - Status: ${newStatus}, Score: ${awayScore}-${homeScore}, Winner: ${winner}`)
                   
                   // Log weather data if available
                   if (weather || temperature || windSpeed) {
                     console.log(`  Weather: ${weather}, Temp: ${temperature}°F, Wind: ${windSpeed} mph`)
                   }
          }
        } else {
          console.log(`No updates needed for: ${matchup.away_team} @ ${matchup.home_team}`)
        }

      } catch (error) {
        const errorMsg = `Error processing matchup ${matchup.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    const executionTime = Date.now() - startTime
    
    // Process all picks for current week's final games
    console.log('Processing picks for current week final games...')
    const pickResult = await processCurrentWeekPicks(supabase, seasonInfo, matchups)
    console.log(`Picks processed: ${pickResult.picksProcessed}, picks eliminated: ${pickResult.picksEliminated}`)

    console.log(`Game score update completed in ${executionTime}ms: ${gamesUpdated} games updated, ${pickResult.picksProcessed} picks processed, ${pickResult.picksEliminated} picks eliminated`)

    return NextResponse.json({
      success: true,
      games_updated: gamesUpdated,
      total_matchups_checked: matchups.length,
      execution_time_ms: executionTime,
      errors: errors.length > 0 ? errors : null,
      picks_processed: pickResult.picksProcessed,
      picks_eliminated: pickResult.picksEliminated,
      debug: {
        currentWeek,
        seasonDisplay: seasonInfo.seasonDisplay,
        espnGamesCount: allEspnGames.length,
        databaseMatchupsCount: matchups.length,
        databaseSeasons: [...new Set(matchups?.map(m => m.season) || [])],
        espnGameKeys: Array.from(espnGameMap.keys()),
        databaseGameKeys: matchups.map(m => `${m.away_team}-${m.home_team}`).slice(0, 5)
      }
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Error in game score update:', error)
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      execution_time_ms: executionTime
    }, { status: 500 })
  }
}

// Simplified function to process ALL current week picks for final games
async function processCurrentWeekPicks(
  supabase: ReturnType<typeof createServiceRoleClient>,
  seasonInfo: { currentWeek: number; isPreseason: boolean; seasonDisplay: string },
  matchups: Array<{ id: string; status: string; winner: string | null; away_team: string; home_team: string }>
): Promise<{ picksProcessed: number; picksEliminated: number }> {
  try {
    // Get week column name (e.g., 'reg8_team_matchup_id')
    const getWeekColumn = (week: number, isPreseason: boolean): string | null => {
      if (isPreseason && week <= 3) {
        return `pre${week}_team_matchup_id`
      } else if (!isPreseason && week <= 18) {
        return `reg${week}_team_matchup_id`
      } else if (week > 18) {
        const postWeek = week - 18
        return postWeek <= 4 ? `post${postWeek}_team_matchup_id` : null
      }
      return null
    }

    const weekColumn = getWeekColumn(seasonInfo.currentWeek, seasonInfo.isPreseason)
    if (!weekColumn) {
      console.error(`Invalid week for pick processing: ${seasonInfo.seasonDisplay}`)
      return { picksProcessed: 0, picksEliminated: 0 }
    }

    console.log(`Processing picks for column: ${weekColumn}`)

    // Get all final games for current week
    const finalGames = matchups.filter(m => m.status === 'final')
    console.log(`Found ${finalGames.length} final games in current week`)

    if (finalGames.length === 0) {
      return { picksProcessed: 0, picksEliminated: 0 }
    }

    let picksProcessed = 0
    let picksEliminated = 0
    const userIdsToUpdate = new Set<string>()

    // Process each final game
    for (const matchup of finalGames) {
      // Determine winner team abbreviation
      let winningTeam: string | null = null
      if (matchup.winner === 'tie') {
        winningTeam = null // Ties eliminate everyone
      } else if (matchup.winner === 'away') {
        winningTeam = matchup.away_team
      } else if (matchup.winner === 'home') {
        winningTeam = matchup.home_team
      } else {
        console.warn(`No winner for final game: ${matchup.away_team} @ ${matchup.home_team}`)
        continue
      }

      console.log(`Processing picks for ${matchup.away_team} @ ${matchup.home_team}, winner: ${winningTeam || 'TIE'}`)

      // Get all picks that reference this matchup in the current week column
      // Format: matchup_uuid_TEAM (e.g., "abc123_CIN")
      const { data: picks, error: picksError } = await supabase
        .from('picks')
        .select('id, user_id, status, ' + weekColumn)
        .like(weekColumn, `${matchup.id}_%`)
        .neq('status', 'eliminated')

      if (picksError) {
        console.error(`Error fetching picks for matchup ${matchup.id}:`, picksError)
        continue
      }

      if (!picks || picks.length === 0) {
        console.log(`No active picks found for matchup ${matchup.id}`)
        continue
      }

      console.log(`Found ${picks.length} active picks for this matchup`)

      // Process each pick
      for (const pickData of picks) {
        picksProcessed++
        
        // Type assertion for dynamic column access
        const pick = pickData as unknown as { id: string; user_id: string; status: string } & Record<string, string | null>
        
        // Extract team from the column value (format: uuid_TEAM)
        const teamMatchupValue = pick[weekColumn]
        if (!teamMatchupValue) continue

        const parts = teamMatchupValue.split('_')
        if (parts.length < 2) {
          console.warn(`Invalid team_matchup_id format: ${teamMatchupValue}`)
          continue
        }

        // Team abbreviation is everything after the first underscore
        const pickedTeam = parts.slice(1).join('_')
        console.log(`Pick ${pick.id}: picked team = ${pickedTeam}, winning team = ${winningTeam}`)

        // LOSER POOL LOGIC:
        // - If tie: everyone eliminated
        // - If picked team WON: eliminated (picked wrong in loser pool)
        // - If picked team LOST: leave status unchanged (they survive)
        
        let shouldEliminate = false
        if (matchup.winner === 'tie') {
          shouldEliminate = true
          console.log(`  → ELIMINATED (tie game)`)
        } else if (pickedTeam === winningTeam) {
          shouldEliminate = true
          console.log(`  → ELIMINATED (picked winning team in loser pool)`)
        } else {
          console.log(`  → SURVIVES (picked losing team - leaving status unchanged)`)
        }

        if (shouldEliminate) {
          const { error: updateError } = await supabase
            .from('picks')
            .update({ 
              status: 'eliminated',
              updated_at: new Date().toISOString()
            })
            .eq('id', pick.id)

          if (updateError) {
            console.error(`Error eliminating pick ${pick.id}:`, updateError)
          } else {
            picksEliminated++
            userIdsToUpdate.add(pick.user_id)
          }
        }
      }
    }

    // Update user types for affected users
    console.log(`Updating user types for ${userIdsToUpdate.size} affected users`)
    for (const userId of userIdsToUpdate) {
      try {
        await updateUserTypeBasedOnPicks(userId)
      } catch (error) {
        console.error(`Error updating user type for ${userId}:`, error)
      }
    }

    return { picksProcessed, picksEliminated }
  } catch (error) {
    console.error('Error processing current week picks:', error)
    return { picksProcessed: 0, picksEliminated: 0 }
  }
}

// Also allow GET for manual testing
export async function GET() {
  try {
    console.log('Manual game score update triggered')
    
    // Create a mock request for the POST handler
    const mockRequest = new NextRequest('http://localhost:3000/api/cron/update-game-scores', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${process.env.CRON_SECRET_TOKEN}`
      }
    })
    
    return await POST(mockRequest)
  } catch (error) {
    console.error('Error in manual game score update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
