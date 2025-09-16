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

    // Get current week using the same logic as Default Pick API
    const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const seasonInfo = await getCurrentSeasonInfo()
    const currentWeek = seasonInfo.currentWeek

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

    // Find the target week column
    const targetWeekInfo = weekColumns.find(w => w.week === targetWeek)
    if (!targetWeekInfo) {
      return NextResponse.json({ error: 'Invalid week requested' }, { status: 400 })
    }

    // Get team pick breakdown for the specific week with pagination
        let allTeamPicksData: Array<{ [key: string]: string | number | null }> = []
    let from = 0
    const pageSize = 1000
    
    while (true) {
      const { data: teamPicksData, error: teamPicksError } = await supabaseAdmin
        .from('picks')
        .select(`${targetWeekInfo.column}, picks_count`)
        .not(targetWeekInfo.column, 'is', null)
        .not(targetWeekInfo.column, 'eq', '')
        .range(from, from + pageSize - 1)

      if (teamPicksError) {
        console.error(`Error fetching picks for ${targetWeekInfo.column}:`, teamPicksError)
        return NextResponse.json({ error: 'Failed to fetch team picks' }, { status: 500 })
      }

      if (!teamPicksData || teamPicksData.length === 0) {
        break
      }

      allTeamPicksData = allTeamPicksData.concat(teamPicksData as unknown as Array<{ [key: string]: string | number | null }>)
      
      if (teamPicksData.length < pageSize) {
        break
      }
      
      from += pageSize
    }

    console.log(`🔍 API: Fetched ${allTeamPicksData.length} total picks for ${targetWeekInfo.column} (paginated)`)

    // Get matchup results for this week to determine game outcomes
    console.log(`🔍 API: Looking for matchups with week = ${targetWeek}`)
    const { data: matchupsData, error: matchupsError } = await supabaseAdmin
      .from('matchups')
      .select('id, away_team, home_team, away_score, home_score, status, week')
      .eq('week', targetWeek)

    if (matchupsError) {
      console.error('Error fetching matchups data:', matchupsError)
      return NextResponse.json({ error: 'Failed to fetch matchups data' }, { status: 500 })
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

    // Create a map of matchup IDs to game results
    const matchupResults = new Map<string, { status: string; winner: string | null; away_team: string; home_team: string }>()
    if (matchupsData) {
      console.log(`🔍 API: Found ${matchupsData.length} matchups for week ${targetWeek}`)
      for (const matchup of matchupsData) {
        let winner: string | null = null
        
        if (matchup.status === 'final' && matchup.away_score !== null && matchup.home_score !== null) {
          if (matchup.away_score > matchup.home_score) {
            winner = matchup.away_team
          } else if (matchup.home_score > matchup.away_score) {
            winner = matchup.home_team
          }
          // Ties result in winner = null
        }
        
        console.log(`🔍 API: Matchup ${matchup.id}: ${matchup.away_team} @ ${matchup.home_team}, Status: ${matchup.status}, Winner: ${winner}`)
        
        matchupResults.set(matchup.id, {
          status: matchup.status,
          winner,
          away_team: matchup.away_team,
          home_team: matchup.home_team
        })
      }
    }

    // Count picks by team using the same logic as the existing modal
    const teamCounts = new Map<string, { pickCount: number; teamData: { name: string; abbreviation: string; primary_color: string; secondary_color: string } | undefined; gameResult: string }>()
    
    console.log(`🔍 API: Found ${allTeamPicksData?.length || 0} picks for ${targetWeekInfo.column}`)
    
    if (allTeamPicksData && allTeamPicksData.length > 0) {
      for (const pick of allTeamPicksData) {
        const matchupId = (pick as { [key: string]: string | number | null })[targetWeekInfo.column] as string
        if (!matchupId) continue
        
        console.log(`🔍 API: Pick has matchupId: ${matchupId}`)
        
        // Extract team name from matchup ID and get actual matchup ID
        const parts = matchupId.split('_')
        if (parts.length >= 2) {
          const teamKey = parts.slice(1).join('_')
          const actualMatchupId = parts[0] // Remove the team suffix to get the real matchup ID
          const pickCount = pick.picks_count || 0
          
          console.log(`🔍 API: Original matchupId: ${matchupId}, Actual matchupId: ${actualMatchupId}, Team: ${teamKey}`)
          
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
          
          console.log(`🔍 API: Processing pick for team ${teamKey}, original matchupId: ${matchupId}, actual matchupId: ${actualMatchupId}`)
          console.log(`🔍 API: Matchup result:`, matchupResult)
          
          if (matchupResult) {
            if (matchupResult.status === 'final') {
              if (matchupResult.winner === null) {
                gameResult = 'tie'
                console.log(`🔍 API: Game was a tie for ${teamKey}`)
              } else {
                // Check if the picked team won or lost
                const pickedTeamName = teamData?.name || teamKey
                console.log(`🔍 API: Comparing picked team "${pickedTeamName}" with winner "${matchupResult.winner}"`)
                console.log(`🔍 API: Away team: "${matchupResult.away_team}", Home team: "${matchupResult.home_team}"`)
                console.log(`🔍 API: Team data:`, teamData)
                
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
                else if (matchupResult.winner && pickedTeamName && 
                         (matchupResult.winner.toLowerCase().includes(pickedTeamName.toLowerCase()) ||
                          pickedTeamName.toLowerCase().includes(matchupResult.winner.toLowerCase()))) {
                  isWinner = true
                }
                
                if (isWinner) {
                  gameResult = 'won' // Team won - picks are incorrect (RED)
                  console.log(`🔍 API: ${pickedTeamName} WON - picks are incorrect (RED)`)
                } else {
                  gameResult = 'lost' // Team lost - picks are correct (GREEN)
                  console.log(`🔍 API: ${pickedTeamName} LOST - picks are correct (GREEN)`)
                }
              }
            } else {
              gameResult = 'pending' // Game not final yet
              console.log(`🔍 API: Game not final for ${teamKey}, status: ${matchupResult.status}`)
            }
          } else {
            console.log(`🔍 API: No matchup result found for ${teamKey}, actualMatchupId: ${actualMatchupId}`)
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

    // Create single week breakdown
    const teamPickBreakdown: TeamPickBreakdown[] = [{
      week: targetWeek,
      weekName: targetWeekInfo.name,
      teamPicks
    }]

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
