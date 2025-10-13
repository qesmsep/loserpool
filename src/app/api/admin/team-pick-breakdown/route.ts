import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

interface TeamPickBreakdown {
  week: number
  weekName: string
  teamPicks: Array<{
    team: string
    pickCount: number
    teamData?: {
      name: string
      abbreviation: string
      primary_color: string
      secondary_color: string
    }
    gameResult: 'won' | 'lost' | 'tie' | 'pending'
  }>
}

export async function GET(request: Request) {
  console.log('🔍 API: /api/admin/team-pick-breakdown called')
  
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

    console.log('🔍 API: User is admin, proceeding with team pick breakdown calculation')

    // Get current season/week using the same logic as the dashboard
    const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const seasonInfo = await getCurrentSeasonInfo()
    const currentWeek = seasonInfo.currentWeek
    const seasonFilter = seasonInfo.seasonDisplay // e.g., 'REG3'

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const requestedWeek = searchParams.get('week')
    
    // Determine which week to load
    const targetWeek = requestedWeek ? parseInt(requestedWeek) : currentWeek

    // Define week columns and their names (excluding preseason)
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

    // If a specific week is requested, return only that week
    // Otherwise, return all weeks that have picks
    let weeksToProcess: Array<{ column: string; week: number; name: string }>
    
    if (requestedWeek) {
      // Single week requested
      const targetWeekInfo = weekColumns.find(w => w.week === targetWeek)
      if (!targetWeekInfo) {
        return NextResponse.json({ error: 'Invalid week requested' }, { status: 400 })
      }
      weeksToProcess = [targetWeekInfo]
    } else {
      // All weeks - find weeks that have picks
      weeksToProcess = []
      
      // Check each week to see if it has picks
      for (const weekInfo of weekColumns) {
        const { data: weekPicks } = await supabaseAdmin
          .from('picks')
          .select('id')
          .not(weekInfo.column, 'is', null)
          .not(weekInfo.column, 'eq', '')
          .limit(1)
        
        if (weekPicks && weekPicks.length > 0) {
          weeksToProcess.push(weekInfo)
        }
      }
    }

    // Get all matchups for all weeks we're processing
    const allMatchupsData: Array<{ id: string; away_team: string; home_team: string; away_score: number | null; home_score: number | null; status: string; week: number; season: string }> = []
    
    for (const weekInfo of weeksToProcess) {
      // For each week, we need to find the correct season value
      // Week 1-3 might be REG1, REG2, REG3, etc.
      const weekSeasonFilter = `REG${weekInfo.week}`
      
      const { data: matchupsData, error: matchupsError } = await supabaseAdmin
        .from('matchups')
        .select('id, away_team, home_team, away_score, home_score, status, week, season')
        .eq('season', weekSeasonFilter)
        .eq('week', weekInfo.week)

      if (matchupsError) {
        console.error(`Error fetching matchups for week ${weekInfo.week}:`, matchupsError)
        continue
      }

      console.log(`🔍 API: Week ${weekInfo.week} (${weekSeasonFilter}): Found ${matchupsData?.length || 0} matchups`)
      if (matchupsData) {
        allMatchupsData.push(...matchupsData)
      }
    }

    console.log(`🔍 API: Found ${allMatchupsData.length} total matchups across ${weeksToProcess.length} weeks`)

    // Create a map of matchup IDs to game results for all weeks
    const matchupResults = new Map<string, { status: string; winner: string | null; away_team: string; home_team: string; week: number }>()
    for (const matchup of allMatchupsData) {
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

    // Get teams data for colors and proper names
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
        // Map both full name and abbreviation to team data
        teamsMap.set(team.name, team)
        teamsMap.set(team.abbreviation, team)
        
        // Also map common variations
        const nameParts = team.name.split(' ')
        if (nameParts.length > 1) {
          const cityTeam = nameParts.join('_')
          teamsMap.set(cityTeam, team)
        }
      }
    }

    // Process each week separately
    const teamPickBreakdown: TeamPickBreakdown[] = []
    
    for (const weekInfo of weeksToProcess) {
      console.log(`🔍 API: Processing week ${weekInfo.week} (${weekInfo.name})`)
      
      // Get team pick breakdown for this specific week with pagination
      const allTeamPicksData: Array<{ id: string; [key: string]: string | number | null }> = []
      const pageSize = 1000
      const seenIds = new Set<string>()
      let lastId: string | null = null

      while (true) {
        let query = supabaseAdmin
          .from('picks')
          .select(`id, ${weekInfo.column}, picks_count`)
          .not(weekInfo.column, 'is', null)
          .not(weekInfo.column, 'eq', '')
          .order('id', { ascending: true })
          .limit(pageSize)

        if (lastId) {
          query = query.gt('id', lastId)
        }

        const { data: teamPicksData, error: teamPicksError } = await query

        if (teamPicksError) {
          console.error(`Error fetching picks for ${weekInfo.column}:`, teamPicksError)
          break
        }

        if (!teamPicksData || teamPicksData.length === 0) {
          break
        }

        for (const row of teamPicksData as unknown as Array<{ id: string; [key: string]: string | number | null }>) {
          if (!seenIds.has(row.id)) {
            seenIds.add(row.id)
            allTeamPicksData.push(row)
          }
          lastId = row.id
        }

        if (teamPicksData.length < pageSize) {
          break
        }
      }

      console.log(`🔍 API: Fetched ${allTeamPicksData.length} total picks for ${weekInfo.column}`)

      // Only count picks whose parsed matchup_id belongs to this week's matchups
      const weekMatchups = allMatchupsData.filter(m => m.week === weekInfo.week)
      const validMatchupIds = new Set<string>(weekMatchups.map(m => m.id))
      
      // Count picks by team for this week
      const teamCounts = new Map<string, { pickCount: number; teamData: { name: string; abbreviation: string; primary_color: string; secondary_color: string } | undefined; gameResult: string }>()
      
      console.log(`🔍 API: Found ${allTeamPicksData?.length || 0} picks for ${weekInfo.column}`)
      
      if (allTeamPicksData && allTeamPicksData.length > 0) {
        for (const pick of allTeamPicksData) {
          const matchupId = (pick as { [key: string]: string | number | null })[weekInfo.column] as string
          if (!matchupId) continue
          
          // Extract team name from matchup ID and get actual matchup ID
          const parts = matchupId.split('_')
          if (parts.length >= 2) {
            const teamKey = parts.slice(1).join('_')
            const actualMatchupId = parts[0] // Remove the team suffix to get the real matchup ID
            const pickCount = pick.picks_count || 0
            
            // Filter to this week's matchups
            if (!validMatchupIds.has(actualMatchupId)) {
              continue
            }
            
            // Find team data
            let teamData = teamsMap.get(teamKey)
            if (!teamData) {
              // Try to find by partial match
              for (const [key, data] of teamsMap.entries()) {
                if (key.toLowerCase().includes(teamKey.toLowerCase()) || 
                    teamKey.toLowerCase().includes(key.toLowerCase())) {
                  teamData = data
                  break
                }
              }
            }
            
            // Determine game result for this team
            const matchupResult = matchupResults.get(actualMatchupId)
            let gameResult = 'pending'
            
            if (matchupResult) {
              if (matchupResult.status === 'final') {
                if (matchupResult.winner === null) {
                  gameResult = 'tie'
                } else {
                  // Check if the picked team won or lost
                  const pickedTeamName = teamData?.name || teamKey
                  
                  // Try multiple name matching strategies
                  let isWinner = false
                  
                  // Direct match
                  if (matchupResult.winner === pickedTeamName) {
                    isWinner = true
                  }
                  // Try abbreviation match
                  else if (teamData?.abbreviation && matchupResult.winner === teamData.abbreviation) {
                    isWinner = true
                  }
                  // Try partial match (in case of slight name differences)
                  else if (matchupResult.winner && pickedTeamName) {
                    // Avoid substring matches like 'NE' matching 'New Orleans'.
                    const normalizedWinner = matchupResult.winner.replace(/\s+/g, '_').toUpperCase()
                    const candidates: string[] = []
                    if (teamData?.abbreviation) candidates.push(teamData.abbreviation.toUpperCase())
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
              } else {
                gameResult = 'pending' // Game not final yet
              }
            }
            
            const current = teamCounts.get(teamKey) || { pickCount: 0, teamData: undefined, gameResult: 'pending' }
            teamCounts.set(teamKey, {
              pickCount: current.pickCount + (pickCount as number),
              teamData: teamData || current.teamData || undefined,
              gameResult: gameResult
            })
          }
        }
      }

      // Convert to array and sort by pick count (descending)
      const teamPicks = Array.from(teamCounts.entries())
        .map(([team, data]) => ({ 
          team, 
          pickCount: data.pickCount,
          teamData: data.teamData,
          gameResult: data.gameResult as 'pending' | 'won' | 'lost' | 'tie'
        }))
        .sort((a, b) => b.pickCount - a.pickCount)

      // Add this week's breakdown
      teamPickBreakdown.push({
        week: weekInfo.week,
        weekName: weekInfo.name,
        teamPicks
      })
    }

    // Sort by week number
    teamPickBreakdown.sort((a, b) => a.week - b.week)

    console.log('🔍 API: Successfully returning team pick breakdown data')
    return NextResponse.json({
      teamPickBreakdown,
      count: teamPickBreakdown.length
    })

  } catch (error) {
    console.error('🔍 API: Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
