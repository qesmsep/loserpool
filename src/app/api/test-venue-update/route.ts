import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { matchupUpdateServiceSportsData } from '@/lib/matchup-update-service-sportsdata'

export async function POST(request: Request) {
  try {
    // Verify admin access
    await requireAdmin()

    const body = await request.json()
    const { season = 2024, week = 1 } = body

    console.log(`Testing venue update for ${season} Week ${week}`)

    // Update matchups for the specified week
    const result = await matchupUpdateServiceSportsData.updateWeekMatchups(season, week)

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in venue update test:', error)
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
    const season = searchParams.get('season') || '2024'
    const week = searchParams.get('week') || '1'

    console.log(`Testing venue update for ${season} Week ${week}`)

    // Update matchups for the specified week
    const result = await matchupUpdateServiceSportsData.updateWeekMatchups(parseInt(season), parseInt(week))

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in venue update test:', error)
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
