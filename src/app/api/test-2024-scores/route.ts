import { NextRequest, NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET() {
  try {
    console.log('Testing 2024 season scores from SportsData.io...')

    // Try to get current week from 2024
    let currentWeek: number
    try {
      currentWeek = await sportsDataService.getCurrentWeek(2024)
      console.log(`Current week from 2024: ${currentWeek}`)
    } catch (error) {
      console.error('Error getting current week from 2024:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to get current week from 2024',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

    // Try to get games for different season types in 2024
    const results: any = {}
    
    for (const seasonType of ['PRE', 'REG', 'POST']) {
      try {
        const games = await sportsDataService.getGamesBySeasonType(2024, seasonType, currentWeek)
        if (games.length > 0) {
          const sampleGame = games[0]
          results[seasonType] = {
            total_games: games.length,
            sample_game: {
              game: `${sampleGame.AwayTeam} @ ${sampleGame.HomeTeam}`,
              status: sampleGame.Status,
              awayScore: sampleGame.AwayScore,
              homeScore: sampleGame.HomeScore,
              date: sampleGame.Date,
              dateTime: sampleGame.DateTime,
              hasStarted: sampleGame.HasStarted,
              isOver: sampleGame.IsOver
            },
            games_with_scores: games.filter(g => g.AwayScore !== null || g.HomeScore !== null).length
          }
        } else {
          results[seasonType] = { total_games: 0, message: 'No games found' }
        }
      } catch (error) {
        results[seasonType] = { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    return NextResponse.json({
      success: true,
      current_week_2024: currentWeek,
      results
    })

  } catch (error) {
    console.error('Error testing 2024 scores:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
