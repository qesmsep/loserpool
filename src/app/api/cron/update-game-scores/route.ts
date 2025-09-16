import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { espnService, ESPNGame } from '@/lib/espn-service'
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

    // Get all available games from ESPN API for different weeks and season types
    const allEspnGames: ESPNGame[] = []
    const seasonTypes = ['PRE', 'REG', 'POST']
    const weeksToCheck = [1, 2, 3, 4, 5] // Check multiple weeks
    
    for (const st of seasonTypes) {
      for (const week of weeksToCheck) {
        try {
          const games = await espnService.getNFLSchedule(parseInt(currentYear), week, st)
          if (games.length > 0) {
            allEspnGames.push(...games)
            console.log(`Found ${games.length} ${st} games for week ${week}`)
          }
        } catch (error) {
          console.log(`No ${st} games found for week ${week}:`, error instanceof Error ? error.message : 'Unknown error')
        }
      }
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

    // Get all matchups from our database
    const { data: matchups, error: fetchError } = await supabase
      .from('matchups')
      .select('*')
      .order('game_time', { ascending: true })

    if (fetchError) {
      console.error('Error fetching matchups:', fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    // Process pick status updates for all final games that haven't been processed yet
    console.log('Starting to process final game pick updates...')
    await processFinalGamePickUpdates(supabase, matchups)
    console.log('Finished processing final game pick updates.')

    // Also get all weeks in our database to see what we have
    const { data: allWeeks } = await supabase
      .from('matchups')
      .select('week')
      .order('week', { ascending: true })

    const uniqueWeeks = [...new Set(allWeeks?.map(m => m.week) || [])]
    console.log(`Database has games for weeks: ${uniqueWeeks.join(', ')}`)
    console.log(`ESPN API current week: ${currentWeek}`)
    console.log(`Database matchups for week ${currentWeek}: ${matchups?.length || 0}`)

    if (!matchups || matchups.length === 0) {
      console.log('No matchups found in database for current week')
      
      // Check if this is a season mismatch
      const earliestWeek = Math.min(...uniqueWeeks)
      const latestWeek = Math.max(...uniqueWeeks)
      
      let message = 'No matchups found in database for current week'
      if (earliestWeek > currentWeek) {
        message = `Season mismatch: Database has weeks ${earliestWeek}-${latestWeek} (future), ESPN API has week ${currentWeek} (current 2024 season)`
      } else if (latestWeek < currentWeek) {
        message = `Season mismatch: Database has weeks ${earliestWeek}-${latestWeek} (past), ESPN API has week ${currentWeek} (current 2024 season)`
      }
      
      return NextResponse.json({ 
        success: true, 
        message,
        games_updated: 0,
        debug: {
          currentWeek,
          databaseWeeks: uniqueWeeks,
          seasonMismatch: earliestWeek > currentWeek || latestWeek < currentWeek
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

    console.log(`Found ${matchups.length} matchups in database and ${allEspnGames.length} games from ESPN API`)

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
                 broadcastInfo !== matchup.broadcast_info

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
            
            // If game is final, update pick statuses (including ties)
            if (newStatus === 'final' && winner) {
              await updatePickStatuses(matchup.id, winner)
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
    
    console.log(`Game score update completed in ${executionTime}ms: ${gamesUpdated} games updated`)

    return NextResponse.json({
      success: true,
      games_updated: gamesUpdated,
      total_matchups_checked: matchups.length,
      execution_time_ms: executionTime,
      errors: errors.length > 0 ? errors : null,
              debug: {
          currentWeek,
          espnGamesCount: allEspnGames.length,
          databaseMatchupsCount: matchups.length,
                  databaseWeeks: uniqueWeeks,
          databaseSeasons: [...new Set(matchups?.map(m => m.season) || [])],
        espnGameKeys: Array.from(espnGameMap.keys()),
        databaseGameKeys: matchups.map(m => `${m.away_team}-${m.home_team}`).slice(0, 5), // First 5 for debugging
        message: matchups.length === 0 ? 'No database matchups for current week' : 'Database matchups found for current week'
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

// Function to update pick statuses when a game is finalized
async function updatePickStatuses(matchupId: string, winner: string) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get the matchup details to convert winner from 'away'/'home' to team abbreviation
    const { data: matchup, error: matchupError } = await supabase
      .from('matchups')
      .select('away_team, home_team')
      .eq('id', matchupId)
      .single()

    if (matchupError || !matchup) {
      console.error(`Error fetching matchup ${matchupId}:`, matchupError)
      return
    }

    // Convert winner from 'away'/'home' to actual team abbreviation, or handle ties
    let winningTeam = null
    if (winner === 'tie') {
      console.log(`Game ended in a tie - all picks will be eliminated`)
    } else {
      winningTeam = winner === 'away' ? matchup.away_team : matchup.home_team
      console.log(`Winner conversion: ${winner} -> ${winningTeam}`)
    }
    
    // Get all picks for this matchup (using week-specific columns)
    const { data: allPicks, error: fetchError } = await supabase
      .from('picks')
      .select('*')
      .in('status', ['active', 'safe']) // Get both active and safe picks that need status updates

    if (fetchError) {
      console.error(`Error fetching picks for matchup ${matchupId}:`, fetchError)
      return
    }

    if (!allPicks || allPicks.length === 0) {
      console.log(`No active or safe picks found`)
      return
    }

    // Filter picks that are allocated to this specific matchup
    const picksForThisMatchup = allPicks.filter(pick => {
      // Check all week columns to see if this pick is allocated to this matchup
      const weekColumns = [
        'pre1_team_matchup_id', 'pre2_team_matchup_id', 'pre3_team_matchup_id',
        'reg1_team_matchup_id', 'reg2_team_matchup_id', 'reg3_team_matchup_id', 'reg4_team_matchup_id',
        'reg5_team_matchup_id', 'reg6_team_matchup_id', 'reg7_team_matchup_id', 'reg8_team_matchup_id',
        'reg9_team_matchup_id', 'reg10_team_matchup_id', 'reg11_team_matchup_id', 'reg12_team_matchup_id',
        'reg13_team_matchup_id', 'reg14_team_matchup_id', 'reg15_team_matchup_id', 'reg16_team_matchup_id',
        'reg17_team_matchup_id', 'reg18_team_matchup_id',
        'post1_team_matchup_id', 'post2_team_matchup_id', 'post3_team_matchup_id', 'post4_team_matchup_id'
      ]
      
      return weekColumns.some(column => {
        const value = pick[column as keyof typeof pick]
        if (value) {
          const parts = value.split('_')
          return parts[0] === matchupId
        }
        return false
      })
    })

    if (picksForThisMatchup.length === 0) {
      console.log(`No picks found for matchup ${matchupId}`)
      return
    }

    console.log(`Updating ${picksForThisMatchup.length} picks for matchup ${matchupId}, winning team: ${winningTeam}`)

    // Update picks based on winner (LOSER POOL LOGIC)
    for (const pick of picksForThisMatchup) {
      let newStatus = 'active'
      
      // Find which week column contains this matchup allocation and extract the team name
      const weekColumns = [
        'pre1_team_matchup_id', 'pre2_team_matchup_id', 'pre3_team_matchup_id',
        'reg1_team_matchup_id', 'reg2_team_matchup_id', 'reg3_team_matchup_id', 'reg4_team_matchup_id',
        'reg5_team_matchup_id', 'reg6_team_matchup_id', 'reg7_team_matchup_id', 'reg8_team_matchup_id',
        'reg9_team_matchup_id', 'reg10_team_matchup_id', 'reg11_team_matchup_id', 'reg12_team_matchup_id',
        'reg13_team_matchup_id', 'reg14_team_matchup_id', 'reg15_team_matchup_id', 'reg16_team_matchup_id',
        'reg17_team_matchup_id', 'reg18_team_matchup_id',
        'post1_team_matchup_id', 'post2_team_matchup_id', 'post3_team_matchup_id', 'post4_team_matchup_id'
      ]
      
      let teamPicked = null
      for (const column of weekColumns) {
        const value = pick[column as keyof typeof pick]
        if (value) {
          const parts = value.split('_')
          if (parts[0] === matchupId) {
            teamPicked = parts.slice(1).join('_') // In case team name has underscores
            break
          }
        }
      }
      
      if (!teamPicked) {
        console.log(`Could not find team for pick ${pick.id} in matchup ${matchupId}`)
        continue
      }
      
      if (winner === 'tie') {
        // Ties eliminate everyone in a loser pool
        newStatus = 'eliminated'
        console.log(`User pick ELIMINATED due to tie: ${teamPicked}`)
      } else if (teamPicked === winningTeam) {
        // User picked the winning team - they're ELIMINATED (this is a loser pool!)
        newStatus = 'eliminated'
        console.log(`User pick ELIMINATED: ${teamPicked} won, user picked ${teamPicked}`)
      } else {
        // User picked the losing team - they SURVIVE (this is a loser pool!)
        newStatus = 'safe'
        console.log(`User pick SURVIVES: ${teamPicked} lost, user picked ${teamPicked}`)
      }

      const { error: updateError } = await supabase
        .from('picks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', pick.id)

      if (updateError) {
        console.error(`Error updating pick ${pick.id}:`, updateError)
      }
    }

    console.log(`Successfully updated ${picksForThisMatchup.length} picks for matchup ${matchupId}`)
    
    // Update user types for all users who had picks in this matchup
    const userIds = [...new Set(picksForThisMatchup.map(pick => pick.user_id))]
    for (const userId of userIds) {
      try {
        await updateUserTypeBasedOnPicks(userId)
      } catch (error) {
        console.error(`Error updating user type for user ${userId}:`, error)
        // Don't fail the entire process if one user type update fails
      }
    }
  } catch (error) {
    console.error(`Error updating pick statuses for matchup ${matchupId}:`, error)
  }
}

// Function to process pick status updates for all final games that haven't been processed yet
async function processFinalGamePickUpdates(supabase: ReturnType<typeof createServiceRoleClient>, matchups: { id: string; status: string; winner: string | null; away_team: string; home_team: string }[]) {
  const finalGames = matchups.filter(m => m.status === 'final');
  console.log(`Found ${finalGames.length} final games to process pick updates for.`);

  for (const matchup of finalGames) {
    const winner = matchup.winner;
    console.log(`Processing final game: ${matchup.away_team} @ ${matchup.home_team}, winner: ${winner}`);
    if (winner) {
      await updatePickStatuses(matchup.id, winner);
    } else {
      console.warn(`Game ${matchup.away_team} @ ${matchup.home_team} is final but no winner found.`);
    }
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
