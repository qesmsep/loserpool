import { NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET() {
  try {
    console.log('Testing preseason data from SportsData.io...')

    const results = {
      season2025: {
        currentWeek: null as number | null,
        preseasonWeeks: [] as any[],
        regularSeasonWeeks: [] as any[],
        allWeeks: [] as any[],
        fullSeasonInfo: null as any
      }
    }

    // Test 1: Get current week for 2025
    try {
      console.log('Getting current week for 2025...')
      const currentWeek = await sportsDataService.getCurrentWeek(2025)
      results.season2025.currentWeek = currentWeek
      console.log('Current week for 2025:', currentWeek)
    } catch (error) {
      console.error('Error getting current week for 2025:', error)
    }

    // Test 2: Check all weeks 1-6 to see what's available
    for (let week = 1; week <= 6; week++) {
      try {
        console.log(`Testing week ${week} for 2025...`)
        const games = await sportsDataService.getGames(2025, week)
        
        if (games.length > 0) {
          const sampleGame = games[0]
          const weekInfo = {
            week,
            gameCount: games.length,
            sampleGame: {
              GameKey: sampleGame.GameKey,
              AwayTeam: sampleGame.AwayTeam,
              HomeTeam: sampleGame.HomeTeam,
              DateTime: sampleGame.DateTime,
              Status: sampleGame.Status,
              SeasonType: sampleGame.SeasonType
            }
          }
          
          results.season2025.allWeeks.push(weekInfo)
          
          // Determine if this is preseason based on game dates
          const gameDate = new Date(sampleGame.DateTime)
          const isPreseason = gameDate.getMonth() < 8 // August is month 7, so < 8 means July or earlier
          
          if (isPreseason) {
            results.season2025.preseasonWeeks.push(weekInfo)
          } else {
            results.season2025.regularSeasonWeeks.push(weekInfo)
          }
        }
      } catch (error) {
        console.error(`Error testing week ${week}:`, error)
      }
    }

    // Test 3: Check for preseason-specific data using 2025PRE
    try {
      console.log('Checking for preseason data using 2025PRE...')
      const preseasonGames = await sportsDataService.getGames('2025PRE')
      if (preseasonGames && preseasonGames.length > 0) {
        results.season2025.preseasonWeeks = preseasonGames.map(game => ({
          week: game.Week,
          gameCount: 1,
          sampleGame: {
            GameKey: game.GameKey,
            AwayTeam: game.AwayTeam,
            HomeTeam: game.HomeTeam,
            DateTime: game.DateTime,
            Week: game.Week,
            SeasonType: game.SeasonType
          }
        }))
        console.log(`Found ${preseasonGames.length} preseason games`)
      } else {
        console.log('No preseason games found with 2025PRE')
      }
    } catch (error) {
      console.error('Error checking preseason data with 2025PRE:', error)
    }

    // Test 4: Try to get the full season schedule to see if preseason is included
    try {
      console.log('Getting full season schedule for 2025...')
      const fullSeasonGames = await sportsDataService.getGames(2025)
      
      if (fullSeasonGames.length > 0) {
        // Group by week and find the earliest games
        const gamesByWeek = fullSeasonGames.reduce((acc, game) => {
          if (!acc[game.Week]) {
            acc[game.Week] = []
          }
          acc[game.Week].push(game)
          return acc
        }, {} as Record<number, any[]>)
        
        const earliestWeeks = Object.keys(gamesByWeek)
          .map(Number)
          .sort((a, b) => a - b)
          .slice(0, 4)
        
        results.season2025.fullSeasonInfo = {
          totalGames: fullSeasonGames.length,
          earliestWeeks,
          sampleEarliestGame: gamesByWeek[earliestWeeks[0]]?.[0] ? {
            GameKey: gamesByWeek[earliestWeeks[0]][0].GameKey,
            AwayTeam: gamesByWeek[earliestWeeks[0]][0].AwayTeam,
            HomeTeam: gamesByWeek[earliestWeeks[0]][0].HomeTeam,
            DateTime: gamesByWeek[earliestWeeks[0]][0].DateTime,
            Week: gamesByWeek[earliestWeeks[0]][0].Week,
            SeasonType: gamesByWeek[earliestWeeks[0]][0].SeasonType
          } : null
        }
      }
    } catch (error) {
      console.error('Error getting full season schedule:', error)
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Preseason data test failed:', error)
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
