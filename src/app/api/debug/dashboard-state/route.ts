import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check current week and season
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

    // Check total picks count
    const { count: totalPicks } = await supabase
      .from('picks')
      .select('*', { count: 'exact', head: true })

    // Check if there are any Miami picks
    const { count: miamiPicks } = await supabase
      .from('picks')
      .select('*', { count: 'exact', head: true })
      .or('reg1_team_matchup_id.like.%_MIA%,reg2_team_matchup_id.like.%_MIA%,reg3_team_matchup_id.like.%_MIA%,reg4_team_matchup_id.like.%_MIA%,reg5_team_matchup_id.like.%_MIA%,reg6_team_matchup_id.like.%_MIA%,reg7_team_matchup_id.like.%_MIA%,reg8_team_matchup_id.like.%_MIA%,reg9_team_matchup_id.like.%_MIA%,reg10_team_matchup_id.like.%_MIA%,reg11_team_matchup_id.like.%_MIA%,reg12_team_matchup_id.like.%_MIA%,reg13_team_matchup_id.like.%_MIA%,reg14_team_matchup_id.like.%_MIA%,reg15_team_matchup_id.like.%_MIA%,reg16_team_matchup_id.like.%_MIA%,reg17_team_matchup_id.like.%_MIA%,reg18_team_matchup_id.like.%_MIA%')

    return NextResponse.json({
      currentWeek: currentWeek?.value,
      currentSeason: currentSeason?.value,
      totalPicksInDatabase: totalPicks,
      miamiPicksInDatabase: miamiPicks,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in dashboard state debug:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
