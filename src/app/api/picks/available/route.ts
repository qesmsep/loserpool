import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentSeasonInfo } from '@/lib/season-detection'
import { isUserTester } from '@/lib/user-types'
import { getWeekColumnNameFromSeasonInfo } from '@/lib/week-utils'

// Type for pick data with dynamic week columns
type PickData = {
  pick_name: string
  status: string
  [key: string]: string | null | undefined // Allow dynamic week column properties
}

export async function GET() {
  try {
    console.log('🔍 Available picks API called')
    
    // Get headers
    const h = await headers()
    const authHeader = h.get('authorization') || h.get('Authorization')
    const hasBearer = !!authHeader && authHeader.toLowerCase().startsWith('bearer ')

    // Build the right client
    const supabase = hasBearer
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: authHeader! } }
        })
      : await createServerSupabaseClient()

    // Authenticate
    let userId: string
    
    if (hasBearer) {
      // Bearer Token
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log({ authMethod: 'bearer', hasUser: !!user, error: error?.message })
      
      if (error || !user) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
      }
      userId = user.id
    } else {
      // Cookie Session
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log({ authMethod: 'cookie', hasSession: !!session, error: error?.message })
      
      if (error || !session) {
        return NextResponse.json({ error: 'No session found' }, { status: 401 })
      }
      userId = session.user.id
    }

    const seasonInfo = await getCurrentSeasonInfo()
    const isTester = await isUserTester(userId)
    const weekColumn = getWeekColumnNameFromSeasonInfo(seasonInfo, isTester)
    const currentWeek = seasonInfo.currentWeek
    
    console.log('🔍 Available API Debug:', {
      userId: userId,
      isTester,
      seasonInfo,
      weekColumn,
      currentWeek
    })
    
    const { data: allPicksData } = await supabase
      .from('picks')
      .select(`
        pick_name,
        ${weekColumn},
        status
      `)
      .eq('user_id', userId)
      .not('pick_name', 'is', null)
      .neq('status', 'eliminated') as { data: PickData[] | null }

    // Get all matchups for the current season to map team_matchup_id to team names
    const { data: matchupsData } = await supabase
      .from('matchups')
      .select('id, away_team, home_team, season')
      .eq('season', seasonInfo.seasonDisplay)

    // Create a mapping of team_matchup_id to team name
    const teamMatchupMapping: { [key: string]: string } = {}
    matchupsData?.forEach(matchup => {
      const awayTeamMatchupId = `${matchup.id}_${matchup.away_team}`
      const homeTeamMatchupId = `${matchup.id}_${matchup.home_team}`
      teamMatchupMapping[awayTeamMatchupId] = matchup.away_team
      teamMatchupMapping[homeTeamMatchupId] = matchup.home_team
    })

    // Convert to the format expected by the popup
    const availablePicks = allPicksData?.map((pick: PickData) => {
      const isAllocated = !!pick[weekColumn]
      const allocatedTeam = isAllocated ? teamMatchupMapping[pick[weekColumn] as string] : null
      
      return {
        id: pick.pick_name,
        name: pick.pick_name,
        description: null,
        isAllocated,
        allocatedTeam,
        status: pick.status,
        matchupInfo: null
      }
    }) || []

    console.log('🔍 Available picks result:', {
      allPicksDataCount: allPicksData?.length || 0,
      matchupsDataCount: matchupsData?.length || 0,
      availablePicksCount: availablePicks.length,
      weekColumn,
      seasonDisplay: seasonInfo.seasonDisplay,
      availablePicks: availablePicks.map(p => ({ id: p.id, name: p.name, isAllocated: p.isAllocated, status: p.status }))
    })

    return NextResponse.json({ 
      availablePicks,
      success: true 
    })

  } catch (error) {
    console.error('Error in available picks API:', error)
    
    // Handle authentication errors specifically
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
