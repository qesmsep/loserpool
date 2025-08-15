import { NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET() {
  try {
    console.log('Testing SportsData.io integration...')

    // Test 1: Connection test
    console.log('Testing connection...')
    const connectionTest = await sportsDataService.testConnection()
    console.log('Connection test result:', connectionTest)

    if (!connectionTest) {
      return NextResponse.json({
        success: false,
        error: 'Connection test failed',
        timestamp: new Date().toISOString()
      })
    }

    // Test 2: Get current week
    console.log('Getting current week...')
    const currentWeek = await sportsDataService.getCurrentWeek(2024)
    console.log('Current week:', currentWeek)

    // Test 3: Get current week games
    console.log('Getting current week games...')
    const currentWeekGames = await sportsDataService.getCurrentWeekGames(2024)
    console.log(`Found ${currentWeekGames.length} games for current week`)

    // Test 4: Get next week games
    console.log('Getting next week games...')
    const nextWeekGames = await sportsDataService.getNextWeekGames(2024)
    console.log(`Found ${nextWeekGames.length} games for next week`)

    // Test 5: Get teams
    console.log('Getting teams...')
    const teams = await sportsDataService.getTeams()
    console.log(`Found ${teams.length} teams`)

    // Test 6: Convert a game to our format
    console.log('Converting sample game...')
    const sampleGame = currentWeekGames[0]
    let convertedGame = null
    
    if (sampleGame) {
      console.log('Sample game:', JSON.stringify(sampleGame, null, 2))
      convertedGame = sportsDataService.convertGameToMatchup(sampleGame)
    }

    return NextResponse.json({
      success: true,
      tests: {
        connection: connectionTest,
        currentWeek,
        currentWeekGamesCount: currentWeekGames.length,
        nextWeekGamesCount: nextWeekGames.length,
        teamsCount: teams.length,
        sampleGame: sampleGame ? {
          original: {
            GameKey: sampleGame.GameKey,
            AwayTeam: sampleGame.AwayTeam,
            HomeTeam: sampleGame.HomeTeam,
            DateTime: sampleGame.DateTime,
            Status: sampleGame.Status,
            Week: sampleGame.Week
          },
          converted: convertedGame
        } : null
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('SportsData.io test failed:', error)
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
