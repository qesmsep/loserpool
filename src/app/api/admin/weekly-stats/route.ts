import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

interface WeeklyStats {
  week: number
  weekName: string
  activePicks: number
  eliminatedPicks: number
  remainingPicks: number
}

export async function GET(request: Request) {
  console.log('🔍 API: /api/admin/weekly-stats called')
  
  // Check if this is a debug request
  const { searchParams } = new URL(request.url)
  const debugWeek1 = searchParams.get('debug-week1')
  
  try {
    // Check for bearer token first
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader : null
    
    let user = null
    
    if (bearer) {
      console.log('🔍 API: Using bearer token authentication')
      // Create a client with the bearer token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: bearer } },
          auth: { persistSession: false, autoRefreshToken: false }
        }
      )
      
      const { data: { user: bearerUser }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('🔍 API: Bearer token auth error:', error)
      } else if (bearerUser) {
        user = bearerUser
        console.log('🔍 API: Bearer token auth successful:', user.email)
      }
    }
    
    // Fall back to cookie-based authentication if bearer token failed
    if (!user) {
      console.log('🔍 API: Falling back to cookie-based authentication')
      user = await getCurrentUser()
    }
    
    console.log('🔍 API: Final authentication result:', { hasUser: !!user, userEmail: user?.email })
    
    if (!user) {
      console.log('🔍 API: No user found, returning 401')
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    
    // Check if user is admin
    const supabaseAdmin = createServiceRoleClient()
    const { data: userProfile, error } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    console.log('🔍 API: Admin check result:', { hasProfile: !!userProfile, isAdmin: userProfile?.is_admin, error: error?.message })
    
    if (error || !userProfile?.is_admin) {
      console.log('🔍 API: User is not admin, returning 401')
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    console.log('🔍 API: User is admin, proceeding with weekly stats calculation')

    // Get all picks using keyset pagination (future-proof against duplicates and drift)
    // Select only the fields needed for calculations to reduce payload
    const weekCols = [
      'pre1_team_matchup_id','pre2_team_matchup_id','pre3_team_matchup_id',
      'reg1_team_matchup_id','reg2_team_matchup_id','reg3_team_matchup_id','reg4_team_matchup_id','reg5_team_matchup_id','reg6_team_matchup_id','reg7_team_matchup_id','reg8_team_matchup_id','reg9_team_matchup_id','reg10_team_matchup_id','reg11_team_matchup_id','reg12_team_matchup_id','reg13_team_matchup_id','reg14_team_matchup_id','reg15_team_matchup_id','reg16_team_matchup_id','reg17_team_matchup_id','reg18_team_matchup_id',
      'post1_team_matchup_id','post2_team_matchup_id','post3_team_matchup_id','post4_team_matchup_id'
    ]

    const baseSelect = `id,user_id,status,picks_count,${weekCols.join(',')}`

    let allPicks: Array<{ [key: string]: string | number | null }> = []
    const seenIds = new Set<string>()
    const pageSize = 1000
    let lastId: string | null = null
    let fetchedRows = 0

    while (true) {
      let query = supabaseAdmin
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

      fetchedRows += picks.length

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

    if (fetchedRows !== allPicks.length) {
      console.log('🔍 Weekly Stats: Deduped picks during pagination', {
        fetchedRows,
        uniqueRows: allPicks.length,
        deduped: fetchedRows - allPicks.length
      })
    } else {
      console.log('🔍 Weekly Stats: Pagination complete with no duplicates', { fetchedRows })
    }

    // Get all matchups to determine week information and results
    const { data: matchups, error: matchupsError } = await supabaseAdmin
      .from('matchups')
      .select('id, week, status, away_score, home_score, away_team, home_team')

    if (matchupsError) {
      console.error('Error fetching matchups:', matchupsError)
      return NextResponse.json({ error: 'Failed to fetch matchups' }, { status: 500 })
    }

    // Get teams data for proper team name matching
    const { data: teamsData, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('name, abbreviation, primary_color, secondary_color')
      .eq('season', 2024)

    if (teamsError) {
      console.error('Error fetching teams data:', teamsError)
      return NextResponse.json({ error: 'Failed to fetch teams data' }, { status: 500 })
    }

    // Create a map of team names to team data
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

    // Create a map of matchup_id to matchup data
    const matchupMap = new Map<string, { id: string; week: number; away_team: string; home_team: string; away_score: number | null; home_score: number | null; status: string }>()
    matchups?.forEach(matchup => {
      matchupMap.set(matchup.id, matchup)
    })

    // Define week columns and their names (excluding preseason)
    // Week 1 = reg1_team_matchup_id, Week 2 = reg2_team_matchup_id, etc.
    const weekColumns = [
      { column: 'reg1_team_matchup_id', week: 1, name: 'Regular Season Week 1' },
      { column: 'reg2_team_matchup_id', week: 2, name: 'Regular Season Week 2' },
      { column: 'reg3_team_matchup_id', week: 3, name: 'Regular Season Week 3' },
      { column: 'reg4_team_matchup_id', week: 4, name: 'Regular Season Week 4' },
      { column: 'reg5_team_matchup_id', week: 5, name: 'Regular Season Week 5' },
      { column: 'reg6_team_matchup_id', week: 6, name: 'Regular Season Week 6' },
      { column: 'reg7_team_matchup_id', week: 7, name: 'Regular Season Week 7' },
      { column: 'reg8_team_matchup_id', week: 8, name: 'Regular Season Week 8' },
      { column: 'reg9_team_matchup_id', week: 9, name: 'Regular Season Week 9' },
      { column: 'reg10_team_matchup_id', week: 10, name: 'Regular Season Week 10' },
      { column: 'reg11_team_matchup_id', week: 11, name: 'Regular Season Week 11' },
      { column: 'reg12_team_matchup_id', week: 12, name: 'Regular Season Week 12' },
      { column: 'reg13_team_matchup_id', week: 13, name: 'Regular Season Week 13' },
      { column: 'reg14_team_matchup_id', week: 14, name: 'Regular Season Week 14' },
      { column: 'reg15_team_matchup_id', week: 15, name: 'Regular Season Week 15' },
      { column: 'reg16_team_matchup_id', week: 16, name: 'Regular Season Week 16' },
      { column: 'reg17_team_matchup_id', week: 17, name: 'Regular Season Week 17' },
      { column: 'reg18_team_matchup_id', week: 18, name: 'Regular Season Week 18' },
      { column: 'post1_team_matchup_id', week: 19, name: 'Post Season Week 1' },
      { column: 'post2_team_matchup_id', week: 20, name: 'Post Season Week 2' },
      { column: 'post3_team_matchup_id', week: 21, name: 'Post Season Week 3' },
      { column: 'post4_team_matchup_id', week: 22, name: 'Post Season Week 4' }
    ]

    // Get current week using the same logic as Default Pick logic
    const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const seasonInfo = await getCurrentSeasonInfo()
    const currentWeek = seasonInfo.currentWeek

    // Build stats using the same logic as Team Picks Breakdown
    const weeklyStats: WeeklyStats[] = []
    const validMatchupsByWeek = new Map<number, Set<string>>()
    for (const m of matchups || []) {
      const set = validMatchupsByWeek.get(m.week) || new Set<string>()
      set.add(m.id as unknown as string)
      validMatchupsByWeek.set(m.week, set)
    }

    for (const weekInfo of weekColumns) {
      const { column, week, name } = weekInfo
      
      // Only process up to the current week
      if (week > currentWeek) {
        break
      }
      const validIds = validMatchupsByWeek.get(week) || new Set<string>()

      // Active picks for historic weeks = sum of picks_count where week column exists and maps to this week's matchups
      let activePicks = 0
      const weekPicks: Array<{ [key: string]: string | number | null }> = []
      for (const pick of allPicks) {
        const raw = (pick as { [key: string]: string | number | null })[column] as string
        if (!raw) continue
        const parts = raw.split('_')
        if (parts.length < 2) continue
        const actualMatchupId = parts[0]
        if (!validIds.has(actualMatchupId)) continue
        activePicks += ((pick.picks_count as number) || 0)
        weekPicks.push(pick)
      }

      // Eliminated picks = picks in this week whose picked team won or tied (final only), same as team breakdown
      let eliminatedPicks = 0
      for (const pick of weekPicks) {
        const raw = (pick as { [key: string]: string | number | null })[column] as string
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
            isIncorrect = true
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
              isIncorrect = true
            }
          }
        }
        if (isIncorrect) {
          eliminatedPicks += ((pick.picks_count as number) || 0)
        }
      }

      const remainingPicks = Math.max(0, activePicks - eliminatedPicks)
      weeklyStats.push({ week, weekName: name, activePicks, eliminatedPicks, remainingPicks })
    }

    // Ensure current week Active = prior week's Remaining, per request
    weeklyStats.sort((a, b) => a.week - b.week)
    const currentIdx = weeklyStats.findIndex(s => s.week === currentWeek)
    if (currentIdx > 0) {
      weeklyStats[currentIdx].activePicks = weeklyStats[currentIdx - 1].remainingPicks
      weeklyStats[currentIdx].remainingPicks = Math.max(0, weeklyStats[currentIdx].activePicks - weeklyStats[currentIdx].eliminatedPicks)
    }

    // Sort by week number
    weeklyStats.sort((a, b) => a.week - b.week)

    // If this is a debug request for Week 1, add detailed elimination analysis
    if (debugWeek1 === 'true') {
      console.log('🔍 API: Adding Week 1 elimination debug data')
      
      // Get Week 1 matchups
      const { data: week1Matchups, error: matchupsError } = await supabaseAdmin
        .from('matchups')
        .select('id, away_team, home_team, away_score, home_score, status')
        .eq('week', 1)
      
      if (!matchupsError && week1Matchups) {
        // Create matchup results map
        const matchupResults = new Map<string, { status: string; winner: string | null; away_team: string; home_team: string }>()
        for (const matchup of week1Matchups) {
          let winner: string | null = null
          
          if (matchup.status === 'final' && matchup.away_score !== null && matchup.home_score !== null) {
            if (matchup.away_score > matchup.home_score) {
              winner = matchup.away_team
            } else if (matchup.home_score > matchup.away_score) {
              winner = matchup.home_team
            }
          }
          
          matchupResults.set(matchup.id, {
            status: matchup.status,
            winner,
            away_team: matchup.away_team,
            home_team: matchup.home_team
          })
        }
        
        // Analyze Week 1 picks
        const week1Picks = allPicks.filter(pick => 
          pick.reg1_team_matchup_id !== null && pick.reg1_team_matchup_id !== undefined
        )
        
        const debugResults = {
          totalWeek1Picks: week1Picks.length,
          totalWeek1PickCount: week1Picks.reduce((sum, pick) => sum + ((pick.picks_count as number) || 0), 0),
          matchups: week1Matchups.map(m => ({
            id: m.id,
            game: `${m.away_team} @ ${m.home_team}`,
            score: `${m.away_score} - ${m.home_score}`,
            status: m.status,
            winner: matchupResults.get(m.id)?.winner || 'TBD'
          })),
          eliminatedPicks: [] as Array<{ userId: string | number | null; matchupId: string; pickedTeam: string; game: string; winner: string | null; picksCount: string | number; isEliminated: boolean; reason: string }>,
          correctPicks: [] as Array<{ userId: string | number | null; matchupId: string; pickedTeam: string; game: string; winner: string | null; picksCount: string | number; isEliminated: boolean; reason: string }>,
          summary: {
            totalEliminated: 0,
            totalCorrect: 0,
            totalEliminatedPickCount: 0,
            totalCorrectPickCount: 0
          }
        }
        
        // Process each Week 1 pick
        for (const pick of week1Picks) {
          const matchupId = pick.reg1_team_matchup_id
          if (!matchupId) continue
          
          // Extract actual matchup ID and team
          const parts = (matchupId as string).split('_')
          if (parts.length >= 2) {
            const actualMatchupId = parts[0]
            const teamKey = parts.slice(1).join('_')
            
            const matchupResult = matchupResults.get(actualMatchupId)
            if (matchupResult && matchupResult.status === 'final') {
              let isEliminated = false
              let reason = ''
              
              if (matchupResult.winner === null) {
                // Tie - all picks eliminated
                isEliminated = true
                reason = 'Tie game - all picks eliminated'
              } else {
                // Find team data
                let teamData = teamsMap.get(teamKey)
                if (!teamData) {
                  for (const [key, data] of teamsMap.entries()) {
                    if (key.toLowerCase().includes(teamKey.toLowerCase()) || 
                        teamKey.toLowerCase().includes(key.toLowerCase())) {
                      teamData = data
                      break
                    }
                  }
                }
                
                const pickedTeamName = teamData?.name || teamKey
                
                // Check if picked team won (eliminated in loser pool)
                if (matchupResult.winner === pickedTeamName || 
                    (teamData?.abbreviation && matchupResult.winner === teamData.abbreviation) ||
                    (matchupResult.winner && pickedTeamName && 
                     (matchupResult.winner.toLowerCase().includes(pickedTeamName.toLowerCase()) ||
                      pickedTeamName.toLowerCase().includes(matchupResult.winner.toLowerCase())))) {
                  isEliminated = true
                  reason = `${pickedTeamName} won (incorrect pick in loser pool)`
                } else {
                  reason = `${pickedTeamName} lost (correct pick in loser pool)`
                }
              }
              
              const pickInfo = {
                userId: pick.user_id,
                matchupId: actualMatchupId,
                pickedTeam: teamKey,
                game: `${matchupResult.away_team} @ ${matchupResult.home_team}`,
                winner: matchupResult.winner,
                picksCount: pick.picks_count || 0,
                isEliminated,
                reason
              }
              
              if (isEliminated) {
                debugResults.eliminatedPicks.push(pickInfo)
                debugResults.summary.totalEliminated++
                debugResults.summary.totalEliminatedPickCount += (pick.picks_count as number) || 0
              } else {
                debugResults.correctPicks.push(pickInfo)
                debugResults.summary.totalCorrect++
                debugResults.summary.totalCorrectPickCount += (pick.picks_count as number) || 0
              }
            }
          }
        }
        
        console.log('🔍 API: Week 1 elimination analysis complete')
        console.log(`🔍 API: Total eliminated: ${debugResults.summary.totalEliminated} (${debugResults.summary.totalEliminatedPickCount} picks)`)
        console.log(`🔍 API: Total correct: ${debugResults.summary.totalCorrect} (${debugResults.summary.totalCorrectPickCount} picks)`)
        
        return NextResponse.json({ weeklyStats, debugResults })
      }
    }

    console.log('🔍 API: Successfully returning weekly stats data')
    return NextResponse.json({
      weeklyStats,
      count: weeklyStats.length
    })

  } catch (error) {
    console.error('🔍 API: Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

