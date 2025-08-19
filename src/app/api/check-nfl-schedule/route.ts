import { NextRequest, NextResponse } from 'next/server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET() {
  try {
    console.log('Checking NFL preseason schedule...')

    // Get the full preseason schedule for 2025
    const preseasonGames = await sportsDataService.getGamesBySeasonType(2025, 'PRE')
    
    // Group by week
    const gamesByWeek = preseasonGames.reduce((acc, game) => {
      const week = game.Week || 'Unknown'
      if (!acc[week]) acc[week] = []
      acc[week].push({
        game: `${game.AwayTeam} @ ${game.HomeTeam}`,
        date: game.Date,
        dateTime: game.DateTime,
        status: game.Status,
        awayScore: game.AwayScore,
        homeScore: game.HomeScore,
        lastUpdated: game.LastUpdated
      })
      return acc
    }, {} as any)

    // Get current week games specifically
    const currentWeek = 2
    const currentWeekGames = preseasonGames.filter(g => g.Week === currentWeek)

    return NextResponse.json({
      success: true,
      total_preseason_games: preseasonGames.length,
      games_by_week: gamesByWeek,
      current_week_games: currentWeekGames.map(g => ({
        game: `${g.AwayTeam} @ ${g.HomeTeam}`,
        date: g.Date,
        status: g.Status,
        score: `${g.AwayScore}-${g.HomeScore}`,
        lastUpdated: g.LastUpdated
      })),
      sample_week_1: preseasonGames.filter(g => g.Week === 1).slice(0, 3).map(g => ({
        game: `${g.AwayTeam} @ ${g.HomeTeam}`,
        score: `${g.AwayScore}-${g.HomeScore}`,
        status: g.Status
      }))
    })

  } catch (error) {
    console.error('Error checking NFL schedule:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
