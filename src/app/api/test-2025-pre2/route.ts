import { NextRequest, NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing 2025 PRE2 games from SportsData.io...')
    
    // Get 2025 week 2 games (which should be PRE2)
    const games2025Week2 = await sportsDataService.getGames(2025, 2)
    
    // Filter for preseason games (seasonType = 1)
    const pre2Games = games2025Week2.filter(game => game.SeasonType === 1)
    
    return NextResponse.json({
      success: true,
      message: '2025 PRE2 test completed',
      data: {
        totalGames: games2025Week2.length,
        preseasonGames: pre2Games.length,
        pre2Games: pre2Games.map(game => ({
          gameKey: game.GameKey,
          seasonType: game.SeasonType,
          week: game.Week,
          awayTeam: game.AwayTeam,
          homeTeam: game.HomeTeam,
          dateTime: game.DateTime,
          status: game.Status,
          awayScore: game.AwayScore,
          homeScore: game.HomeScore
        }))
      }
    })
    
  } catch (error) {
    console.error('2025 PRE2 test failed:', error)
    return NextResponse.json({
      success: false,
      error: '2025 PRE2 test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
