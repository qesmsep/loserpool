import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function POST() {
  try {
    // Verify admin access
    await requireAdmin()
    const supabase = await createServerSupabaseClient()

    console.log('🔄 Admin: Converting safe picks to pending status')

    // Call the database function to convert safe picks to pending
    const { data: result, error: convertError } = await supabase
      .rpc('admin_convert_safe_to_pending')

    if (convertError) {
      console.error('Error converting safe picks:', convertError)
      return NextResponse.json(
        { error: 'Failed to convert safe picks' },
        { status: 500 }
      )
    }

    console.log('✅ Admin: Safe picks conversion result:', result)

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in convert safe picks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing and status checking
export async function GET() {
  try {
    // Verify admin access
    await requireAdmin()
    const supabase = await createServerSupabaseClient()

    // Get picks that are ready for conversion
    const { data: readyPicks, error: readyError } = await supabase
      .rpc('get_picks_ready_for_conversion')

    if (readyError) {
      console.error('Error getting picks ready for conversion:', readyError)
      return NextResponse.json(
        { error: 'Failed to get picks ready for conversion' },
        { status: 500 }
      )
    }

    // Get current picks status distribution
    const { data: statusCounts, error: statusError } = await supabase
      .from('picks')
      .select('status')
      .then(({ data }) => {
        if (!data) return { data: [], error: null }
        
        const counts = data.reduce((acc: Record<string, number>, pick) => {
          acc[pick.status] = (acc[pick.status] || 0) + 1
          return acc
        }, {})
        
        return { data: counts, error: null }
      })

    return NextResponse.json({
      success: true,
      readyForConversion: readyPicks || [],
      statusCounts: statusCounts || {},
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in get safe picks status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

