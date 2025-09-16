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

    // Get all picks using pagination to ensure we get every record
    let allPicks: Array<{ [key: string]: string | number | null }> = []
    let hasMore = true
    let from = 0
    const pageSize = 1000

    while (hasMore) {
      const { data: picks, error: picksError } = await supabaseAdmin
        .from('picks')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1)

      if (picksError) {
        console.error('Error fetching picks:', picksError)
        return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
      }

      if (picks && picks.length > 0) {
        allPicks = allPicks.concat(picks)
        from += pageSize
        hasMore = picks.length === pageSize
      } else {
        hasMore = false
      }
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

    // Calculate statistics for each week using column mapping
    const weeklyStats: WeeklyStats[] = []

    // First pass: Calculate active picks for each week (sum of pick counts, not just count of picks)
    const weekActivePicks = new Map<number, number>()
    
    for (const weekInfo of weekColumns) {
      const { column, week, name } = weekInfo
      
      let activePicks = 0
      
      if (week === currentWeek) {
        // Current week: Active picks = Sum of picks_count for all picks with status NOT ELIMINATED
        const currentWeekPicks = allPicks.filter(pick => pick.status !== 'eliminated')
        activePicks = currentWeekPicks.reduce((sum, pick) => sum + (pick.picks_count || 0), 0)
        console.log(`🔍 Weekly Stats: Current Week ${week} has ${currentWeekPicks.length} active picks with total count ${activePicks}`)
      } else {
        // Past/future weeks: Active picks = Sum of picks_count for picks that have a non-null value in this week's column
        const weekPicks = allPicks.filter(pick => (pick as any)[column] !== null && (pick as any)[column] !== undefined)
        activePicks = weekPicks.reduce((sum, pick) => sum + (pick.picks_count || 0), 0)
        
        if (week <= 3) { // Debug first few weeks
          console.log(`🔍 Weekly Stats: Week ${week} has ${weekPicks.length} picks with total count ${activePicks}`)
        }
      }
      
      weekActivePicks.set(week, activePicks)
    }

    // Second pass: Calculate eliminated picks using game results (same logic as Team Picks Breakdown)
    for (const weekInfo of weekColumns) {
      const { column, week, name } = weekInfo
      
      const activePicks = weekActivePicks.get(week) || 0
      let eliminatedPicks = 0
      
      if (week === currentWeek) {
        // Current week: Eliminated picks = 0 (week hasn't finished)
        eliminatedPicks = 0
      } else {
        // Past weeks: Calculate eliminated picks based on actual game results
        // Get all picks for this week
        const weekPicks = allPicks.filter(pick => 
          (pick as { [key: string]: string | number | null })[column] !== null && (pick as { [key: string]: string | number | null })[column] !== undefined
        )
        
        // Count picks that were incorrect (teams that won or tied)
        for (const pick of weekPicks) {
          const matchupId = (pick as { [key: string]: string | number | null })[column] as string
          if (!matchupId) continue
          
          // Extract actual matchup ID (remove team suffix)
          const parts = matchupId.split('_')
          if (parts.length >= 2) {
            const actualMatchupId = parts[0]
            const teamKey = parts.slice(1).join('_')
            
            // Get matchup result
            const matchup = matchupMap.get(actualMatchupId)
            if (matchup && matchup.status === 'final') {
              // Determine if the picked team won or lost
              let isIncorrect = false
              
              if (matchup.away_score !== null && matchup.home_score !== null) {
                let winner: string | null = null
                if (matchup.away_score > matchup.home_score) {
                  winner = matchup.away_team
                } else if (matchup.home_score > matchup.away_score) {
                  winner = matchup.home_team
                }
                // Ties result in winner = null
                
                if (winner === null) {
                  // Tie - all picks are incorrect
                  isIncorrect = true
                } else {
                  // Find team data for proper name matching
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
                  
                  // Check if picked team won (incorrect in loser pool)
                  if (winner === pickedTeamName || 
                      (teamData?.abbreviation && winner === teamData.abbreviation) ||
                      (winner && pickedTeamName && 
                       (winner.toLowerCase().includes(pickedTeamName.toLowerCase()) ||
                        pickedTeamName.toLowerCase().includes(winner.toLowerCase())))) {
                    isIncorrect = true
                  }
                }
              }
              
              if (isIncorrect) {
                eliminatedPicks += pick.picks_count || 0
              }
            }
          }
        }
      }

      // Remaining picks are active picks minus eliminated picks
      const remainingPicks = Math.max(0, activePicks - eliminatedPicks)

      // Only include weeks that have some activity
      if (activePicks > 0 || eliminatedPicks > 0) {
        console.log(`🔍 Weekly Stats: Week ${week} (${name})`)
        console.log(`🔍 Weekly Stats: Active Picks: ${activePicks}, Eliminated: ${eliminatedPicks}, Remaining: ${remainingPicks}`)
        
        weeklyStats.push({
          week,
          weekName: name,
          activePicks,
          eliminatedPicks,
          remainingPicks
        })
      }
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
          totalWeek1PickCount: week1Picks.reduce((sum, pick) => sum + (pick.picks_count || 0), 0),
          matchups: week1Matchups.map(m => ({
            id: m.id,
            game: `${m.away_team} @ ${m.home_team}`,
            score: `${m.away_score} - ${m.home_score}`,
            status: m.status,
            winner: matchupResults.get(m.id)?.winner || 'TBD'
          })),
          eliminatedPicks: [] as Array<{ user_id: string; team_picked: string; matchup_id: string; picks_count: number }>,
          correctPicks: [] as Array<{ user_id: string; team_picked: string; matchup_id: string; picks_count: number }>,
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
          const parts = matchupId.split('_')
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
                debugResults.summary.totalEliminatedPickCount += pick.picks_count || 0
              } else {
                debugResults.correctPicks.push(pickInfo)
                debugResults.summary.totalCorrect++
                debugResults.summary.totalCorrectPickCount += pick.picks_count || 0
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
