import { NextRequest, NextResponse } from 'next/server'
import { nflScraperService } from '@/lib/nfl-scraper'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Next Week NFL Schedule...')
    
    const schedule = await nflScraperService.getNextWeekSchedule()
    
    return NextResponse.json({
      success: true,
      current_week: schedule.current_week,
      games_count: schedule.games.length,
      games: schedule.games,
      last_updated: schedule.last_updated
    })
  } catch (error) {
    console.error('Next week NFL schedule test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      current_week: 'Unknown',
      games_count: 0,
      games: []
    }, { status: 500 })
  }
}
