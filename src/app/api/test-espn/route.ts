import { NextRequest, NextResponse } from 'next/server'
import { espnService } from '@/lib/espn-service'

export async function GET() {
  try {
    console.log('Testing ESPN API...')

    // Test with 2025 Preseason Week 2
    const games = await espnService.getNFLSchedule(2025, 2, 'PRE')
    
    if (games.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No games found for 2025 Preseason Week 2'
      })
    }

    // Convert to our format and show sample
    const convertedGames = games.slice(0, 5).map(game => espnService.convertToMatchupFormat(game)).filter(Boolean)
    
    // Show raw data for first game
    const sampleGame = games[0]
    
    return NextResponse.json({
      success: true,
      total_games: games.length,
      sample_raw_game: {
        id: sampleGame.id,
        name: sampleGame.name,
        week: sampleGame.week.number,
        season: sampleGame.season,
        competitors: sampleGame.competitions[0]?.competitors.map(c => ({
          team: c.team.abbreviation,
          homeAway: c.homeAway,
          score: c.score
        })) || [],
        status: sampleGame.competitions[0]?.status.type.state || 'unknown'
      },
      converted_games: convertedGames,
      message: 'ESPN API test completed'
    })

  } catch (error) {
    console.error('Error testing ESPN API:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'ESPN API test failed'
    }, { status: 500 })
  }
}
