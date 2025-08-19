import { NextRequest, NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing 2025 season data from SportsData.io...')
    
    // Test 1: Get current week for 2025
    let currentWeek2025: number
    try {
      currentWeek2025 = await sportsDataService.getCurrentWeek(2025)
      console.log(`2025 current week: ${currentWeek2025}`)
    } catch (error) {
      console.log('2025 current week not available:', error)
      currentWeek2025 = null
    }
    
    // Test 2: Try to get 2025 preseason games
    let preseasonGames2025: any[] = []
    try {
      preseasonGames2025 = await sportsDataService.getGames(2025, 1)
      console.log(`2025 preseason week 1 games: ${preseasonGames2025.length}`)
    } catch (error) {
      console.log('2025 preseason games not available:', error)
    }
    
    // Test 3: Try to get 2025 regular season games
    let regularSeasonGames2025: any[] = []
    try {
      regularSeasonGames2025 = await sportsDataService.getGames(2025, 1)
      console.log(`2025 regular season week 1 games: ${regularSeasonGames2025.length}`)
    } catch (error) {
      console.log('2025 regular season games not available:', error)
    }
    
    // Test 4: Try to get 2025 season schedule
    let seasonSchedule2025: any[] = []
    try {
      seasonSchedule2025 = await sportsDataService.getSeasonSchedule(2025)
      console.log(`2025 season schedule games: ${seasonSchedule2025.length}`)
    } catch (error) {
      console.log('2025 season schedule not available:', error)
    }
    
    // Test 5: Compare with 2024 data
    const currentWeek2024 = await sportsDataService.getCurrentWeek(2024)
    const games2024 = await sportsDataService.getGames(2024, 1)
    
    return NextResponse.json({
      success: true,
      message: '2025 season test completed',
      data: {
        year2024: {
          currentWeek: currentWeek2024,
          gamesCount: games2024.length,
          sampleGames: games2024.slice(0, 2).map(game => ({
            gameKey: game.GameKey,
            seasonType: game.SeasonType,
            week: game.Week,
            awayTeam: game.AwayTeam,
            homeTeam: game.HomeTeam,
            dateTime: game.DateTime
          }))
        },
        year2025: {
          currentWeek: currentWeek2025,
          preseasonGamesCount: preseasonGames2025.length,
          regularSeasonGamesCount: regularSeasonGames2025.length,
          seasonScheduleCount: seasonSchedule2025.length,
          samplePreseason: preseasonGames2025.slice(0, 2).map(game => ({
            gameKey: game.GameKey,
            seasonType: game.SeasonType,
            week: game.Week,
            awayTeam: game.AwayTeam,
            homeTeam: game.HomeTeam,
            dateTime: game.DateTime
          })),
          sampleRegularSeason: regularSeasonGames2025.slice(0, 2).map(game => ({
            gameKey: game.GameKey,
            seasonType: game.SeasonType,
            week: game.Week,
            awayTeam: game.AwayTeam,
            homeTeam: game.HomeTeam,
            dateTime: game.DateTime
          }))
        }
      }
    })
    
  } catch (error) {
    console.error('2025 season test failed:', error)
    return NextResponse.json({
      success: false,
      error: '2025 season test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
