import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // Get current season/week info
    const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const seasonInfo = await getCurrentSeasonInfo()
    
    const currentWeek = seasonInfo.currentWeek
    const seasonFilter = seasonInfo.seasonDisplay

    // Get all picks for current week
    const weekCols = [
      'pre1_team_matchup_id','pre2_team_matchup_id','pre3_team_matchup_id',
      'reg1_team_matchup_id','reg2_team_matchup_id','reg3_team_matchup_id','reg4_team_matchup_id','reg5_team_matchup_id','reg6_team_matchup_id','reg7_team_matchup_id','reg8_team_matchup_id','reg9_team_matchup_id','reg10_team_matchup_id','reg11_team_matchup_id','reg12_team_matchup_id','reg13_team_matchup_id','reg14_team_matchup_id','reg15_team_matchup_id','reg16_team_matchup_id','reg17_team_matchup_id','reg18_team_matchup_id',
      'post1_team_matchup_id','post2_team_matchup_id','post3_team_matchup_id','post4_team_matchup_id'
    ]

    // Get current week column
    const isPre = seasonFilter.startsWith('PRE')
    const weekNum = parseInt(seasonFilter.replace('PRE', '').replace('REG', '').replace('POST', '')) || 1
    const currentWeekColumn = isPre ? `pre${weekNum}_team_matchup_id` : `reg${weekNum}_team_matchup_id`

    // Get matchups for current week to validate IDs
    const { data: matchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('id, week, status, away_score, home_score, away_team, home_team')
      .eq('week', currentWeek)
      .eq('season', seasonFilter)

    if (matchupsError) {
      console.error('Error fetching matchups:', matchupsError)
      return NextResponse.json({ error: 'Failed to fetch matchups' }, { status: 500 })
    }

    const validMatchupIds = new Set((matchups || []).map(m => m.id))
    const matchupMap = new Map()
    matchups?.forEach(matchup => {
      matchupMap.set(matchup.id, matchup)
    })

    // Get teams data for team name matching
    const { data: teamsData } = await supabase
      .from('teams')
      .select('name, abbreviation')
      .eq('season', 2024)

    const teamsMap = new Map<string, { name: string; abbreviation: string }>()
    if (teamsData) {
      for (const team of teamsData) {
        teamsMap.set(team.name, team)
        teamsMap.set(team.abbreviation, team)
        const nameParts = team.name.split(' ')
        if (nameParts.length > 1) {
          const cityTeam = nameParts.join('_')
          teamsMap.set(cityTeam, team)
        }
      }
    }

    // Get all picks for current week
    const allPicks: Array<{ [key: string]: string | number | null }> = []
    const seenIds = new Set<string>()
    const pageSize = 1000
    let lastId: string | null = null

    while (true) {
      let query = supabase
        .from('picks')
        .select(`id, picks_count, ${currentWeekColumn}`)
        .order('id', { ascending: true })
        .limit(pageSize)

      if (lastId) {
        query = query.gt('id', lastId)
      }

      const { data: picks, error: picksError } = await query

      if (picksError) {
        console.error('Error fetching picks:', picksError)
        return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
      }

      if (!picks || picks.length === 0) {
        break
      }

      for (const row of picks as unknown as Array<{ [key: string]: string | number | null }>) {
        const rowId = row.id as unknown as string
        if (!seenIds.has(rowId)) {
          seenIds.add(rowId)
          allPicks.push(row)
        }
        lastId = rowId
      }

      if (picks.length < pageSize) {
        break
      }
    }

    // Calculate active picks (picks that have a valid matchup ID for current week)
    let activePicks = 0
    const weekPicks: Array<{ [key: string]: string | number | null }> = []
    
    for (const pick of allPicks) {
      const raw = (pick as { [key: string]: string | number | null })[currentWeekColumn] as string
      if (!raw) continue
      const parts = raw.split('_')
      if (parts.length < 2) continue
      const actualMatchupId = parts[0]
      if (!validMatchupIds.has(actualMatchupId)) continue
      activePicks += ((pick.picks_count as number) || 0)
      weekPicks.push(pick)
    }

    // Calculate eliminated picks (picks whose team won or tied)
    let eliminatedPicks = 0
    for (const pick of weekPicks) {
      const raw = (pick as { [key: string]: string | number | null })[currentWeekColumn] as string
      if (!raw) continue
      const parts = raw.split('_')
      if (parts.length < 2) continue
      const actualMatchupId = parts[0]
      const teamKey = parts.slice(1).join('_')
      if (!validMatchupIds.has(actualMatchupId)) continue

      const matchup = matchupMap.get(actualMatchupId)
      if (!matchup || matchup.status !== 'final') continue

      let isIncorrect = false
      if (matchup.away_score !== null && matchup.home_score !== null) {
        let winner: string | null = null
        if (matchup.away_score > matchup.home_score) winner = matchup.away_team
        else if (matchup.home_score > matchup.away_score) winner = matchup.home_team
        if (winner === null) {
          isIncorrect = true // Tie eliminates all picks
        } else {
          let teamData = teamsMap.get(teamKey)
          if (!teamData) {
            for (const [key, data] of teamsMap.entries()) {
              if (key.toLowerCase().includes(teamKey.toLowerCase()) || teamKey.toLowerCase().includes(key.toLowerCase())) {
                teamData = data
                break
              }
            }
          }
          const pickedTeamName = teamData?.name || teamKey
          if (winner === pickedTeamName || (teamData?.abbreviation && winner === teamData.abbreviation) || (winner && pickedTeamName && (winner.toLowerCase().includes(pickedTeamName.toLowerCase()) || pickedTeamName.toLowerCase().includes(winner.toLowerCase())))) {
            isIncorrect = true // Picked team won (eliminated in loser pool)
          }
        }
      }
      if (isIncorrect) {
        eliminatedPicks += ((pick.picks_count as number) || 0)
      }
    }

    const remainingPicks = Math.max(0, activePicks - eliminatedPicks)

    return NextResponse.json({
      remainingPicks,
      activePicks,
      eliminatedPicks,
      currentWeek,
      seasonFilter
    })

  } catch (error) {
    console.error('Error calculating remaining picks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
