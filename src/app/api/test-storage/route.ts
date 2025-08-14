import { NextResponse } from 'next/server'
import { ScheduleStorage } from '@/lib/schedule-storage'

export async function GET() {
  try {
    // Test if we can access the stored schedules table
    const allSchedules = await ScheduleStorage.getAllStoredSchedules()
    
    return NextResponse.json({
      success: true,
      table_exists: true,
      stored_schedules_count: allSchedules.length,
      schedules: allSchedules.map(s => ({
        week_type: s.week_type,
        week_display: s.week_display,
        games_count: s.games.length,
        last_updated: s.last_updated
      }))
    })
  } catch (error) {
    console.error('Error testing storage:', error)
    return NextResponse.json({
      success: false,
      table_exists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
