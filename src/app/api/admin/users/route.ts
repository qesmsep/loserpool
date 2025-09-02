import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  console.log('🔍 API: /api/admin/users called')
  
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

    console.log('🔍 API: User is admin, proceeding with data fetch')

    // Fetch all users with their stats using service role client
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        purchases(
          picks_count,
          status
        )
      `)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get current week
    const { data: settings } = await supabaseAdmin
      .from('global_settings')
      .select('key, value')
      .in('key', ['current_week'])

    const weekSetting = settings?.find(s => s.key === 'current_week')
    const currentWeek = weekSetting ? parseInt(weekSetting.value) : 1

    // Get current week column - SIMPLIFIED LOGIC (no testers)
    let weekColumn: string
    if (currentWeek >= 1 && currentWeek <= 18) {
      // Regular season weeks 1-18 map directly to reg1_team_matchup_id through reg18_team_matchup_id
      weekColumn = `reg${currentWeek}_team_matchup_id`
    } else if (currentWeek > 18) {
      // Postseason weeks
      weekColumn = `post${currentWeek - 18}_team_matchup_id`
    } else {
      // Preseason weeks (fallback)
      weekColumn = `pre${currentWeek}_team_matchup_id`
    }

    console.log(`🔍 Week mapping: current_week=${currentWeek} → column=${weekColumn}`)
    console.log(`🔍 This means we're looking for picks in the ${weekColumn} column`)

    // Fetch picks data with current week information - FIXED APPROACH
    console.log(`🔍 Fetching picks with column: ${weekColumn}`)
    
    // Instead of trying to get all picks at once (which hits limits),
    // we'll query picks for each user individually in the loop below

    // Calculate stats for each user
    const usersWithStats = await Promise.all(usersData?.map(async (user) => {
      const userPurchases = user.purchases || []
      
      // Query picks individually for each user to avoid limits
      const { data: userPicks, error: userPicksError } = await supabaseAdmin
        .from('picks')
        .select(`user_id, status, picks_count, pick_name, ${weekColumn}`)
        .eq('user_id', user.id)
      
      if (userPicksError) {
        console.error(`Error fetching picks for user ${user.email}:`, userPicksError)
      }
      
      // Debug: Check picks for specific users
      if (user.email?.includes('greg@pmiquality.com') || user.email?.includes('247eagle') || user.email?.includes('gregory')) {
        console.log(`🔍 User picks for ${user.email}:`, {
          userId: user.id,
          totalPicks: userPicks?.length || 0,
          pickDetails: userPicks?.map(p => ({ 
            status: p.status, 
            picks_count: p.picks_count,
            pick_name: p.pick_name,
            team_matchup_id: p[weekColumn]
          })) || []
        })
      }
      
      const totalPurchased = userPurchases
        .filter((p: { status: string }) => p.status === 'completed')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
      
      // FIXED: Count ALL non-eliminated picks as active picks
      const activePicks = userPicks
        ?.filter((p: { status: string }) => p.status !== 'eliminated')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0) || 0
      
      const eliminatedPicks = userPicks
        ?.filter((p: { status: string }) => p.status === 'eliminated')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0) || 0

      // Calculate total picks as active + eliminated (actual picks in system)
      const totalPicks = activePicks + eliminatedPicks

      // Debug logging for pick counting
      if (user.email?.includes('greg@pmiquality.com') || user.email?.includes('247eagle') || user.email?.includes('gregory')) {
        console.log(`🔍 Debug for user ${user.email}:`, {
          totalPicks: userPicks?.length || 0,
          pickStatuses: userPicks?.map(p => ({ 
            status: p.status, 
            picks_count: p.picks_count,
            pick_name: p.pick_name,
            team_matchup_id: p[weekColumn]
          })) || [],
          activePicks,
          eliminatedPicks,
          totalPurchased,
          totalPicksCalculated: totalPicks,
          weekColumn,
          hasCurrentWeekPicks: userPicks?.some(p => p[weekColumn] !== null) || false
        })
      }

      // Get current week picks (picks that have a team_matchup_id for current week)
      const currentWeekPicks = userPicks?.filter(pick => {
        const teamMatchupId = pick[weekColumn]
        return teamMatchupId !== null && teamMatchupId !== undefined
      }) || []

      return {
        ...user,
        totalPurchased,
        totalPicks, // This will be used for the "Total" display
        activePicks,
        eliminatedPicks,
        isEliminated: eliminatedPicks > 0 && activePicks === 0 && totalPurchased > 0,
        currentWeekPicks: currentWeekPicks.map(pick => ({
          pick_name: pick.pick_name,
          status: pick.status,
          picks_count: pick.picks_count,
          team_matchup_id: pick[weekColumn]
        }))
      }
            })) || []
    
    // Sort users by username (or email if no username), with admins first
    const sortedUsers = usersWithStats.sort((a, b) => {
      // Admins first
      if (a.is_admin && !b.is_admin) return -1
      if (!a.is_admin && b.is_admin) return 1
      
      // Then by username/email
      const aName = a.username || a.email || ''
      const bName = b.username || b.email || ''
      return aName.localeCompare(bName)
    })

    // Log summary of pick counting results
    const totalActivePicks = sortedUsers.reduce((sum, user) => sum + (user.activePicks || 0), 0)
    const totalEliminatedPicks = sortedUsers.reduce((sum, user) => sum + (user.eliminatedPicks || 0), 0)
    console.log(`🔍 Pick counting summary: ${totalActivePicks} total active picks, ${totalEliminatedPicks} total eliminated picks across ${sortedUsers.length} users`)
    
    console.log('🔍 API: Successfully returning users data')
    return NextResponse.json({ users: sortedUsers })
  } catch (error) {
    console.error('🔍 API: Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
