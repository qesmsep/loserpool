import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get all picks that have Miami in any week column
    const { data: picks, error } = await supabase
      .from('picks')
      .select('*')
      .or('reg1_team_matchup_id.like.%_MIA%,reg2_team_matchup_id.like.%_MIA%,reg3_team_matchup_id.like.%_MIA%,reg4_team_matchup_id.like.%_MIA%,reg5_team_matchup_id.like.%_MIA%,reg6_team_matchup_id.like.%_MIA%,reg7_team_matchup_id.like.%_MIA%,reg8_team_matchup_id.like.%_MIA%,reg9_team_matchup_id.like.%_MIA%,reg10_team_matchup_id.like.%_MIA%,reg11_team_matchup_id.like.%_MIA%,reg12_team_matchup_id.like.%_MIA%,reg13_team_matchup_id.like.%_MIA%,reg14_team_matchup_id.like.%_MIA%,reg15_team_matchup_id.like.%_MIA%,reg16_team_matchup_id.like.%_MIA%,reg17_team_matchup_id.like.%_MIA%,reg18_team_matchup_id.like.%_MIA%')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Analyze the data
    const analysis = {
      totalMiamiPicks: picks?.length || 0,
      weekBreakdown: {} as Record<string, number>,
      totalPicksCount: 0
    }

    // Count picks by week
    picks?.forEach(pick => {
      for (let week = 1; week <= 18; week++) {
        const columnName = `reg${week}_team_matchup_id` as keyof typeof pick
        const value = pick[columnName] as string | null
        if (value && value.includes('_MIA')) {
          analysis.weekBreakdown[`week${week}`] = (analysis.weekBreakdown[`week${week}`] || 0) + 1
          analysis.totalPicksCount += pick.picks_count || 0
        }
      }
    })

    return NextResponse.json({
      analysis,
      samplePicks: picks?.slice(0, 5) // First 5 picks for inspection
    })

  } catch (error) {
    console.error('Error in Miami picks export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
