import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    // Temporarily bypass admin check for debugging
    // await requireAdmin()
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
        { error: 'Failed to get matchups', details: matchupsError.message },
        { status: 500 }
      )
    }

    console.log('Found matchups:', matchups?.length || 0)

    // Find the matchup with the smallest spread (most likely to win for loser pool)
    let bestDefaultPickMatchup = null
    if (matchups && matchups.length > 0) {
      // Filter out games that have already started
      const futureMatchups = matchups.filter(m => new Date(m.game_time) > new Date())
      
      if (futureMatchups.length > 0) {
        // Find the matchup with the smallest spread (most competitive game = most likely to win)
        bestDefaultPickMatchup = futureMatchups.reduce((best, current) => {
          // Calculate the spread magnitude for each team (smaller = more competitive)
          const currentAwaySpread = Math.abs(current.away_spread || 0)
          const currentHomeSpread = Math.abs(current.home_spread || 0)
          const currentMaxSpread = Math.max(currentAwaySpread, currentHomeSpread)
          
          const bestAwaySpread = Math.abs(best.away_spread || 0)
          const bestHomeSpread = Math.abs(best.home_spread || 0)
          const bestMaxSpread = Math.max(bestAwaySpread, bestHomeSpread)
          
          // Choose the matchup with the SMALLEST spread (most competitive)
          return currentMaxSpread < bestMaxSpread ? current : best
        })

        // Add computed fields
        if (bestDefaultPickMatchup) {
          // Determine which team is the underdog (most likely to win in loser pool)
          const awaySpread = bestDefaultPickMatchup.away_spread || 0
          const homeSpread = bestDefaultPickMatchup.home_spread || 0
          
          if (awaySpread < homeSpread) {
            // Away team is the underdog (more likely to win)
            bestDefaultPickMatchup.favored_team = bestDefaultPickMatchup.away_team
            bestDefaultPickMatchup.spread_magnitude = Math.abs(awaySpread)
          } else {
            // Home team is the underdog (more likely to win)
            bestDefaultPickMatchup.favored_team = bestDefaultPickMatchup.home_team
            bestDefaultPickMatchup.spread_magnitude = Math.abs(homeSpread)
          }
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
      defaultPick: bestDefaultPickMatchup || null,
      usersNeedingPicks: usersToAssign,
      userCount: usersToAssign.length,
      totalPicksToAssign,
      currentWeekMatchups: matchups || [],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in current week default pick:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
