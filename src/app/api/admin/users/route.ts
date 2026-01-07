import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Check for bearer token first
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader : null
    
    let user = null
    
    if (bearer) {
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
        console.error('Bearer token auth error:', error)
      } else if (bearerUser) {
        user = bearerUser
      }
    }
    
    // Fall back to cookie-based authentication if bearer token failed
    if (!user) {
      user = await getCurrentUser()
    }
    
    if (!user) {
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
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

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

    // Determine current week and mapping using the same logic as Active Picks card
    const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const seasonInfo = await getCurrentSeasonInfo()
    const currentWeek: number | undefined = (seasonInfo as unknown as { currentWeek?: number })?.currentWeek
    if (!currentWeek || typeof currentWeek !== 'number') {
      return NextResponse.json({ error: 'no_current_week' }, { status: 500 })
    }
    const weekColumn = `reg${currentWeek}_team_matchup_id`
    
    // Fetch all picks in a single paginated query instead of per-user queries (N+1 problem)
    const allPicks: Array<{
      user_id: string
      status: string
      picks_count: number
      pick_name: string
      [key: string]: string | number | null | undefined
    }> = []
    
    const pageSize = 1000
    let from = 0
    let hasMore = true
    
    while (hasMore) {
      const { data: picksBatch, error: picksError } = await supabaseAdmin
        .from('picks')
        .select(`user_id, status, picks_count, pick_name, ${weekColumn}`)
        .range(from, from + pageSize - 1)
      
      if (picksError) {
        console.error('Error fetching picks:', picksError)
        break
      }
      
      if (picksBatch && picksBatch.length > 0) {
        allPicks.push(...(picksBatch as unknown as Array<{
          user_id: string
          status: string
          picks_count: number
          pick_name: string
          [key: string]: string | number | null | undefined
        }>))
        from += pageSize
        hasMore = picksBatch.length === pageSize
      } else {
        hasMore = false
      }
    }
    
    // Group picks by user_id for efficient lookup
    const picksByUserId = new Map<string, Array<{
      user_id: string
      status: string
      picks_count: number
      pick_name: string
      [key: string]: string | number | null | undefined
    }>>()
    
    for (const pick of allPicks) {
      const userId = pick.user_id as string
      if (!picksByUserId.has(userId)) {
        picksByUserId.set(userId, [])
      }
      picksByUserId.get(userId)!.push(pick)
    }

    // Calculate stats for each user
    const usersWithStats = (usersData || []).map((user) => {
      const userPurchases = user.purchases || []
      
      // Get picks for this user from the pre-fetched map
      const typedUserPicks = picksByUserId.get(user.id) || []
      
      const totalPurchased = userPurchases
        .filter((p: { status: string }) => p.status === 'completed')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
      
      // FIXED: Count ALL non-eliminated picks as active picks
      const activePicks = typedUserPicks
        .filter((p: { status: string }) => p.status !== 'eliminated')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
      
      const eliminatedPicks = typedUserPicks
        .filter((p: { status: string }) => p.status === 'eliminated')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)

      // Count pending picks (unallocated picks)
      const pendingPicks = typedUserPicks
        .filter((p: { status: string }) => p.status === 'pending')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)

      // Calculate total picks as active + eliminated (actual picks in system)
      const totalPicks = activePicks + eliminatedPicks

      // Get current week picks (picks that have a team_matchup_id for current week)
      const currentWeekPicks = typedUserPicks.filter(pick => {
        const teamMatchupId = pick[weekColumn]
        return teamMatchupId !== null && teamMatchupId !== undefined
      })

      return {
        ...user,
        totalPurchased,
        totalPicks, // This will be used for the "Total" display
        activePicks,
        eliminatedPicks,
        pendingPicks, // Add pending picks count
        isEliminated: eliminatedPicks > 0 && activePicks === 0 && totalPurchased > 0,
        currentWeekPicks: currentWeekPicks.map(pick => ({
          pick_name: pick.pick_name,
          status: pick.status,
          picks_count: pick.picks_count,
          team_matchup_id: pick[weekColumn]
        }))
      }
    })
    
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

    return NextResponse.json({ users: sortedUsers })
  } catch (error) {
    console.error('Unexpected error in admin users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
