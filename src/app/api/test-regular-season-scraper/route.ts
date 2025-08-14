import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('Testing NFL regular season scraper...')
    
    // Get current season year
    const { data: yearSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_season_year')
      .single()

    const currentYear = yearSetting?.value || '2025'
    console.log(`Using season year: ${currentYear}`)

    // Test with just the first few weeks to see if it works
    const testWeeks: Array<{ week: number; seasonType: 'REG'; url: string }> = [
      { week: 1, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG1/` },
      { week: 2, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG2/` },
      { week: 3, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG3/` }
    ]

    console.log(`Testing ${testWeeks.length} regular season weeks for ${currentYear}-${parseInt(currentYear) + 1} season`)

    const scraper = new NFLScheduleScraper()
    let totalGames = 0
    let weeksUpdated = 0
    const errors: string[] = []
    const results: Array<{ success: boolean; week: string; games: number; error?: string; schedule?: any }> = []

    // Test each week individually
    for (const weekInfo of testWeeks) {
      try {
        console.log(`=== TESTING ${weekInfo.seasonType}${weekInfo.week} from ${weekInfo.url} ===`)
        const schedule = await scraper.scrapeWeekSchedule(weekInfo.week, weekInfo.seasonType)
        
        console.log(`Schedule result for ${weekInfo.seasonType}${weekInfo.week}:`, {
          week_number: schedule.week_number,
          season_type: schedule.season_type,
          games_count: schedule.games?.length || 0,
          has_games: schedule.games && schedule.games.length > 0
        })
        
        if (schedule.games && schedule.games.length > 0) {
          console.log(`Found ${schedule.games.length} games for ${weekInfo.seasonType}${weekInfo.week}`)
          totalGames += schedule.games.length
          weeksUpdated++
          results.push({ 
            success: true, 
            week: `${weekInfo.seasonType}${weekInfo.week}`, 
            games: schedule.games.length,
            schedule: schedule
          })
        } else {
          console.log(`⚠️ No games found for ${weekInfo.seasonType}${weekInfo.week} (likely not scheduled yet)`)
          results.push({ 
            success: true, 
            week: `${weekInfo.seasonType}${weekInfo.week}`, 
            games: 0,
            schedule: schedule
          })
        }
      } catch (error) {
        const errorMsg = `❌ Error testing ${weekInfo.seasonType}${weekInfo.week}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(errorMsg)
        console.error('Full error details:', error)
        errors.push(errorMsg)
        results.push({ 
          success: false, 
          week: `${weekInfo.seasonType}${weekInfo.week}`, 
          games: 0, 
          error: errorMsg 
        })
      }

      // Add a delay between tests
      if (weekInfo !== testWeeks[testWeeks.length - 1]) {
        console.log('Waiting 5 seconds before next test...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }

    const executionTime = Date.now() - startTime
    
    console.log(`Regular season scraper test completed in ${executionTime}ms: ${totalGames} total games found across ${weeksUpdated} weeks`)

    return NextResponse.json({
      success: true,
      total_games: totalGames,
      weeks_with_games: weeksUpdated,
      execution_time_ms: executionTime,
      results: results,
      errors: errors.length > 0 ? errors : null
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Error in regular season scraper test:', error)
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      execution_time_ms: executionTime
    }, { status: 500 })
  }
}
