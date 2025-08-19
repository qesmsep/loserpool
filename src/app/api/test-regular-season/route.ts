import { NextRequest, NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing regular season games...')
    
    // Try to get regular season week 1 games (if available)
    const regularSeasonGames = await sportsDataService.getGames(2024, 1)
    
    // Filter for regular season games (seasonType = 2)
    const regSeasonGames = regularSeasonGames.filter(game => game.SeasonType === 2)
    const preSeasonGames = regularSeasonGames.filter(game => game.SeasonType === 1)
    
    return NextResponse.json({
      success: true,
      message: 'Regular season test completed',
      data: {
        totalGames: regularSeasonGames.length,
        regularSeasonGames: regSeasonGames.length,
        preseasonGames: preSeasonGames.length,
        sampleRegularSeason: regSeasonGames.slice(0, 2).map(game => ({
          gameKey: game.GameKey,
          season: game.Season,
          week: game.Week,
          seasonType: game.SeasonType,
          awayTeam: game.AwayTeam,
          homeTeam: game.HomeTeam,
          dateTime: game.DateTime
        })),
        samplePreseason: preSeasonGames.slice(0, 2).map(game => ({
          gameKey: game.GameKey,
          season: game.Season,
          week: game.Week,
          seasonType: game.SeasonType,
          awayTeam: game.AwayTeam,
          homeTeam: game.HomeTeam,
          dateTime: game.DateTime
        }))
      }
    })
    
  } catch (error) {
    console.error('Regular season test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Regular season test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
