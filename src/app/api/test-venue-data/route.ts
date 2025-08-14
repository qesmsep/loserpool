import { NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season') || '2024'
    const week = searchParams.get('week') || '1'

    console.log(`Testing venue data for ${season} Week ${week}`)

    // Fetch games from SportsData.io
    const games = await sportsDataService.getGames(parseInt(season), parseInt(week))
    
    // Extract venue information
    const venueData = games.map(game => ({
      gameId: game.GameKey,
      awayTeam: game.AwayTeam,
      homeTeam: game.HomeTeam,
      venue: game.StadiumDetails?.Name || 'No venue data',
      city: game.StadiumDetails?.City || 'No city data',
      state: game.StadiumDetails?.State || 'No state data',
      country: game.StadiumDetails?.Country || 'No country data',
      gameTime: game.DateTime
    }))

    return NextResponse.json({
      success: true,
      season,
      week,
      totalGames: games.length,
      venueData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error testing venue data:', error)
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
