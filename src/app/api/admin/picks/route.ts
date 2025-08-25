import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    // Verify admin access
    await requireAdmin()
    const supabaseAdmin = createServiceRoleClient()

    // Get all picks using pagination to ensure we get every record
    let allPicks: any[] = []
    let hasMore = true
    let from = 0
    const pageSize = 1000

    while (hasMore) {
      const { data: picks, error: picksError } = await supabaseAdmin
        .from('picks')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1)

      if (picksError) {
        console.error('Error fetching picks:', picksError)
        return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
      }

      if (picks && picks.length > 0) {
        allPicks = allPicks.concat(picks)
        from += pageSize
        hasMore = picks.length === pageSize
      } else {
        hasMore = false
      }
    }

    return NextResponse.json({
      picks: allPicks,
      count: allPicks.length
    })

  } catch (error) {
    console.error('Admin picks API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
