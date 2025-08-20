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

    // Fetch picks data
    const { data: picks, error: picksError } = await supabaseAdmin
      .from('picks')
      .select('user_id, status, picks_count')

    if (picksError) {
      console.error('Error fetching picks:', picksError)
      return NextResponse.json({ error: 'Failed to fetch picks data' }, { status: 500 })
    }

    // Calculate stats for each user
    const usersWithStats = usersData?.map(user => {
      const userPurchases = user.purchases || []
      const userPicks = picks?.filter(p => p.user_id === user.id) || []
      
      const totalPurchased = userPurchases
        .filter((p: { status: string }) => p.status === 'completed')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
      
      const activePicks = userPicks
        .filter((p: { status: string }) => p.status === 'active')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
      
      const eliminatedPicks = userPicks
        .filter((p: { status: string }) => p.status === 'eliminated')
        .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)

      return {
        ...user,
        totalPurchased,
        activePicks,
        eliminatedPicks,
        isEliminated: eliminatedPicks > 0 && activePicks === 0 && totalPurchased > 0
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
