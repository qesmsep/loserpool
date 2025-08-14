import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sportsDataService } from '@/lib/sportsdata-service'

interface UpdateResult {
  success: boolean
  gamesUpdated: number
  gamesAdded: number
  gamesSkipped: number
  errors: string[]
  details: {
    season: number
    timestamp: string
    weeksProcessed: number[]
  }
}

export async function POST(request: Request) {
  try {
    // Verify cron secret token
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      console.error('Invalid cron secret token')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { season = 2025, action = 'full-season' } = body

    console.log(`Cron full season update: season=${season}, action=${action}`)

    let result: UpdateResult

    switch (action) {
      case 'full-season':
        // Update entire season (preseason, regular season, postseason)
        result = await updateFullSeason(season)
        break
        
      case 'preseason':
        // Update only preseason
        result = await updatePreseason(season)
        break
        
      case 'regular-season':
        // Update only regular season
        result = await updateRegularSeason(season)
        break
        
      case 'postseason':
        // Update only postseason
        result = await updatePostseason(season)
        break
        
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: full-season, preseason, regular-season, postseason` },
          { status: 400 }
        )
    }

    console.log(`Cron full season update completed:`, result)

    return NextResponse.json({
      success: true,
      action,
      season,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in cron full season update:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const season = parseInt(searchParams.get('season') || '2025')
    const action = searchParams.get('action') || 'full-season'

    console.log(`Manual cron full season update: season=${season}, action=${action}`)

    let result: UpdateResult

    switch (action) {
      case 'full-season':
        result = await updateFullSeason(season)
        break
        
      case 'preseason':
        result = await updatePreseason(season)
        break
        
      case 'regular-season':
        result = await updateRegularSeason(season)
        break
        
      case 'postseason':
        result = await updatePostseason(season)
        break
        
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: full-season, preseason, regular-season, postseason` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      season,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in manual cron full season update:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Helper function to get Supabase client
async function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Helper function to map week to season format based on actual data
function mapWeekToSeason(week: number, gameDate?: string, seasonType?: number): string {
  // If we have season type information, use it to determine season format
  if (seasonType !== undefined) {
    if (seasonType === 2) { // Preseason
      return `PRE${week}` // PRE1, PRE2, PRE3, etc.
    } else if (seasonType === 1) { // Regular season
      return `REG${week}` // REG1, REG2, etc.
    } else if (seasonType === 3) { // Postseason
      return `POST${week}` // POST1, POST2, etc.
    }
  }
  
  // Fallback: If we have a game date, use it to determine if it's preseason
  if (gameDate) {
    const date = new Date(gameDate)
    const month = date.getMonth() // 0-11, where 7 = August
    
    // If the game is in August or earlier, it's preseason
    if (month < 7) { // Before August
      return `PRE${week}` // PRE1, PRE2, PRE3, etc.
    }
  }
  
  // Default mapping based on week numbers
  if (week <= 18) {
    return `REG${week}` // REG1 through REG18
  } else {
    return `POST${week - 18}` // POST1 through POST4
  }
}

// Helper function to process games for a specific week
async function processWeekGames(season: number, week: number, supabase: any): Promise<{ updated: number; added: number; skipped: number; errors: string[] }> {
  const result = { updated: 0, added: 0, skipped: 0, errors: [] as string[] }
  
  try {
    console.log(`Processing ${season} Week ${week}...`)
    
    // Get games from SportsData.io
    const games = await sportsDataService.getGames(season, week)
    console.log(`Retrieved ${games.length} games for Week ${week}`)

    if (games.length === 0) {
      result.errors.push(`No games found for ${season} Week ${week}`)
      return result
    }

    // Get the first game's date and season type to help determine season format
    const firstGame = games[0]
    const firstGameDate = firstGame?.DateTime
    const seasonType = firstGame?.SeasonType
    const seasonFormat = mapWeekToSeason(week, firstGameDate, seasonType)
    console.log(`Using season format: ${seasonFormat} for Week ${week} (first game date: ${firstGameDate}, season type: ${seasonType})`)

    // Process each game
    for (const game of games) {
      try {
        const matchupData = sportsDataService.convertGameToMatchup(game)
        
        // Check if matchup already exists
        const { data: existingMatchup } = await supabase
          .from('matchups')
          .select('id')
          .eq('week', week)
          .eq('season', seasonFormat)
          .eq('away_team', matchupData.away_team)
          .eq('home_team', matchupData.home_team)
          .single()

        if (existingMatchup) {
          // Update existing matchup
          const { error: updateError } = await supabase
            .from('matchups')
            .update({
              game_time: matchupData.game_time,
              status: matchupData.status,
              away_score: matchupData.away_score,
              home_score: matchupData.home_score,
              away_spread: matchupData.away_spread,
              home_spread: matchupData.home_spread,
              over_under: matchupData.over_under,
              venue: matchupData.venue,
              data_source: 'sportsdata.io',
              last_api_update: new Date().toISOString()
            })
            .eq('id', existingMatchup.id)

          if (updateError) {
            result.errors.push(`Failed to update matchup ${existingMatchup.id}: ${updateError.message}`)
          } else {
            result.updated++
            console.log(`Updated matchup: ${matchupData.away_team} @ ${matchupData.home_team}`)
          }
        } else {
          // Insert new matchup
          const { error: insertError } = await supabase
            .from('matchups')
            .insert({
              week: week,
              season: seasonFormat,
              away_team: matchupData.away_team,
              home_team: matchupData.home_team,
              game_time: matchupData.game_time,
              status: matchupData.status,
              away_score: matchupData.away_score,
              home_score: matchupData.home_score,
              away_spread: matchupData.away_spread,
              home_spread: matchupData.home_spread,
              over_under: matchupData.over_under,
              venue: matchupData.venue,
              data_source: 'sportsdata.io',
              last_api_update: new Date().toISOString()
            })

          if (insertError) {
            result.errors.push(`Failed to insert matchup ${matchupData.away_team} @ ${matchupData.home_team}: ${insertError.message}`)
          } else {
            result.added++
            console.log(`Added new matchup: ${matchupData.away_team} @ ${matchupData.home_team}`)
          }
        }
      } catch (gameError) {
        result.errors.push(`Error processing game ${game.GameKey}: ${gameError instanceof Error ? gameError.message : 'Unknown error'}`)
        result.skipped++
      }
    }

    console.log(`Week ${week} complete: ${result.updated} updated, ${result.added} added, ${result.skipped} skipped`)

  } catch (error) {
    result.errors.push(`Service error for Week ${week}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.error(`Error processing Week ${week}:`, error)
  }

  return result
}

// Update full season (preseason, regular season, postseason)
async function updateFullSeason(season: number): Promise<UpdateResult> {
  const result: UpdateResult = {
    success: false,
    gamesUpdated: 0,
    gamesAdded: 0,
    gamesSkipped: 0,
    errors: [],
    details: {
      season,
      timestamp: new Date().toISOString(),
      weeksProcessed: []
    }
  }

  try {
    console.log(`Starting full season update for ${season}...`)
    
    const supabase = await getSupabase()
    
    // Define all weeks to process
    // Preseason: Weeks 1-3 (PRE1, PRE2, PRE3)
    // Regular Season: Weeks 4-21 (REG1-REG18)
    // Postseason: Weeks 22-25 (POST1-POST4)
    const allWeeks = Array.from({ length: 25 }, (_, i) => i + 1)
    
    for (const week of allWeeks) {
      const weekResult = await processWeekGames(season, week, supabase)
      
      result.gamesUpdated += weekResult.updated
      result.gamesAdded += weekResult.added
      result.gamesSkipped += weekResult.skipped
      result.errors.push(...weekResult.errors)
      result.details.weeksProcessed.push(week)
      
      // Add a small delay between requests to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    result.success = result.errors.length === 0
    console.log(`Full season update complete: ${result.gamesUpdated} updated, ${result.gamesAdded} added, ${result.gamesSkipped} skipped`)

  } catch (error) {
    result.errors.push(`Service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.error('Full season update service error:', error)
  }

  return result
}

// Update preseason only using 2025PRE
async function updatePreseason(season: number): Promise<UpdateResult> {
  const result: UpdateResult = {
    success: false,
    gamesUpdated: 0,
    gamesAdded: 0,
    gamesSkipped: 0,
    errors: [],
    details: {
      season,
      timestamp: new Date().toISOString(),
      weeksProcessed: []
    }
  }

  try {
    console.log(`Starting preseason update for ${season}...`)
    
    const supabase = await getSupabase()
    
    // Get preseason data using the PRE season type
    const preseasonSeason = `${season}PRE`
    console.log(`Fetching preseason data for ${preseasonSeason}...`)
    
    const games = await sportsDataService.getGames(preseasonSeason)
    console.log(`Found ${games.length} preseason games`)
    
    if (games.length === 0) {
      result.errors.push('No preseason games found')
      return result
    }
    
    // Group games by week
    const gamesByWeek = games.reduce((acc, game) => {
      if (!acc[game.Week]) {
        acc[game.Week] = []
      }
      acc[game.Week].push(game)
      return acc
    }, {} as Record<number, any[]>)
    
    // Process each week
    for (const [week, weekGames] of Object.entries(gamesByWeek)) {
      const weekNum = parseInt(week)
      try {
        console.log(`Processing preseason week ${weekNum} with ${weekGames.length} games`)
        
        // Use the first game to determine season format
        const firstGame = weekGames[0]
        const seasonFormat = mapWeekToSeason(weekNum, firstGame.DateTime, firstGame.SeasonType)
        console.log(`Using season format: ${seasonFormat} for preseason Week ${weekNum}`)
        
        // Process each game in the week
        for (const game of weekGames) {
          try {
            const matchup = sportsDataService.convertGameToMatchup(game)
            matchup.season = seasonFormat
            
            // Insert or update the matchup
            const { data: existingMatchup, error: selectError } = await supabase
              .from('matchups')
              .select('id')
              .eq('week', matchup.week)
              .eq('away_team', matchup.away_team)
              .eq('home_team', matchup.home_team)
              .single()
            
            if (selectError && selectError.code !== 'PGRST116') {
              throw selectError
            }
            
            if (existingMatchup) {
              // Update existing matchup
              const { error: updateError } = await supabase
                .from('matchups')
                .update({
                  ...matchup,
                  updated_at: new Date().toISOString(),
                  last_api_update: new Date().toISOString(),
                  api_update_count: supabase.raw('api_update_count + 1')
                })
                .eq('id', existingMatchup.id)
              
              if (updateError) {
                throw updateError
              }
              
              result.gamesUpdated++
            } else {
              // Insert new matchup
              const { error: insertError } = await supabase
                .from('matchups')
                .insert(matchup)
              
              if (insertError) {
                throw insertError
              }
              
              result.gamesAdded++
            }
          } catch (error) {
            const errorMsg = `Error processing preseason game ${game.GameKey}: ${error}`
            console.error(errorMsg)
            result.errors.push(errorMsg)
          }
        }
        
        result.details.weeksProcessed.push(weekNum)
      } catch (error) {
        const errorMsg = `Error processing preseason week ${weekNum}: ${error}`
        console.error(errorMsg)
        result.errors.push(errorMsg)
      }
    }

    result.success = result.errors.length === 0
    console.log(`Preseason update complete: ${result.gamesUpdated} updated, ${result.gamesAdded} added, ${result.gamesSkipped} skipped`)

  } catch (error) {
    result.errors.push(`Service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.error('Preseason update service error:', error)
  }

  return result
}

// Update regular season only (Weeks 4-21)
async function updateRegularSeason(season: number): Promise<UpdateResult> {
  const result: UpdateResult = {
    success: false,
    gamesUpdated: 0,
    gamesAdded: 0,
    gamesSkipped: 0,
    errors: [],
    details: {
      season,
      timestamp: new Date().toISOString(),
      weeksProcessed: []
    }
  }

  try {
    console.log(`Starting regular season update for ${season}...`)
    
    const supabase = await getSupabase()
    const regularSeasonWeeks = Array.from({ length: 18 }, (_, i) => i + 4) // Weeks 4-21
    
    for (const week of regularSeasonWeeks) {
      const weekResult = await processWeekGames(season, week, supabase)
      
      result.gamesUpdated += weekResult.updated
      result.gamesAdded += weekResult.added
      result.gamesSkipped += weekResult.skipped
      result.errors.push(...weekResult.errors)
      result.details.weeksProcessed.push(week)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    result.success = result.errors.length === 0
    console.log(`Regular season update complete: ${result.gamesUpdated} updated, ${result.gamesAdded} added, ${result.gamesSkipped} skipped`)

  } catch (error) {
    result.errors.push(`Service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.error('Regular season update service error:', error)
  }

  return result
}

// Update postseason only (Weeks 22-25)
async function updatePostseason(season: number): Promise<UpdateResult> {
  const result: UpdateResult = {
    success: false,
    gamesUpdated: 0,
    gamesAdded: 0,
    gamesSkipped: 0,
    errors: [],
    details: {
      season,
      timestamp: new Date().toISOString(),
      weeksProcessed: []
    }
  }

  try {
    console.log(`Starting postseason update for ${season}...`)
    
    const supabase = await getSupabase()
    const postseasonWeeks = [22, 23, 24, 25] // POST1, POST2, POST3, POST4
    
    for (const week of postseasonWeeks) {
      const weekResult = await processWeekGames(season, week, supabase)
      
      result.gamesUpdated += weekResult.updated
      result.gamesAdded += weekResult.added
      result.gamesSkipped += weekResult.skipped
      result.errors.push(...weekResult.errors)
      result.details.weeksProcessed.push(week)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    result.success = result.errors.length === 0
    console.log(`Postseason update complete: ${result.gamesUpdated} updated, ${result.gamesAdded} added, ${result.gamesSkipped} skipped`)

  } catch (error) {
    result.errors.push(`Service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.error('Postseason update service error:', error)
  }

  return result
}
