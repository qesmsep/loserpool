import { NextRequest, NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing SportsData.io integration...')
    
    // Test 1: Check API key
    const apiKey = process.env.SPORTSDATA_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'SPORTSDATA_API_KEY not found in environment variables'
      }, { status: 500 })
    }
    
    console.log('API key found:', apiKey.substring(0, 10) + '...')
    
    // Test 2: Test connection
    const connectionTest = await sportsDataService.testConnection()
    if (!connectionTest) {
      return NextResponse.json({
        success: false,
        error: 'SportsData.io connection test failed'
      }, { status: 500 })
    }
    
    console.log('Connection test passed')
    
    // Test 3: Get current week
    const currentWeek = await sportsDataService.getCurrentWeek(2024)
    console.log('Current week:', currentWeek)
    
    // Test 4: Get current week games
    const games = await sportsDataService.getGames(2024, currentWeek)
    console.log(`Found ${games.length} games for week ${currentWeek}`)
    
    // Test 5: Show sample game data
    const sampleGame = games[0]
    const sampleData = sampleGame ? {
      awayTeam: sampleGame.AwayTeam,
      homeTeam: sampleGame.HomeTeam,
      status: sampleGame.Status,
      awayScore: sampleGame.AwayScore,
      homeScore: sampleGame.HomeScore,
      dateTime: sampleGame.DateTime
    } : null
    
    return NextResponse.json({
      success: true,
      message: 'SportsData.io integration test successful',
      data: {
        apiKeyConfigured: true,
        connectionTest: true,
        currentWeek,
        gamesCount: games.length,
        sampleGame: sampleData
      }
    })
    
  } catch (error) {
    console.error('SportsData.io test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'SportsData.io test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
