import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get a sample of team matchup IDs to see the format
    const { data: samplePicks, error } = await supabase
      .from('picks')
      .select('reg1_team_matchup_id, reg2_team_matchup_id, reg3_team_matchup_id')
      .not('reg1_team_matchup_id', 'is', null)
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get all unique team names from matchups table
    const { data: matchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('away_team, home_team')
      .limit(20)

    if (matchupsError) {
      return NextResponse.json({ error: matchupsError.message }, { status: 500 })
    }

    // Get current week and season
    const { data: currentWeek } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_week')
      .single()

    const { data: currentSeason } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_season')
      .single()

    return NextResponse.json({
      currentWeek: currentWeek?.value,
      currentSeason: currentSeason?.value,
      samplePicks: samplePicks?.slice(0, 5),
      sampleMatchups: matchups?.slice(0, 5),
      allTeamNames: [
        ...new Set([
          ...(matchups?.map(m => m.away_team) || []),
          ...(matchups?.map(m => m.home_team) || [])
        ])
      ].sort()
    })

  } catch (error) {
    console.error('Error in team names debug:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
