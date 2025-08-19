import { NextRequest, NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing season type mapping...')
    
    // Test different season types for 2025
    const results: any[] = []
    
    for (const seasonType of [1, 2, 3, 4]) {
      try {
        const games = await sportsDataService.getGames(2025, 1, seasonType)
        const sampleGame = games[0]
        
        results.push({
          seasonType,
          gamesCount: games.length,
          sampleGame: sampleGame ? {
            gameKey: sampleGame.GameKey,
            week: sampleGame.Week,
            awayTeam: sampleGame.AwayTeam,
            homeTeam: sampleGame.HomeTeam,
            dateTime: sampleGame.DateTime,
            status: sampleGame.Status
          } : null
        })
      } catch (error) {
        results.push({
          seasonType,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Also test week 2 for season type 1 and 2
    const week2Season1 = await sportsDataService.getGames(2025, 2)
    const week2Season1Sample = week2Season1[0]
    
    return NextResponse.json({
      success: true,
      message: 'Season type mapping test completed',
      data: {
        seasonTypeTests: results,
        week2Season1Sample: week2Season1Sample ? {
          gameKey: week2Season1Sample.GameKey,
          seasonType: week2Season1Sample.SeasonType,
          week: week2Season1Sample.Week,
          awayTeam: week2Season1Sample.AwayTeam,
          homeTeam: week2Season1Sample.HomeTeam,
          dateTime: week2Season1Sample.DateTime,
          status: week2Season1Sample.Status
        } : null,
        week2Season1Count: week2Season1.length
      }
    })
    
  } catch (error) {
    console.error('Season type mapping test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Season type mapping test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
