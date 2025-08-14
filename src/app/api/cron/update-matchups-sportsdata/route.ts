import { NextResponse } from 'next/server'
import { matchupUpdateServiceSportsData } from '@/lib/matchup-update-service-sportsdata'

export async function POST(request: Request) {
  try {
    // Verify cron secret token
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      console.error('Invalid cron secret token')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { season = 2024, action = 'current' } = body

    console.log(`Cron matchup update: season=${season}, action=${action}`)

    let result: any

    switch (action) {
      case 'current':
        // Update current week matchups
        result = await matchupUpdateServiceSportsData.updateCurrentWeekMatchups(season)
        break
        
      case 'next':
        // Update next week matchups
        result = await matchupUpdateServiceSportsData.updateNextWeekMatchups(season)
        break
        
      case 'sync-week':
        // Sync current week with database
        result = await matchupUpdateServiceSportsData.syncCurrentWeek(season)
        break
        
      case 'full-update':
        // Do both sync and current week update
        const syncResult = await matchupUpdateServiceSportsData.syncCurrentWeek(season)
        const updateResult = await matchupUpdateServiceSportsData.updateCurrentWeekMatchups(season)
        result = {
          sync: syncResult,
          update: updateResult
        }
        break
        
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: current, next, sync-week, full-update` },
          { status: 400 }
        )
    }

    console.log(`Cron matchup update completed:`, result)

    return NextResponse.json({
      success: true,
      action,
      season,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in cron matchup update:', error)
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

// Also allow GET for manual testing
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const season = parseInt(searchParams.get('season') || '2024')
    const action = searchParams.get('action') || 'current'

    console.log(`Manual cron matchup update: season=${season}, action=${action}`)

    let result: any

    switch (action) {
      case 'current':
        // Update current week matchups
        result = await matchupUpdateServiceSportsData.updateCurrentWeekMatchups(season)
        break
        
      case 'next':
        // Update next week matchups
        result = await matchupUpdateServiceSportsData.updateNextWeekMatchups(season)
        break
        
      case 'sync-week':
        // Sync current week with database
        result = await matchupUpdateServiceSportsData.syncCurrentWeek(season)
        break
        
      case 'test':
        // Test the service
        result = await matchupUpdateServiceSportsData.testService()
        break
        
      case 'full-update':
        // Do both sync and current week update
        const syncResult = await matchupUpdateServiceSportsData.syncCurrentWeek(season)
        const updateResult = await matchupUpdateServiceSportsData.updateCurrentWeekMatchups(season)
        result = {
          sync: syncResult,
          update: updateResult
        }
        break
        
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: current, next, sync-week, test, full-update` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      season,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in manual cron matchup update:', error)
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
