import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get all matchups with their details
    const { data: matchups, error } = await supabase
      .from('matchups')
      .select('*')
      .order('week', { ascending: true })
      .order('game_time', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by week for easier reading
    const matchupsByWeek = matchups?.reduce((acc, matchup) => {
      if (!acc[matchup.week]) {
        acc[matchup.week] = []
      }
      acc[matchup.week].push({
        id: matchup.id,
        away_team: matchup.away_team,
        home_team: matchup.home_team,
        game_time: matchup.game_time,
        status: matchup.status,
        away_score: matchup.away_score,
        home_score: matchup.home_score,
        winner: matchup.winner
      })
      return acc
    }, {} as Record<number, any[]>) || {}

    return NextResponse.json({
      success: true,
      total_matchups: matchups?.length || 0,
      matchups_by_week: matchupsByWeek,
      sample_matchups: matchups?.slice(0, 5) || []
    })

  } catch (error) {
    console.error('Error in debug matchups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
