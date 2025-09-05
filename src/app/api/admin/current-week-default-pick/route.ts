import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    // Verify admin access
    await requireAdmin()
    const supabase = await createServerSupabaseClient()

    // For now, let's use a hardcoded current week since global_settings might not exist
    // TODO: Replace with proper current week detection
    const currentWeek = 1

    // Get all matchups for current week
    const { data: matchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('*')
      .eq('week', currentWeek)
      .eq('status', 'scheduled')
      .order('game_time', { ascending: true })

    if (matchupsError) {
      console.error('Error getting matchups:', matchupsError)
      return NextResponse.json(
        { error: 'Failed to get matchups' },
        { status: 500 }
      )
    }

    // Find the matchup with the largest spread
    let largestSpreadMatchup = null
    if (matchups && matchups.length > 0) {
      // Filter out games that have already started
      const futureMatchups = matchups.filter(m => new Date(m.game_time) > new Date())
      
      if (futureMatchups.length > 0) {
        // Find the matchup with the largest spread
        largestSpreadMatchup = futureMatchups.reduce((largest, current) => {
          const currentSpread = Math.abs(Math.max(current.away_spread || 0, current.home_spread || 0))
          const largestSpread = Math.abs(Math.max(largest.away_spread || 0, largest.home_spread || 0))
          return currentSpread > largestSpread ? current : largest
        })

        // Add computed fields
        if (largestSpreadMatchup) {
          largestSpreadMatchup.favored_team = (largestSpreadMatchup.away_spread || 0) > (largestSpreadMatchup.home_spread || 0) 
            ? largestSpreadMatchup.away_team 
            : largestSpreadMatchup.home_team
          largestSpreadMatchup.spread_magnitude = Math.abs(Math.max(largestSpreadMatchup.away_spread || 0, largestSpreadMatchup.home_spread || 0))
        }
      }
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

    // Calculate total picks that would be assigned
    const totalPicksToAssign = usersToAssign.reduce((sum, user) => sum + user.picksAvailable, 0)

    return NextResponse.json({
      currentWeek,
      defaultPick: largestSpreadMatchup || null,
      usersNeedingPicks: usersToAssign,
      userCount: usersToAssign.length,
      totalPicksToAssign,
      currentWeekMatchups: matchups || [],
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
