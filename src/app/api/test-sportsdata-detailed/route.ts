import { NextRequest, NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing detailed SportsData.io integration...')
    
    // Test 1: Check API key
    const apiKey = process.env.SPORTSDATA_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'SPORTSDATA_API_KEY not found in environment variables'
      }, { status: 500 })
    }
    
    console.log('API key found:', apiKey.substring(0, 10) + '...')
    
    // Test 2: Get current week
    const currentWeek = await sportsDataService.getCurrentWeek(2024)
    console.log('Current week:', currentWeek)
    
    // Test 3: Get current week games with full details
    const games = await sportsDataService.getGames(2024, currentWeek)
    console.log(`Found ${games.length} games for week ${currentWeek}`)
    
    // Test 4: Show detailed game information including season type
    const detailedGames = games.map(game => ({
      gameKey: game.GameKey,
      season: game.Season,
      week: game.Week,
      seasonType: game.SeasonType,
      status: game.Status,
      awayTeam: game.AwayTeam,
      homeTeam: game.HomeTeam,
      dateTime: game.DateTime,
      awayScore: game.AwayScore,
      homeScore: game.HomeScore,
      hasStarted: game.HasStarted,
      isInProgress: game.IsInProgress,
      isOver: game.IsOver
    }))
    
    // Test 5: Check if we can get season schedule to understand season types
    const seasonSchedule = await sportsDataService.getSeasonSchedule(2024)
    const seasonTypes = [...new Set(seasonSchedule.map(game => game.SeasonType))]
    
    return NextResponse.json({
      success: true,
      message: 'Detailed SportsData.io integration test successful',
      data: {
        apiKeyConfigured: true,
        currentWeek,
        gamesCount: games.length,
        seasonTypes,
        detailedGames: detailedGames.slice(0, 3), // First 3 games
        sampleGame: detailedGames[0] || null
      }
    })
    
  } catch (error) {
    console.error('Detailed SportsData.io test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Detailed SportsData.io test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
