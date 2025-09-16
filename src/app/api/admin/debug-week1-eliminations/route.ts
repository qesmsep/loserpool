import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  console.log('🔍 API: /api/admin/debug-week1-eliminations called')
  
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
    
    if (error || !userProfile?.is_admin) {
      console.log('🔍 API: User is not admin, returning 401')
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    
    console.log('🔍 API: User is admin, proceeding with Week 1 elimination debug')
    
    // Get all picks with pagination
    let allPicks: any[] = []
    let from = 0
    const pageSize = 1000
    
    while (true) {
      const { data: picksData, error: picksError } = await supabaseAdmin
        .from('picks')
        .select('*')
        .range(from, from + pageSize - 1)
      
      if (picksError) {
        console.error('Error fetching picks:', picksError)
        return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
      }
      
      if (!picksData || picksData.length === 0) {
        break
      }
      
      allPicks = allPicks.concat(picksData)
      
      if (picksData.length < pageSize) {
        break
      }
      
      from += pageSize
    }
    
    console.log(`🔍 API: Fetched ${allPicks.length} total picks`)
    
    // Get Week 1 matchups
    const { data: week1Matchups, error: matchupsError } = await supabaseAdmin
      .from('matchups')
      .select('id, away_team, home_team, away_score, home_score, status')
      .eq('week', 1)
    
    if (matchupsError) {
      console.error('Error fetching Week 1 matchups:', matchupsError)
      return NextResponse.json({ error: 'Failed to fetch matchups' }, { status: 500 })
    }
    
    console.log(`🔍 API: Found ${week1Matchups?.length || 0} Week 1 matchups`)
    
    // Get teams data
    const { data: teamsData, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('name, abbreviation')
      .eq('season', 2024)
    
    if (teamsError) {
      console.error('Error fetching teams data:', teamsError)
      return NextResponse.json({ error: 'Failed to fetch teams data' }, { status: 500 })
    }
    
    // Create teams map
    const teamsMap = new Map<string, any>()
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
    
    // Create matchup results map
    const matchupResults = new Map<string, { status: string; winner: string | null; away_team: string; home_team: string }>()
    if (week1Matchups) {
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
    }
    
    // Analyze Week 1 picks
    const week1Picks = allPicks.filter(pick => 
      pick.reg1_team_matchup_id !== null && pick.reg1_team_matchup_id !== undefined
    )
    
    console.log(`🔍 API: Found ${week1Picks.length} Week 1 picks`)
    
    const debugResults = {
      totalWeek1Picks: week1Picks.length,
      totalWeek1PickCount: week1Picks.reduce((sum, pick) => sum + (pick.picks_count || 0), 0),
      matchups: week1Matchups?.map(m => ({
        id: m.id,
        game: `${m.away_team} @ ${m.home_team}`,
        score: `${m.away_score} - ${m.home_score}`,
        status: m.status,
        winner: matchupResults.get(m.id)?.winner || 'TBD'
      })) || [],
      eliminatedPicks: [] as any[],
      correctPicks: [] as any[],
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
    
    return NextResponse.json({ debugResults })
    
  } catch (error) {
    console.error('Error in debug Week 1 eliminations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
