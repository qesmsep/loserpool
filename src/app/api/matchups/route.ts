import { NextRequest, NextResponse } from 'next/server'
import { MatchupUpdateService } from '@/lib/matchup-update-service'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week')
    
    const updateService = new MatchupUpdateService()
    
    if (week === 'next') {
      // Get next week matchups
      const matchups = await updateService.getNextWeekMatchups()
      const weekDisplay = await updateService.getNextWeekDisplay()
      
      return NextResponse.json({
        success: true,
        week_display: weekDisplay,
        matchups: matchups,
        count: matchups.length
      })
    } else {
      // Get current week matchups
      const matchups = await updateService.getCurrentWeekMatchups()
      const weekDisplay = await updateService.getCurrentWeekDisplay()
      
      return NextResponse.json({
        success: true,
        week_display: weekDisplay,
        matchups: matchups,
        count: matchups.length
      })
    }
    
  } catch (error) {
    console.error('Error fetching matchups:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      matchups: [],
      count: 0
    }, { status: 500 })
  }
}
