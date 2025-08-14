import { NextRequest, NextResponse } from 'next/server'
import { preseasonDataService } from '@/lib/preseason-data-service'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Preseason Data Service...')
    
    const schedule = await preseasonDataService.getCurrentWeekSchedule()
    
    return NextResponse.json({
      success: true,
      current_week: schedule.current_week,
      games_count: schedule.games.length,
      games: schedule.games,
      last_updated: schedule.last_updated
    })
    
  } catch (error) {
    console.error('Preseason data service test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      current_week: 'ERROR',
      games_count: 0,
      games: []
    }, { status: 500 })
  }
}
