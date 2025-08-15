import { NextResponse } from 'next/server'
import { teamUpdateService } from '@/lib/team-update-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action = 'update', season = 2024 } = body

    console.log(`Cron team update request: action=${action}, season=${season}`)

    switch (action) {
      case 'update':
        const result = await teamUpdateService.updateAllTeams(season)
        return NextResponse.json({
          success: result.success,
          message: result.message,
          teamsUpdated: result.teamsUpdated,
          timestamp: new Date().toISOString()
        })

      case 'test':
        const testResult = await teamUpdateService.testService()
        return NextResponse.json({
          success: testResult,
          message: testResult ? 'Team update service test successful' : 'Team update service test failed',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "update" or "test"' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in cron team update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'test'
    const season = parseInt(searchParams.get('season') || '2024')

    console.log(`Cron team update GET request: action=${action}, season=${season}`)

    switch (action) {
      case 'update':
        const result = await teamUpdateService.updateAllTeams(season)
        return NextResponse.json({
          success: result.success,
          message: result.message,
          teamsUpdated: result.teamsUpdated,
          timestamp: new Date().toISOString()
        })

      case 'test':
        const testResult = await teamUpdateService.testService()
        return NextResponse.json({
          success: testResult,
          message: testResult ? 'Team update service test successful' : 'Team update service test failed',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "update" or "test"' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in cron team update GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
