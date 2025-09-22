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

    // Check Miami picks in each regular season week column
    const weekColumns = ['reg1', 'reg2', 'reg3', 'reg4', 'reg5', 'reg6', 'reg7', 'reg8', 'reg9', 'reg10', 'reg11', 'reg12', 'reg13', 'reg14', 'reg15', 'reg16', 'reg17', 'reg18']
    
    const results: {
      currentWeek: string | number
      currentSeason: string | number
      weekBreakdown: Record<string, { totalPicks: number; totalPicksCount: number }>
      totalRegularSeason: number
      totalPreseason: number
      totalPostseason: number
      duplicateUsers?: Array<{ userId: string; count: number }>
      grandTotal?: number
    } = {
      currentWeek: currentWeek?.value || 'unknown',
      currentSeason: currentSeason?.value || 'unknown',
      weekBreakdown: {},
      totalRegularSeason: 0,
      totalPreseason: 0,
      totalPostseason: 0
    }

    // Check each regular season week
    for (const week of weekColumns) {
      const columnName = `${week}_team_matchup_id`
      const { data: picks, error } = await supabase
        .from('picks')
        .select('id, picks_count')
        .not(columnName, 'is', null)
        .like(columnName, '%_MIA%')

      if (error) {
        console.error(`Error querying ${columnName}:`, error)
        continue
      }

      const totalPicks = picks?.length || 0
      const totalPicksCount = picks?.reduce((sum, pick) => sum + (pick.picks_count || 0), 0) || 0

      results.weekBreakdown[week] = {
        totalPicks,
        totalPicksCount
      }

      results.totalRegularSeason += totalPicksCount
    }

    // Check preseason weeks
    const preseasonColumns = ['pre1', 'pre2', 'pre3']
    for (const week of preseasonColumns) {
      const columnName = `${week}_team_matchup_id`
      const { data: picks, error } = await supabase
        .from('picks')
        .select('id, picks_count')
        .not(columnName, 'is', null)
        .like(columnName, '%_MIA%')

      if (error) {
        console.error(`Error querying ${columnName}:`, error)
        continue
      }

      const totalPicksCount = picks?.reduce((sum, pick) => sum + (pick.picks_count || 0), 0) || 0
      results.totalPreseason += totalPicksCount
    }

    // Check postseason weeks
    const postseasonColumns = ['post1', 'post2', 'post3', 'post4', 'post5', 'post6', 'post7', 'post8', 'post9', 'post10', 'post11', 'post12', 'post13', 'post14', 'post15', 'post16', 'post17', 'post18']
    for (const week of postseasonColumns) {
      const columnName = `${week}_team_matchup_id`
      const { data: picks, error } = await supabase
        .from('picks')
        .select('id, picks_count')
        .not(columnName, 'is', null)
        .like(columnName, '%_MIA%')

      if (error) {
        console.error(`Error querying ${columnName}:`, error)
        continue
      }

      const totalPicksCount = picks?.reduce((sum, pick) => sum + (pick.picks_count || 0), 0) || 0
      results.totalPostseason += totalPicksCount
    }

    // Check for duplicate picks (users with Miami picks in multiple weeks)
    const { data: duplicateCheck, error: duplicateError } = await supabase
      .from('picks')
      .select('user_id, picks_count')
      .or('reg1_team_matchup_id.like.%_MIA%,reg2_team_matchup_id.like.%_MIA%,reg3_team_matchup_id.like.%_MIA%,reg4_team_matchup_id.like.%_MIA%,reg5_team_matchup_id.like.%_MIA%,reg6_team_matchup_id.like.%_MIA%,reg7_team_matchup_id.like.%_MIA%,reg8_team_matchup_id.like.%_MIA%,reg9_team_matchup_id.like.%_MIA%,reg10_team_matchup_id.like.%_MIA%,reg11_team_matchup_id.like.%_MIA%,reg12_team_matchup_id.like.%_MIA%,reg13_team_matchup_id.like.%_MIA%,reg14_team_matchup_id.like.%_MIA%,reg15_team_matchup_id.like.%_MIA%,reg16_team_matchup_id.like.%_MIA%,reg17_team_matchup_id.like.%_MIA%,reg18_team_matchup_id.like.%_MIA%')

    if (!duplicateError && duplicateCheck) {
      const userCounts = new Map()
      duplicateCheck.forEach(pick => {
        const count = userCounts.get(pick.user_id) || 0
        userCounts.set(pick.user_id, count + 1)
      })
      
      results.duplicateUsers = Array.from(userCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([userId, count]) => ({ userId, count }))
        .slice(0, 10) // Top 10 users with duplicates
    }

    const grandTotal = results.totalRegularSeason + results.totalPreseason + results.totalPostseason
    results.grandTotal = grandTotal

    return NextResponse.json(results)

  } catch (error) {
    console.error('Error in Miami picks debug:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
