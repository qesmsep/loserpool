import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    // Check admin authentication using the same pattern as other admin routes
    const adminUser = await requireAdmin()
    console.log('Admin check passed:', adminUser?.email)

    // Create service role client to bypass RLS for fetching all users
    const supabaseAdmin = createServiceRoleClient()

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

    // Get current week column
    let weekColumn: string
    if (currentWeek <= 3) {
      weekColumn = `pre${currentWeek}_team_matchup_id`
    } else if (currentWeek <= 20) {
      weekColumn = `reg${currentWeek - 3}_team_matchup_id`
    } else {
      weekColumn = `post${currentWeek - 20}_team_matchup_id`
    }

    // Fetch picks data with current week information
    const { data: picks, error: picksError } = await supabaseAdmin
      .from('picks')
      .select(`user_id, status, picks_count, pick_name, ${weekColumn}`)

    if (picksError) {
      console.error('Error fetching picks:', picksError)
      return NextResponse.json({ error: 'Failed to fetch picks data' }, { status: 500 })
    }

    // Calculate stats for each user
    const usersWithStats = usersData?.map(user => {
      const userPurchases = user.purchases || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userPicks = (picks as any[])?.filter((p: any) => p.user_id === user.id) || []
      
      const totalPurchased = userPurchases
        .filter((p: { status: string }) => p.status === 'completed')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
      
      const activePicks = userPicks
        .filter((p: { status: string }) => p.status === 'active')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
      
      const eliminatedPicks = userPicks
        .filter((p: { status: string }) => p.status === 'eliminated')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)

      // Get current week picks (picks that have a team_matchup_id for current week)
      const currentWeekPicks = userPicks.filter(pick => {
        const teamMatchupId = (pick as Record<string, unknown>)[weekColumn]
        return teamMatchupId !== null && teamMatchupId !== undefined
      })

      return {
        ...user,
        totalPurchased,
        activePicks,
        eliminatedPicks,
        isEliminated: eliminatedPicks > 0 && activePicks === 0 && totalPurchased > 0,
        currentWeekPicks: currentWeekPicks.map(pick => ({
          pick_name: pick.pick_name,
          status: pick.status,
          picks_count: pick.picks_count,
          team_matchup_id: (pick as Record<string, unknown>)[weekColumn]
        }))
      }
    }) || []

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
    console.error('Admin users API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
