import { NextRequest, NextResponse } from 'next/server'
import { espnService } from '@/lib/espn-service'

export async function GET() {
  try {
    console.log('Testing ESPN current week detection...')

    // Test current week for 2025
    const currentWeek = await espnService.getCurrentNFLWeek(2025)
    
    // Also get games for week 2 specifically
    const week2Games = await espnService.getNFLSchedule(2025, 2, 'PRE')
    
    return NextResponse.json({
      success: true,
      current_week: currentWeek,
      week2_games_count: week2Games.length,
      sample_week2_games: week2Games.slice(0, 3).map(game => {
        const converted = espnService.convertToMatchupFormat(game)
        return {
          game: `${converted?.away_team} @ ${converted?.home_team}`,
          score: `${converted?.away_score}-${converted?.home_score}`,
          status: converted?.status
        }
      })
    })

  } catch (error) {
    console.error('Error testing current week:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
