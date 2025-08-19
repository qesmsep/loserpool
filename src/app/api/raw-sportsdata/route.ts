import { NextRequest, NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET() {
  try {
    console.log('Getting raw SportsData.io data...')

    // Get raw data from SportsData.io
    const games = await sportsDataService.getGamesBySeasonType(2025, 'PRE', 2)
    
    if (games.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No games found for 2025 PRE2'
      })
    }

    // Return the first 3 games with all their raw data
    const rawGames = games.slice(0, 3).map(game => ({
      raw_data: game,
      key_fields: {
        AwayTeam: game.AwayTeam,
        HomeTeam: game.HomeTeam,
        Status: game.Status,
        AwayScore: game.AwayScore,
        HomeScore: game.HomeScore,
        Date: game.Date,
        DateTime: game.DateTime,
        LastUpdated: game.LastUpdated,
        HasStarted: game.HasStarted,
        IsOver: game.IsOver,
        Week: game.Week,
        Season: game.Season,
        SeasonType: game.SeasonType
      }
    }))

    return NextResponse.json({
      success: true,
      total_games: games.length,
      raw_games: rawGames,
      api_url_used: `https://api.sportsdata.io/v3/nfl/scores/json/ScoresByWeek/2025PRE/2`
    })

  } catch (error) {
    console.error('Error getting raw SportsData.io data:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
