import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // Get SportsData.io scores
    const sportsDataGames = await sportsDataService.getGamesBySeasonType(2025, 'PRE', 2)
    
    // Get database matchups
    const { data: matchups } = await supabase
      .from('matchups')
      .select('away_team, home_team, away_score, home_score, status')
      .eq('season', 'PRE2')
      .order('game_time', { ascending: true })

    // Create comparison
    const comparison = sportsDataGames.slice(0, 5).map(sportsGame => {
      const dbGame = matchups?.find(m => 
        m.away_team === sportsGame.AwayTeam && m.home_team === sportsGame.HomeTeam
      )
      
      return {
        game: `${sportsGame.AwayTeam} @ ${sportsGame.HomeTeam}`,
        sportsdata: {
          awayScore: sportsGame.AwayScore,
          homeScore: sportsGame.HomeScore,
          status: sportsGame.Status,
          lastUpdated: sportsGame.LastUpdated
        },
        database: dbGame ? {
          awayScore: dbGame.away_score,
          homeScore: dbGame.home_score,
          status: dbGame.status
        } : 'Not found in database',
        match: dbGame ? 
          (sportsGame.AwayScore === dbGame.away_score && sportsGame.HomeScore === dbGame.home_score) : 
          false
      }
    })

    return NextResponse.json({
      success: true,
      comparison,
      sportsdata_total: sportsDataGames.length,
      database_total: matchups?.length || 0
    })

  } catch (error) {
    console.error('Error comparing scores:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
