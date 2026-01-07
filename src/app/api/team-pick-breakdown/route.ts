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
    const isPost = seasonFilter.startsWith('POST')
    const weekNum = parseInt(seasonFilter.replace('PRE', '').replace('REG', '').replace('POST', '')) || 1
    const currentWeekColumn = isPre ? `pre${weekNum}_team_matchup_id` : (isPost ? `post${weekNum}_team_matchup_id` : `reg${weekNum}_team_matchup_id`)
    console.log('🟢 [/api/team-pick-breakdown] Season info:', { seasonFilter, currentWeek, currentWeekColumn })

    // Use the same logic as admin API to fetch matchups - use seasonFilter directly
    const weekSeasonFilter = seasonFilter // e.g., POST1, REG7, etc.
    // For post-season, weekNum is the ESPN week (1-4), which matches the matchup week
    // For regular season, weekNum also matches the matchup week
    
    const { data: currentWeekMatchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('id, away_team, home_team, away_score, home_score, status, week, season')
      .eq('season', weekSeasonFilter)
      .eq('week', weekNum) // Use weekNum from seasonFilter, which is the correct matchup week

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

    // Get teams data for team info and game results
    const { data: teamsData } = await supabase
      .from('teams')
      .select('name, abbreviation, primary_color, secondary_color')
      .eq('season', 2024)

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

    // Create matchup results map for game outcomes using admin API logic
    const matchupResults = new Map<string, { status: string; winner: string | null; away_team: string; home_team: string; week: number }>()
    for (const matchup of currentWeekMatchups || []) {
      let winner: string | null = null
      
      if (matchup.status === 'final' && matchup.away_score !== null && matchup.home_score !== null) {
        if (matchup.away_score > matchup.home_score) {
          winner = matchup.away_team
        } else if (matchup.home_score > matchup.away_score) {
          winner = matchup.home_team
        }
        // Ties result in winner = null
      }
      
      matchupResults.set(matchup.id, {
        status: matchup.status,
        winner,
        away_team: matchup.away_team,
        home_team: matchup.home_team,
        week: matchup.week
      })
    }

    const teamPicks = Array.from(counts.entries())
      .map(([team, pickCount]) => {
        // Find team data - try multiple matching strategies
        let teamData = teamsMap.get(team)
        if (!teamData) {
          // Try exact match first
          for (const [key, data] of teamsMap.entries()) {
            if (key.toLowerCase() === team.toLowerCase()) {
              teamData = data
              break
            }
          }
        }
        if (!teamData) {
          // Try partial matching
          for (const [key, data] of teamsMap.entries()) {
            if (key.toLowerCase().includes(team.toLowerCase()) || team.toLowerCase().includes(key.toLowerCase())) {
              teamData = data
              break
            }
          }
        }
        if (!teamData) {
          // Try matching just the city or mascot
          for (const [key, data] of teamsMap.entries()) {
            const keyParts = key.toLowerCase().split(' ')
            const teamParts = team.toLowerCase().split(' ')
            if (keyParts.some(part => teamParts.includes(part)) || teamParts.some(part => keyParts.includes(part))) {
              teamData = data
              break
            }
          }
        }

        // Determine game result for this team using the same logic as admin API
        let gameResult: 'won' | 'lost' | 'tie' | 'pending' = 'pending'
        
        // Find the matchup this team was in
        for (const matchup of currentWeekMatchups || []) {
          if (matchup.away_team === team || matchup.home_team === team) {
            const result = matchupResults.get(matchup.id)
            if (result && result.status === 'final') {
              if (result.winner === null) {
                gameResult = 'tie'
              } else {
                // Check if the picked team won or lost using sophisticated matching
                const pickedTeamName = teamData?.name || team
                
                // Try multiple name matching strategies
                let isWinner = false
                
                // Direct match
                if (result.winner === pickedTeamName) {
                  isWinner = true
                }
                // Try abbreviation match
                else if (teamData?.abbreviation && result.winner === teamData.abbreviation) {
                  isWinner = true
                }
                // Try partial match (in case of slight name differences)
                else if (result.winner && pickedTeamName) {
                  // Avoid substring matches like 'NE' in 'New Orleans'.
                  // Only consider exact matches against known canonical forms.
                  const normalizedWinner = result.winner.replace(/\s+/g, '_').toUpperCase()
                  const candidates: string[] = []
                  // Abbreviation
                  if (teamData?.abbreviation) candidates.push(teamData.abbreviation.toUpperCase())
                  // Full name with spaces and underscores
                  candidates.push(pickedTeamName.toUpperCase())
                  candidates.push(pickedTeamName.replace(/\s+/g, '_').toUpperCase())
                  candidates.push(pickedTeamName.replace(/_/g, ' ').toUpperCase())

                  isWinner = candidates.includes(normalizedWinner)
                }
                
                if (isWinner) {
                  gameResult = 'won' // Team won - picks are incorrect (RED)
                } else {
                  gameResult = 'lost' // Team lost - picks are correct (GREEN)
                }
              }
            }
            break
          }
        }
        

        return { 
          team, 
          pickCount,
          teamData,
          gameResult
        }
      })
      .sort((a, b) => b.pickCount - a.pickCount)

    console.log('🟢 [/api/team-pick-breakdown] Aggregation complete:', { rows: allPicks.length, teams: teamPicks.length })
    console.log('🟢 [/api/team-pick-breakdown] Sample team data:', teamPicks.slice(0, 3).map(t => ({ team: t.team, hasTeamData: !!t.teamData, teamDataName: t.teamData?.name, colors: t.teamData ? { primary: t.teamData.primary_color, secondary: t.teamData.secondary_color } : 'none' })))
    
    // Debug Rams specifically
    const ramsData = teamPicks.find(t => t.team.toLowerCase().includes('rams') || t.team.toLowerCase().includes('los angeles'))
    if (ramsData) {
      console.log('🔍 Rams API Debug:', {
        team: ramsData.team,
        gameResult: ramsData.gameResult,
        teamData: ramsData.teamData
      })
    }
    
    // Debug all matchups to see Rams game
    const ramsMatchups = currentWeekMatchups?.filter(m => 
      m.away_team.toLowerCase().includes('rams') || 
      m.home_team.toLowerCase().includes('rams') ||
      m.away_team.toLowerCase().includes('los angeles') ||
      m.home_team.toLowerCase().includes('los angeles')
    )
    console.log('🔍 Rams Matchups:', ramsMatchups)
    
    // Debug all matchups to see what teams are available
    console.log('🔍 All matchups:', currentWeekMatchups?.map(m => ({ 
      id: m.id, 
      away: m.away_team, 
      home: m.home_team, 
      status: m.status, 
      away_score: m.away_score, 
      home_score: m.home_score 
    })))
    
    // Debug all teams to find Rams
    console.log('🔍 All teams in teamPicks:', teamPicks.map(t => ({ team: t.team, gameResult: t.gameResult })))

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


