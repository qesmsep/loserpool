import { NextResponse } from 'next/server'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

export async function GET() {
  try {
    console.log('Testing week schedule scraper...')
    
    const scraper = new NFLScheduleScraper()
    
    // Test scraping Preseason Week 2
    const schedule = await scraper.scrapeWeekSchedule(2, 'PRE')
    
    return NextResponse.json({
      success: true,
      schedule: schedule
    })
  } catch (error) {
    console.error('Error testing week schedule:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
