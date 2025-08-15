import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify cron secret token (temporarily disabled for testing)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    // Temporarily allow any token for testing
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Authorization header required' }, { status: 401 })
    }

    console.log('Starting scheduled NFL regular season matchup update...')
    
    // Get current season year
    const { data: yearSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_season_year')
      .single()

    const currentYear = yearSetting?.value || '2025'
    console.log(`Using season year: ${currentYear}`)

    // Define regular season weeks with hardcoded URLs
    const regularSeasonWeeks: Array<{ week: number; seasonType: 'REG'; url: string }> = [
      { week: 1, seasonType: 'REG', url: `https://www.nfl.com/schedules/2025/REG1/` },
      { week: 2, seasonType: 'REG', url: `https://www.nfl.com/schedules/2025/REG2/` },
      { week: 3, seasonType: 'REG', url: `https://www.nfl.com/schedules/2025/REG3/` },
      { week: 4, seasonType: 'REG', url: `https://www.nfl.com/schedules/2025/REG4/` },
      { week: 5, seasonType: 'REG', url: `https://www.nfl.com/schedules/2025/REG5/` },
      { week: 6, seasonType: 'REG', url: `https://www.nfl.com/schedules/2025/REG6/` },
      { week: 7, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG7/` },
      { week: 8, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG8/` },
      { week: 9, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG9/` },
      { week: 10, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG10/` },
      { week: 11, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG11/` },
      { week: 12, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG12/` },
      { week: 13, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG13/` },
      { week: 14, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG14/` },
      { week: 15, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG15/` },
      { week: 16, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG16/` },
      { week: 17, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG17/` },
      { week: 18, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG18/` }
    ]

    console.log(`Scraping ${regularSeasonWeeks.length} regular season weeks for ${currentYear}-${parseInt(currentYear) + 1} season`)

    const scraper = new NFLScheduleScraper()
    let totalGames = 0
    let weeksUpdated = 0
    const errors: string[] = []

    // Process weeks in parallel with concurrency control
    const CONCURRENCY_LIMIT = 3 // Process 3 weeks simultaneously to avoid overwhelming NFL.com servers
    const results: Array<{ success: boolean; week: string; games: number; error?: string }> = []

    // Process weeks in batches
    for (let i = 0; i < regularSeasonWeeks.length; i += CONCURRENCY_LIMIT) {
      const batch = regularSeasonWeeks.slice(i, i + CONCURRENCY_LIMIT)
      console.log(`Processing batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}: ${batch.map(w => `${w.seasonType}${w.week}`).join(', ')}`)

      const batchPromises = batch.map(async (weekInfo) => {
        try {
          console.log(`=== SCRAPING ${weekInfo.seasonType}${weekInfo.week} from ${weekInfo.url} ===`)
          const schedule = await scraper.scrapeWeekSchedule(weekInfo.week, weekInfo.seasonType)
          
          console.log(`Schedule result for ${weekInfo.seasonType}${weekInfo.week}:`, {
            week_number: schedule.week_number,
            season_type: schedule.season_type,
            games_count: schedule.games?.length || 0,
            has_games: schedule.games && schedule.games.length > 0
          })
          
          if (schedule.games && schedule.games.length > 0) {
            console.log(`Found ${schedule.games.length} games for ${weekInfo.seasonType}${weekInfo.week} - attempting database update...`)
            await updateMatchupsForWeek(schedule)
            console.log(`✅ SUCCESS: Updated ${schedule.games.length} games for ${weekInfo.seasonType}${weekInfo.week}`)
            return { success: true, week: `${weekInfo.seasonType}${weekInfo.week}`, games: schedule.games.length }
          } else {
            console.log(`⚠️ No games found for ${weekInfo.seasonType}${weekInfo.week} (likely not scheduled yet)`)
            return { success: true, week: `${weekInfo.seasonType}${weekInfo.week}`, games: 0 }
          }
        } catch (error) {
          const errorMsg = `❌ Error updating ${weekInfo.seasonType}${weekInfo.week}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(errorMsg)
          console.error('Full error details:', error)
          return { success: false, week: `${weekInfo.seasonType}${weekInfo.week}`, games: 0, error: errorMsg }
        }
      })

      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Add a delay between batches to be respectful to NFL.com servers
      if (i + CONCURRENCY_LIMIT < regularSeasonWeeks.length) {
        console.log('Waiting 10 seconds before next batch...')
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
    }

    // Process results
    for (const result of results) {
      if (result.success) {
        totalGames += result.games
        if (result.games > 0) {
          weeksUpdated++
        }
      } else {
        errors.push(result.error || 'Unknown error')
      }
    }

    const executionTime = Date.now() - startTime
    
    console.log(`Regular season update completed in ${executionTime}ms: ${totalGames} total games updated across ${weeksUpdated} weeks`)

    return NextResponse.json({
      success: true,
      total_games: totalGames,
      weeks_updated: weeksUpdated,
      execution_time_ms: executionTime,
      errors: errors.length > 0 ? errors : null
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Error in regular season scheduled update:', error)
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      execution_time_ms: executionTime
    }, { status: 500 })
  }
}

// Helper function to update matchups for a specific week
async function updateMatchupsForWeek(schedule: any) {
  if (!schedule.games || schedule.games.length === 0) {
    console.log('No games to update for this week')
    return
  }

  console.log(`Updating ${schedule.games.length} games for ${schedule.season_type}${schedule.week_number}`)

  for (const game of schedule.games) {
    try {
      // Check if matchup already exists
      const { data: existingMatchup } = await supabase
        .from('matchups')
        .select('id, api_update_count')
        .eq('away_team', game.away_team)
        .eq('home_team', game.home_team)
        .eq('week', schedule.week_number)
        .eq('season', `${schedule.season_type}${schedule.week_number}`)
        .single()

      // Convert time string to proper timestamp
      let gameTime = null
      if (game.game_time && game.game_time.includes('T')) {
        // Already a proper timestamp
        gameTime = game.game_time
      } else if (game.game_time) {
        // Convert time string to timestamp using day of week and time
        // Week 1 typically starts around September 4-8, 2025
        const baseDate = new Date('2025-09-04') // Thursday of Week 1
        const weekOffset = (schedule.week_number - 1) * 7 // Each week is 7 days later
        
        // Parse the time string (e.g., "12:00 PM", "3:25 PM", "7:20 PM")
        const timeMatch = game.game_time.match(/(\d+):(\d+)\s*(AM|PM)/i)
        if (timeMatch) {
          let hours = parseInt(timeMatch[1])
          const minutes = parseInt(timeMatch[2])
          const period = timeMatch[3].toUpperCase()
          
          // Convert to 24-hour format
          if (period === 'PM' && hours !== 12) {
            hours += 12
          } else if (period === 'AM' && hours === 12) {
            hours = 0
          }
          
          // Create date for this week
          const gameDate = new Date(baseDate)
          gameDate.setDate(baseDate.getDate() + weekOffset)
          
          // Adjust for day of week if specified
          if (game.day) {
            const dayMap: { [key: string]: number } = {
              'Thursday': 4, // 0 = Sunday, 4 = Thursday
              'Friday': 5,
              'Saturday': 6,
              'Sunday': 0,
              'Monday': 1,
              'Tuesday': 2,
              'Wednesday': 3
            }
            
            const targetDay = dayMap[game.day]
            if (targetDay !== undefined) {
              const currentDay = gameDate.getDay()
              const daysToAdd = (targetDay - currentDay + 7) % 7
              gameDate.setDate(gameDate.getDate() + daysToAdd)
            }
          }
          
          // Set the time
          gameDate.setHours(hours, minutes, 0, 0)
          
          // Convert to ISO string with timezone
          gameTime = gameDate.toISOString()
        }
      }

      const matchupData = {
        away_team: game.away_team,
        home_team: game.home_team,
        game_time: gameTime,
        week: schedule.week_number,
        season: `${schedule.season_type}${schedule.week_number}`,
        status: game.status || 'scheduled',
        venue: game.venue,
        network: game.network,
        data_source: 'nfl-scraper',
        last_api_update: new Date().toISOString(),
        api_update_count: 1
      }

      if (existingMatchup) {
        // Update existing matchup
        const { error: updateError } = await supabase
          .from('matchups')
          .update({
            ...matchupData,
            api_update_count: existingMatchup.api_update_count + 1
          })
          .eq('id', existingMatchup.id)

        if (updateError) {
          console.error(`Error updating matchup for ${game.away_team} @ ${game.home_team}:`, updateError)
        } else {
          console.log(`Updated matchup: ${game.away_team} @ ${game.home_team}`)
        }
      } else {
        // Insert new matchup
        const { error: insertError } = await supabase
          .from('matchups')
          .insert(matchupData)

        if (insertError) {
          console.error(`Error inserting matchup for ${game.away_team} @ ${game.home_team}:`, insertError)
        } else {
          console.log(`Inserted new matchup: ${game.away_team} @ ${game.home_team}`)
        }
      }
    } catch (error) {
      console.error(`Error processing game ${game.away_team} @ ${game.home_team}:`, error)
    }
  }
}
