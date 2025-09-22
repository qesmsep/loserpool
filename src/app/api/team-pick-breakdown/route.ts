import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

// Public (authenticated) endpoint for current-week team pick aggregation, optimized and deterministic
export async function GET(request: NextRequest) {
  try {
    // Use service role to aggregate across all users while only returning totals
    const supabase = createServiceRoleClient()

    // Determine current season/week via server season detection (allow overrides via query)
    const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const seasonInfo = await getCurrentSeasonInfo()

    const url = new URL(request.url)
    const overrideWeek = url.searchParams.get('week')
    const overrideSeason = url.searchParams.get('season') || url.searchParams.get('seasonFilter')

    let currentWeek = seasonInfo.currentWeek
    let seasonFilter = seasonInfo.seasonDisplay // e.g., REG7

    if (overrideSeason && /^(PRE|REG|POST)\d+$/i.test(overrideSeason)) {
      seasonFilter = overrideSeason.toUpperCase()
    }
    if (overrideWeek && /^\d+$/.test(overrideWeek)) {
      currentWeek = parseInt(overrideWeek, 10)
    }

    // Map current week to the correct column name
    const isPre = seasonFilter.startsWith('PRE')
    const weekNum = parseInt(seasonFilter.replace('PRE', '').replace('REG', '').replace('POST', '')) || 1
    const currentWeekColumn = isPre ? `pre${weekNum}_team_matchup_id` : `reg${weekNum}_team_matchup_id`
    console.log('🟢 [/api/team-pick-breakdown] Season info:', { seasonFilter, currentWeek, currentWeekColumn })

    // Get all matchups for the season/week to validate matchup IDs
    const { data: currentWeekMatchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('id, away_team, home_team, status, week, season')
      .eq('season', seasonFilter)
      .eq('week', currentWeek)

    if (matchupsError) {
      return NextResponse.json({ error: 'Failed to fetch matchups' }, { status: 500 })
    }

    const currentWeekMatchupIdSet = new Set((currentWeekMatchups || []).map(m => m.id))
    console.log('🟢 [/api/team-pick-breakdown] Matchups fetched:', currentWeekMatchups?.length || 0)

    // Page through picks deterministically using keyset pagination and dedupe by id
    const allPicks: Array<{ id: string; team_col: string; picks_count: number }> = []
    const seen = new Set<string>()
    const pageSize = 1000
    let lastId: string | null = null

    while (true) {
      let query = supabase
        .from('picks')
        .select(`id, picks_count, ${currentWeekColumn}`)
        .not(currentWeekColumn, 'is', null)
        .not(currentWeekColumn, 'eq', '')
        .order('id', { ascending: true })
        .limit(pageSize)

      if (lastId) {
        // Keyset pagination to avoid offset drift
        query = query.gt('id', lastId)
      }

      const { data, error } = await query

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
      }

      if (!data || data.length === 0) break

      console.log('🟢 [/api/team-pick-breakdown] Picks page (keyset):', { lastId, fetched: data.length })
      for (const row of data as unknown as Array<Record<string, unknown>>) {
        const id = row.id as string
        if (!seen.has(id)) {
          seen.add(id)
          const value = row[currentWeekColumn] as string | null
          if (value) {
            const [actualMatchupId] = value.split('_')
            if (currentWeekMatchupIdSet.has(actualMatchupId)) {
              allPicks.push({ id, team_col: value, picks_count: (row.picks_count as number) || 0 })
            }
          }
        }
        lastId = id
      }

      if (data.length < pageSize) break
    }

    // Aggregate by team suffix
    const counts = new Map<string, number>()
    for (const p of allPicks) {
      const parts = p.team_col.split('_')
      if (parts.length >= 2) {
        const teamKey = parts.slice(1).join('_')
        counts.set(teamKey, (counts.get(teamKey) || 0) + (p.picks_count || 0))
      }
    }

    const teamPicks = Array.from(counts.entries())
      .map(([team, pickCount]) => ({ team, pickCount }))
      .sort((a, b) => b.pickCount - a.pickCount)

    console.log('🟢 [/api/team-pick-breakdown] Aggregation complete:', { rows: allPicks.length, teams: teamPicks.length })

    return NextResponse.json({
      success: true,
      week: currentWeek,
      seasonFilter,
      weekColumn: currentWeekColumn,
      teamPicks,
    })
  } catch (error) {
    console.error('Error in team-pick-breakdown:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


