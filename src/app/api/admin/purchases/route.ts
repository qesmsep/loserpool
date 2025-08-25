import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    // Verify admin access
    await requireAdmin()
    const supabaseAdmin = createServiceRoleClient()

    // Get all purchases
    const { data: purchases, error: purchasesError } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false })

    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError)
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
    }

    return NextResponse.json({
      purchases: purchases || [],
      count: purchases?.length || 0
    })

  } catch (error) {
    console.error('Admin purchases API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
