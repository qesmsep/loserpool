import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { matchupUpdateServiceSportsData } from '@/lib/matchup-update-service-sportsdata'

export async function POST(request: Request) {
  try {
    // Verify admin access
    await requireAdmin()

    const body = await request.json()
    const { season = 2024, week, action = 'current' } = body

    console.log(`Admin matchup update request: season=${season}, week=${week}, action=${action}`)

    let result: any

    switch (action) {
      case 'current':
        // Update current week
        result = await matchupUpdateServiceSportsData.updateCurrentWeekMatchups(season)
        break
        
      case 'next':
        // Update next week
        result = await matchupUpdateServiceSportsData.updateNextWeekMatchups(season)
        break
        
      case 'specific':
        // Update specific week
        if (!week) {
          return NextResponse.json(
            { error: 'Week parameter required for specific week update' },
            { status: 400 }
          )
        }
        result = await matchupUpdateServiceSportsData.updateWeekMatchups(season, week)
        break
        
      case 'season':
        // Update entire season
        result = await matchupUpdateServiceSportsData.updateSeasonSchedule(season)
        break
        
      case 'sync-week':
        // Sync current week with database
        result = await matchupUpdateServiceSportsData.syncCurrentWeek(season)
        break
        
      case 'test':
        // Test the service
        result = await matchupUpdateServiceSportsData.testService()
        break
        
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: current, next, specific, season, sync-week, test` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      season,
      week,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in admin matchup update:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also allow GET for testing
export async function GET(request: Request) {
  try {
    // Verify admin access
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const season = parseInt(searchParams.get('season') || '2024')
    const week = searchParams.get('week') ? parseInt(searchParams.get('week')!) : undefined
    const action = searchParams.get('action') || 'test'

    console.log(`Admin matchup update GET request: season=${season}, week=${week}, action=${action}`)

    let result: any

    switch (action) {
      case 'test':
        // Test the service
        result = await matchupUpdateServiceSportsData.testService()
        break
        
      case 'current':
        // Update current week
        result = await matchupUpdateServiceSportsData.updateCurrentWeekMatchups(season)
        break
        
      case 'next':
        // Update next week
        result = await matchupUpdateServiceSportsData.updateNextWeekMatchups(season)
        break
        
      case 'specific':
        // Update specific week
        if (!week) {
          return NextResponse.json(
            { error: 'Week parameter required for specific week update' },
            { status: 400 }
          )
        }
        result = await matchupUpdateServiceSportsData.updateWeekMatchups(season, week)
        break
        
      case 'sync-week':
        // Sync current week with database
        result = await matchupUpdateServiceSportsData.syncCurrentWeek(season)
        break
        
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: test, current, next, specific, sync-week` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      season,
      week,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in admin matchup update GET:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
