import { NextResponse } from 'next/server'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

export async function GET() {
  try {
    console.log('Testing REG1 scraping directly...')
    
    const scraper = new NFLScheduleScraper()
    const schedule = await scraper.scrapeWeekSchedule(1, 'REG')
    
    console.log('REG1 scraping result:', {
      week_number: schedule.week_number,
      season_type: schedule.season_type,
      games_count: schedule.games?.length || 0,
      has_games: schedule.games && schedule.games.length > 0
    })
    
    // Show first few games
    const sampleGames = schedule.games?.slice(0, 3) || []
    
    return NextResponse.json({
      success: true,
      schedule_info: {
        week_number: schedule.week_number,
        season_type: schedule.season_type,
        games_count: schedule.games?.length || 0
      },
      sample_games: sampleGames,
      first_game_full: schedule.games?.[0] || null
    })
    
  } catch (error) {
    console.error('REG1 scraping error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
