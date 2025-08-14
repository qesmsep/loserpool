import { NextResponse } from 'next/server'
import { MatchupUpdateService } from '@/lib/matchup-update-service'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

export async function GET() {
  try {
    console.log('Testing ALL 25 weeks scraping...')

    const updateService = new MatchupUpdateService()
    const supabase = createServiceRoleClient()

    // Test the first few weeks to see what's happening
    const testWeeks = [
      { week: 1, seasonType: 'PRE' as const },
      { week: 2, seasonType: 'PRE' as const },
      { week: 3, seasonType: 'PRE' as const },
      { week: 1, seasonType: 'REG' as const },
      { week: 2, seasonType: 'REG' as const }
    ]

    const results = []
    let totalGames = 0
    let weeksUpdated = 0

    for (const weekInfo of testWeeks) {
      try {
        console.log(`Testing ${weekInfo.seasonType}${weekInfo.week}...`)
        const scraper = new NFLScheduleScraper()
        const schedule = await scraper.scrapeWeekSchedule(weekInfo.week, weekInfo.seasonType)

        const result: any = {
          week: `${weekInfo.seasonType}${weekInfo.week}`,
          games_found: schedule.games.length,
          week_number: schedule.week_number,
          season_type: schedule.season_type,
          has_games: schedule.games.length > 0
        }

        results.push(result)

        if (schedule.games && schedule.games.length > 0) {
          console.log(`Found ${schedule.games.length} games for ${weekInfo.seasonType}${weekInfo.week} - attempting database update...`)

                    // Test the conversion to matchup format
          const firstGame = schedule.games[0]
          console.log('DEBUG: First game from scraper:', JSON.stringify(firstGame, null, 2))
          
          const convertedGame = NFLScheduleScraper.convertToMatchupFormat(firstGame, schedule.week_number, schedule.season_type)
          console.log('DEBUG: Converted game format:', JSON.stringify(convertedGame, null, 2))
          
          // Show a few sample games to see what teams are being found
          console.log('DEBUG: Sample games from scraper:')
          schedule.games.slice(0, 3).forEach((game, index) => {
            console.log(`Game ${index + 1}: ${game.away_team} @ ${game.home_team} - ${game.game_time}`)
          })

          // Test database insertion
          try {
            await updateService.updateMatchupsForWeek(schedule)
            totalGames += schedule.games.length
            weeksUpdated++
            console.log(`✅ SUCCESS: Updated ${schedule.games.length} games for ${weekInfo.seasonType}${weekInfo.week}`)
          } catch (dbError) {
            console.error(`❌ DATABASE ERROR for ${weekInfo.seasonType}${weekInfo.week}:`, dbError)
            console.error('Full error details:', JSON.stringify(dbError, null, 2))
            result.error = `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
            result.error_details = dbError instanceof Error ? dbError.stack : 'No stack trace'
          }
        } else {
          console.log(`⚠️ No games found for ${weekInfo.seasonType}${weekInfo.week}`)
        }
      } catch (error) {
        const errorMsg = `❌ Error updating ${weekInfo.seasonType}${weekInfo.week}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(errorMsg)
        results.push({
          week: `${weekInfo.seasonType}${weekInfo.week}`,
          games_found: 0,
          error: errorMsg
        })
      }
    }

    // Check final database state
    const { data: allMatchups, error: dbError } = await supabase
      .from('matchups')
      .select('*')

    if (dbError) {
      console.error('Database error:', dbError)
    }

    return NextResponse.json({
      success: true,
      test_results: results,
      summary: {
        total_games: totalGames,
        weeks_updated: weeksUpdated,
        database_matchups_count: allMatchups?.length || 0
      },
      database_matchups: allMatchups?.slice(0, 5) || [] // Show first 5
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
