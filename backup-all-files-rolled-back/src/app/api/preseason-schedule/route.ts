import { NextRequest, NextResponse } from 'next/server'
import { ScheduleStorage } from '@/lib/schedule-storage'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week')
    const weekType = week === 'next' ? 'next' : 'current'
    
    // Try to get stored data first
    const storedSchedule = await ScheduleStorage.getStoredSchedule(weekType)
    
    if (ScheduleStorage.isScheduleRecent(storedSchedule)) {
      console.log(`Returning stored ${weekType} week schedule (stored at ${storedSchedule?.last_updated})`)
      return NextResponse.json({
        success: true,
        schedule: {
          current_week: storedSchedule?.week_display,
          games: storedSchedule?.games,
          last_updated: storedSchedule?.last_updated
        }
      })
    }
    
    // No recent data available - return error
    console.log(`No recent stored data for ${weekType} week`)
    return NextResponse.json({
      success: false,
      error: `No recent schedule data available for ${weekType} week. Please wait for the next scheduled update.`,
      schedule: null
    }, { status: 404 })
    
  } catch (error) {
    console.error('Error fetching preseason schedule:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      schedule: null
    }, { status: 500 })
  }
}
