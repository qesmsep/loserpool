import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'
import { getPoolStatus } from '@/lib/pool-status'

export async function GET() {
  try {
    await requireAdmin()
    const supabase = await createServerSupabaseClient()
    const poolStatus = await getPoolStatus()

    // Get users who would be affected by lock
    const { data: users } = await supabase
      .from('users')
      .select(`
        id,
        email,
        username,
        first_name,
        last_name,
        created_at,
        purchases!inner(
          picks_count,
          status
        )
      `)
      .eq('purchases.status', 'completed')

    // Get recent activity
    const { data: recentRegistrations } = await supabase
      .from('users')
      .select('id, email, username, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: recentPurchases } = await supabase
      .from('purchases')
      .select(`
        id,
        amount,
        picks_count,
        created_at,
        users!inner(
          email,
          username
        )
      `)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      message: 'Pool lock preview',
      poolStatus,
      stats: {
        totalUsers: users?.length || 0,
        recentRegistrations: recentRegistrations?.length || 0,
        recentPurchases: recentPurchases?.length || 0,
        totalRevenue: recentPurchases?.reduce((sum, p) => sum + p.amount, 0) || 0
      },
      recentActivity: {
        registrations: recentRegistrations || [],
        purchases: recentPurchases || []
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in pool lock preview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 