import { NextResponse } from 'next/server'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

export async function GET() {
  try {
    console.log('Testing current week info scraper...')
    
    const scraper = new NFLScheduleScraper()
    const currentWeekInfo = await scraper.getCurrentWeekInfo()
    
    return NextResponse.json({
      success: true,
      current_week_info: currentWeekInfo
    })
  } catch (error) {
    console.error('Error testing current week info:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
