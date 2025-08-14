import { NextResponse } from 'next/server'
import { ScheduleCache } from '@/lib/schedule-cache'

export async function GET() {
  try {
    // Test cache functionality
    const cachedCurrent = await ScheduleCache.getCachedSchedule('current')
    const cachedNext = await ScheduleCache.getCachedSchedule('next')
    
    return NextResponse.json({
      success: true,
      cache_status: {
        current_week: {
          cached: !!cachedCurrent,
          valid: ScheduleCache.isCacheValid(cachedCurrent),
          last_updated: cachedCurrent?.last_updated,
          expires_at: cachedCurrent?.expires_at
        },
        next_week: {
          cached: !!cachedNext,
          valid: ScheduleCache.isCacheValid(cachedNext),
          last_updated: cachedNext?.last_updated,
          expires_at: cachedNext?.expires_at
        }
      }
    })
  } catch (error) {
    console.error('Error testing cache:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
