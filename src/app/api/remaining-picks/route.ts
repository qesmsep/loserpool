import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getCurrentSeasonInfo } from '@/lib/season-detection'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // Match admin Weekly Pick Statistics logic for current week's remaining picks
    // 1) Load all picks with relevant week columns (no filtering by status)
    const weekCols = [
      'reg1_team_matchup_id','reg2_team_matchup_id','reg3_team_matchup_id','reg4_team_matchup_id','reg5_team_matchup_id','reg6_team_matchup_id','reg7_team_matchup_id','reg8_team_matchup_id','reg9_team_matchup_id','reg10_team_matchup_id','reg11_team_matchup_id','reg12_team_matchup_id','reg13_team_matchup_id','reg14_team_matchup_id','reg15_team_matchup_id','reg16_team_matchup_id','reg17_team_matchup_id','reg18_team_matchup_id',
      'post1_team_matchup_id','post2_team_matchup_id','post3_team_matchup_id','post4_team_matchup_id'
    ] as const

    const baseSelect = `id,user_id,picks_count,${weekCols.join(',')}`

    const allPicks: Array<{ [key: string]: string | number | null }> = []
    const seenIds = new Set<string>()
    const pageSize = 1000
    let lastId: string | null = null

    while (true) {
      let query = supabase
        .from('picks')
        .select(baseSelect)
        .order('id', { ascending: true })
        .limit(pageSize)

      if (lastId) {
        query = query.gt('id', lastId)
      }

      const { data: picks, error: picksError } = await query

      if (picksError) {
        console.error('Error fetching picks (keyset):', picksError)
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

    // 2) Load matchups and teams
    const { data: matchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('id, week, status, away_score, home_score, away_team, home_team')

    if (matchupsError) {
      console.error('Error fetching matchups:', matchupsError)
      return NextResponse.json({ error: 'Failed to fetch matchups' }, { status: 500 })
    }

    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('name, abbreviation, primary_color, secondary_color')
      .eq('season', 2024)

    if (teamsError) {
      console.error('Error fetching teams data:', teamsError)
      return NextResponse.json({ error: 'Failed to fetch teams data' }, { status: 500 })
    }

    const teamsMap = new Map<string, { name: string; abbreviation: string; primary_color: string; secondary_color: string }>()
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

    const matchupMap = new Map<string, { id: string; week: number; away_team: string; home_team: string; away_score: number | null; home_score: number | null; status: string }>()
    matchups?.forEach(m => {
      const key = m.id as unknown as string
      matchupMap.set(key, {
        id: key,
        week: m.week as number,
        away_team: m.away_team as string,
        home_team: m.home_team as string,
        away_score: (m.away_score as number | null) ?? null,
        home_score: (m.home_score as number | null) ?? null,
        status: m.status as string
      })
    })

    // 3) Determine current week
    const seasonInfo = await getCurrentSeasonInfo()
    // Map season display to database week number
    // POST1 → week 19, POST2 → week 20, etc.
    let currentWeek: number
    if (seasonInfo.isPostseason) {
      currentWeek = 18 + seasonInfo.currentWeek // POST1 → 19, POST2 → 20, etc.
    } else {
      currentWeek = seasonInfo.currentWeek
    }

    // Define week columns we will iterate (regular + post season)
    const weekColumns = [
      { column: 'reg1_team_matchup_id', week: 1 },
      { column: 'reg2_team_matchup_id', week: 2 },
      { column: 'reg3_team_matchup_id', week: 3 },
      { column: 'reg4_team_matchup_id', week: 4 },
      { column: 'reg5_team_matchup_id', week: 5 },
      { column: 'reg6_team_matchup_id', week: 6 },
      { column: 'reg7_team_matchup_id', week: 7 },
      { column: 'reg8_team_matchup_id', week: 8 },
      { column: 'reg9_team_matchup_id', week: 9 },
      { column: 'reg10_team_matchup_id', week: 10 },
      { column: 'reg11_team_matchup_id', week: 11 },
      { column: 'reg12_team_matchup_id', week: 12 },
      { column: 'reg13_team_matchup_id', week: 13 },
      { column: 'reg14_team_matchup_id', week: 14 },
      { column: 'reg15_team_matchup_id', week: 15 },
      { column: 'reg16_team_matchup_id', week: 16 },
      { column: 'reg17_team_matchup_id', week: 17 },
      { column: 'reg18_team_matchup_id', week: 18 },
      { column: 'post1_team_matchup_id', week: 19 },
      { column: 'post2_team_matchup_id', week: 20 },
      { column: 'post3_team_matchup_id', week: 21 },
      { column: 'post4_team_matchup_id', week: 22 }
    ] as const

    // Build valid matchups per week
    const validMatchupsByWeek = new Map<number, Set<string>>()
    for (const m of matchups || []) {
      const set = validMatchupsByWeek.get(m.week) || new Set<string>()
      set.add(m.id as unknown as string)
      validMatchupsByWeek.set(m.week, set)
    }

    // 4) Compute weekly active, eliminated, remaining up to current week
    type Weekly = { week: number; active: number; eliminated: number; remaining: number }
    const weekly: Weekly[] = []

    for (const wk of weekColumns) {
      if (wk.week > currentWeek) break
      const validIds = validMatchupsByWeek.get(wk.week) || new Set<string>()

      let activePicks = 0
      const weekPicks: Array<{ [key: string]: string | number | null }> = []
      for (const pick of allPicks) {
        const raw = (pick as { [key: string]: string | number | null })[wk.column as string] as string
        if (!raw) continue
        const parts = raw.split('_')
        if (parts.length < 2) continue
        const actualMatchupId = parts[0]
        if (!validIds.has(actualMatchupId)) continue
        activePicks += ((pick.picks_count as number) || 0)
        weekPicks.push(pick)
      }

      let eliminatedPicks = 0
      for (const pick of weekPicks) {
        const raw = (pick as { [key: string]: string | number | null })[wk.column as string] as string
        if (!raw) continue
        const parts = raw.split('_')
        if (parts.length < 2) continue
        const actualMatchupId = parts[0]
        const teamKey = parts.slice(1).join('_')
        if (!validIds.has(actualMatchupId)) continue

        const matchup = matchupMap.get(actualMatchupId)
        if (!matchup || matchup.status !== 'final') continue

        let isIncorrect = false
        if (matchup.away_score !== null && matchup.home_score !== null) {
          let winner: string | null = null
          if (matchup.away_score > matchup.home_score) winner = matchup.away_team
          else if (matchup.home_score > matchup.away_score) winner = matchup.home_team
          if (winner === null) {
            // tie eliminates everyone
            isIncorrect = true
          } else {
            let teamData = teamsMap.get(teamKey)
            if (!teamData) {
              const maybeAbbr = teamsMap.get(teamKey.toUpperCase())
              if (maybeAbbr) teamData = maybeAbbr
            }
            if (!teamData) {
              const byName = teamsMap.get(teamKey.replace(/_/g, ' '))
              if (byName) teamData = byName
            }
            if (!teamData) {
              for (const [key, data] of teamsMap.entries()) {
                if (key.toLowerCase().includes(teamKey.toLowerCase()) || teamKey.toLowerCase().includes(key.toLowerCase())) {
                  teamData = data
                  break
                }
              }
            }

            const pickedTeamName = teamData?.name || teamKey
            const normalizedWinner = winner.replace(/\s+/g, '_').toUpperCase()
            const candidates: string[] = []
            if (teamData?.abbreviation) candidates.push(teamData.abbreviation.toUpperCase())
            candidates.push(pickedTeamName.toUpperCase())
            candidates.push(pickedTeamName.replace(/\s+/g, '_').toUpperCase())
            candidates.push(pickedTeamName.replace(/_/g, ' ').toUpperCase())
            if (candidates.includes(normalizedWinner)) {
              isIncorrect = true
            }
          }
        }
        if (isIncorrect) {
          eliminatedPicks += ((pick.picks_count as number) || 0)
        }
      }

      const remainingPicks = Math.max(0, activePicks - eliminatedPicks)
      weekly.push({ week: wk.week, active: activePicks, eliminated: eliminatedPicks, remaining: remainingPicks })
    }

    // 5) Align current week active to prior week's remaining, then recompute remaining (exactly like admin)
    weekly.sort((a, b) => a.week - b.week)
    const currentIdx = weekly.findIndex(w => w.week === currentWeek)
    if (currentIdx === -1) {
      return NextResponse.json({ error: 'Failed to determine current week stats' }, { status: 500 })
    }
    if (currentIdx > 0) {
      weekly[currentIdx].active = weekly[currentIdx - 1].remaining
      weekly[currentIdx].remaining = Math.max(0, weekly[currentIdx].active - weekly[currentIdx].eliminated)
    }

    const remainingPicks = weekly[currentIdx].remaining

    return NextResponse.json({ remainingPicks })

  } catch (error) {
    console.error('Error calculating remaining picks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
