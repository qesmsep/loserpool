import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    // Verify admin access
    await requireAdmin()
    const supabaseAdmin = createServiceRoleClient()

    // Get all picks
    const { data: picks, error: picksError } = await supabaseAdmin
      .from('picks')
      .select('*')
      .order('created_at', { ascending: false })

    if (picksError) {
      console.error('Error fetching picks:', picksError)
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
    }

    return NextResponse.json({
      picks: picks || [],
      count: picks?.length || 0
    })

  } catch (error) {
    console.error('Admin picks API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
