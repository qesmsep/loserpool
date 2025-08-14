import { NextRequest, NextResponse } from 'next/server'
import { mockNFLDataService } from '@/lib/mock-nfl-data'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Mock NFL Data Service...')
    
    const schedule = await mockNFLDataService.getCurrentWeekSchedule()
    
    return NextResponse.json({
      success: true,
      current_week: schedule.current_week,
      games_count: schedule.games.length,
      games: schedule.games,
      last_updated: schedule.last_updated
    })
  } catch (error) {
    console.error('Mock NFL service test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      current_week: 'Unknown',
      games_count: 0,
      games: []
    }, { status: 500 })
  }
}
