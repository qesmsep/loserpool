import { NextRequest, NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing season types...')
    
    // Test different season types
    const seasonTypes = [1, 2, 3, 4] // Common season type values
    const results: any[] = []
    
    for (const seasonType of seasonTypes) {
      try {
        // Try to get games for each season type
        const games = await sportsDataService.getGames(2024, 1, seasonType)
        results.push({
          seasonType,
          gamesCount: games.length,
          sampleGame: games[0] ? {
            gameKey: games[0].GameKey,
            week: games[0].Week,
            awayTeam: games[0].AwayTeam,
            homeTeam: games[0].HomeTeam,
            dateTime: games[0].DateTime
          } : null
        })
      } catch (error) {
        results.push({
          seasonType,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Also test the current week with different season types
    const currentWeek = await sportsDataService.getCurrentWeek(2024)
    const currentWeekGames = await sportsDataService.getGames(2024, currentWeek)
    
    return NextResponse.json({
      success: true,
      message: 'Season type test completed',
      data: {
        currentWeek,
        currentWeekSeasonType: currentWeekGames[0]?.SeasonType || 'unknown',
        seasonTypeTests: results,
        currentWeekGames: currentWeekGames.slice(0, 2).map(game => ({
          gameKey: game.GameKey,
          seasonType: game.SeasonType,
          week: game.Week,
          awayTeam: game.AwayTeam,
          homeTeam: game.HomeTeam,
          dateTime: game.DateTime
        }))
      }
    })
    
  } catch (error) {
    console.error('Season type test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Season type test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
