import { NextResponse } from 'next/server'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

export async function GET() {
  try {
    console.log('Testing current week scraping...')
    
    const scraper = new NFLScheduleScraper()
    
    // Get current week info
    const currentWeekInfo = await scraper.getCurrentWeekInfo()
    console.log('Current week info:', currentWeekInfo)
    
    // Scrape current week schedule
    const schedule = await scraper.scrapeWeekSchedule(currentWeekInfo.weekNumber, currentWeekInfo.seasonType)
    console.log('Scraped schedule:', schedule)
    
    return NextResponse.json({
      success: true,
      current_week_info: currentWeekInfo,
      schedule: schedule,
      games_count: schedule.games.length
    })
  } catch (error) {
    console.error('Error in current week scrape test:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
