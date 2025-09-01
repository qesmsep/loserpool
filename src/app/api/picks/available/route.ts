import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuthForAPI } from '@/lib/auth'
import { getCurrentSeasonInfo } from '@/lib/season-detection'
import { isUserTester } from '@/lib/user-types'
import { getWeekColumnNameFromSeasonInfo } from '@/lib/week-utils'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// Type for pick data with dynamic week columns
type PickData = {
  pick_name: string
  status: string
  [key: string]: string | null | undefined // Allow dynamic week column properties
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Available picks API called')
    
    // Check for bearer token in Authorization header
    const authHeader = request.headers.get('authorization')
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader : null
    
    console.log('🔍 Auth header check:', {
      hasAuthHeader: !!authHeader,
      hasBearer: !!bearer,
      authHeader: authHeader?.substring(0, 20) + '...'
    })
    
    // Create Supabase client based on authentication method
    const supabaseCookie = await createServerSupabaseClient()
    const supabaseHeader = bearer
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: bearer } },
          auth: { persistSession: false, autoRefreshToken: false }
        })
      : null
    
    const client = supabaseHeader ?? supabaseCookie
    
    // Debug cookies (only for cookie-based auth)
    if (!supabaseHeader) {
      const cookieStore = await cookies()
      const allCookies = cookieStore.getAll()
      console.log('🔍 All cookies received:', allCookies.map(c => ({ name: c.name, value: c.value?.substring(0, 20) + '...' })))
      
      // Check for Supabase auth cookies specifically
      const supabaseCookies = allCookies.filter(c => c.name.includes('supabase') || c.name.includes('auth'))
      console.log('🔍 Supabase auth cookies:', supabaseCookies.map(c => ({ name: c.name, value: c.value?.substring(0, 20) + '...' })))
    }
    
    // Check session directly first
    const { data: { session }, error: sessionError } = await client.auth.getSession()
    
    console.log('🔍 Session check result:', {
      authMethod: supabaseHeader ? 'bearer' : 'cookie',
      hasSession: !!session,
      sessionError: sessionError?.message,
      sessionExpiresAt: session?.expires_at,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })
    
    if (sessionError) {
      console.error('Session error in available picks API:', sessionError)
      return NextResponse.json(
        { error: 'Session error', details: sessionError.message },
        { status: 401 }
      )
    }
    
    if (!session) {
      console.log('No session found in available picks API')
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      )
    }
    
    console.log('Session found for user:', session.user.email)
    
    // Get user from session
    const user = session.user
    console.log('User authenticated:', user.email)

    const seasonInfo = await getCurrentSeasonInfo()
    const isTester = await isUserTester(user.id)
    const weekColumn = getWeekColumnNameFromSeasonInfo(seasonInfo, isTester)
    const currentWeek = seasonInfo.currentWeek
    
    console.log('🔍 Available API Debug:', {
      userId: user.id,
      isTester,
      seasonInfo,
      weekColumn,
      currentWeek
    })
    
    const { data: allPicksData } = await client
      .from('picks')
      .select(`
        pick_name,
        ${weekColumn},
        status
      `)
      .eq('user_id', user.id)
      .not('pick_name', 'is', null)
      .neq('status', 'eliminated') as { data: PickData[] | null }

    // Get all matchups for the current season to map team_matchup_id to team names
    const { data: matchupsData } = await client
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
