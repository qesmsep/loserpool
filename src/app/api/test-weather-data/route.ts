import { NextRequest, NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET() {
  try {
    console.log('Testing weather data from SportsData.io...')

    // Test with 2025 PRE2
    const games = await sportsDataService.getGamesBySeasonType(2025, 'PRE', 2)
    
    if (games.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No games found for 2025 PRE2'
      })
    }

    // Show detailed data for first game
    const sampleGame = games[0]
    
    return NextResponse.json({
      success: true,
      total_games: games.length,
      sample_game: {
        game: `${sampleGame.AwayTeam} @ ${sampleGame.HomeTeam}`,
        status: sampleGame.Status,
        score: `${sampleGame.AwayScore}-${sampleGame.HomeScore}`,
        weather: {
          description: sampleGame.WeatherDescription,
          temperature: sampleGame.Temperature,
          humidity: sampleGame.Humidity,
          windSpeed: sampleGame.WindSpeed
        },
        game_info: {
          referee: sampleGame.Referee,
          channel: sampleGame.Channel,
          down: sampleGame.Down,
          distance: sampleGame.Distance,
          gameClock: sampleGame.GameClock
        },
        all_fields: Object.keys(sampleGame).sort()
      },
      all_games: games.map(game => ({
        game: `${game.AwayTeam} @ ${game.HomeTeam}`,
        status: game.Status,
        score: `${game.AwayScore}-${game.HomeScore}`,
        weather: game.WeatherDescription,
        temperature: game.Temperature
      }))
    })

  } catch (error) {
    console.error('Error testing weather data:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
