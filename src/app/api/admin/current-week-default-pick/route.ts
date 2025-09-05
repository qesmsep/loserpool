import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    // Verify admin access
    await requireAdmin()
    const supabase = await createServerSupabaseClient()

    // Get current week from global settings
    const { data: weekSetting, error: weekError } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_week')
      .single()

    if (weekError || !weekSetting) {
      return NextResponse.json(
        { error: 'Could not determine current week' },
        { status: 500 }
      )
    }

    const currentWeek = parseInt(weekSetting.value)

    // Get the largest spread matchup for current week
    const { data: largestSpreadMatchup, error: matchupError } = await supabase
      .rpc('get_largest_spread_matchup', { target_week: currentWeek })

    if (matchupError) {
      console.error('Error getting largest spread matchup:', matchupError)
      return NextResponse.json(
        { error: 'Failed to get largest spread matchup' },
        { status: 500 }
      )
    }

    // Get users who would get default picks (users with completed purchases but no picks for current week)
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
      return NextResponse.json(
        { error: 'Failed to fetch users needing picks' },
        { status: 500 }
      )
    }

    // Calculate how many users would get default picks
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

    // Get all matchups for current week to show spread information
    const { data: currentWeekMatchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('*')
      .eq('week', currentWeek)
      .order('game_time', { ascending: true })

    if (matchupsError) {
      console.error('Error fetching current week matchups:', matchupsError)
    }

    // Calculate total picks that would be assigned
    const totalPicksToAssign = usersToAssign.reduce((sum, user) => sum + user.picksAvailable, 0)

    return NextResponse.json({
      currentWeek,
      defaultPick: largestSpreadMatchup?.[0] || null,
      usersNeedingPicks: usersToAssign,
      userCount: usersToAssign.length,
      totalPicksToAssign,
      currentWeekMatchups: currentWeekMatchups || [],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in current week default pick:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
