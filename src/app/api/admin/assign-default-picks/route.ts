import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function POST() {
  try {
    // Verify admin access
    await requireAdmin()
    const supabase = await createServerSupabaseClient()

    // Get current week using the same logic as the dashboard
    const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const seasonInfo = await getCurrentSeasonInfo()
    const currentWeek = seasonInfo.currentWeek

    // Call the database function to assign default picks
    const { data: result, error: assignError } = await supabase
      .rpc('assign_default_picks', { target_week: currentWeek })

    if (assignError) {
      console.error('Error assigning default picks:', assignError)
      return NextResponse.json(
        { error: 'Failed to assign default picks' },
        { status: 500 }
      )
    }

    // Get details about what was assigned
    const { data: largestSpreadMatchup, error: matchupError } = await supabase
      .rpc('get_largest_spread_matchup', { target_week: currentWeek })

    if (matchupError) {
      console.error('Error getting largest spread matchup:', matchupError)
    }

    return NextResponse.json({
      message: `Default picks assigned successfully`,
      picksAssigned: result,
      currentWeek,
      largestSpreadMatchup: largestSpreadMatchup?.[0] || null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in assign default picks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing
export async function GET() {
  try {
    // Verify admin access
    await requireAdmin()
    const supabase = await createServerSupabaseClient()

    // Get current week using the same logic as the dashboard
    const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const seasonInfo = await getCurrentSeasonInfo()
    const currentWeek = seasonInfo.currentWeek

    // Get the largest spread matchup for preview
    const { data: largestSpreadMatchup, error: matchupError } = await supabase
      .rpc('get_largest_spread_matchup', { target_week: currentWeek })

    if (matchupError) {
      console.error('Error getting largest spread matchup:', matchupError)
    }

    // Get users who would get default picks
    const { data: usersNeedingPicks, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        username,
        first_name,
        last_name,
        purchases!inner(picks_count, status)
      `)
      .eq('purchases.status', 'completed')

    if (usersError) {
      console.error('Error fetching users needing picks:', usersError)
    }

    const usersToAssign = []
    if (usersNeedingPicks) {
      for (const user of usersNeedingPicks) {
        // Calculate available picks
        const totalPurchased = user.purchases.reduce((sum: number, purchase: { status: string; picks_count: number }) => {
          return sum + (purchase.status === 'completed' ? purchase.picks_count : 0)
        }, 0)

        // Check if user has made picks for current week
        const { data: existingPicks } = await supabase
          .from('picks')
          .select('id')
          .eq('user_id', user.id)
          .eq('week', currentWeek)

        if (!existingPicks || existingPicks.length === 0) {
          usersToAssign.push({
            id: user.id,
            email: user.email,
            username: user.username,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
            picksAvailable: totalPurchased
          })
        }
      }
    }

    return NextResponse.json({
      message: 'Default picks preview',
      currentWeek,
      largestSpreadMatchup: largestSpreadMatchup?.[0] || null,
      usersToAssign,
      userCount: usersToAssign.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in default picks preview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 