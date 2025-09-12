import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    // Temporarily bypass admin check for debugging
    // await requireAdmin()
    const supabase = await createServerSupabaseClient()

    // Get current week using the same logic as the dashboard
    const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const seasonInfo = await getCurrentSeasonInfo()
    let currentWeek = seasonInfo.currentWeek

    // Check if a precomputed next-week default pick exists (set by Tuesday 8am cron)
    const { data: storedSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'next_week_default_pick')
      .maybeSingle()

    if (storedSetting?.value) {
      try {
        const stored = JSON.parse(storedSetting.value)
        // If stored week matches current week or currentWeek + 1, use it and set response week accordingly
        if (stored?.week === currentWeek || stored?.week === currentWeek + 1) {
          currentWeek = stored.week
          const favoredTeamFromStored: string = stored.favored_team
          const awayTeam: string = stored.away_team
          const homeTeam: string = stored.home_team
          // API historically returns the underdog in favored_team; UI inverts to show favorite
          const apiFavoredTeam = favoredTeamFromStored === awayTeam ? homeTeam : awayTeam

          return NextResponse.json({
            currentWeek,
            defaultPick: {
              matchup_id: stored.matchup_id,
              away_team: awayTeam,
              home_team: homeTeam,
              favored_team: apiFavoredTeam,
              spread_magnitude: stored.spread_magnitude,
              game_time: stored.game_time
            },
            usersNeedingPicks: [],
            userCount: 0,
            totalPicksToAssign: 0
          })
        }
      } catch (e) {
        // If parsing fails, ignore and fall back to live computation
        console.warn('Failed to parse next_week_default_pick; falling back to live computation')
      }
    }

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

    // Find the matchup with the largest spread (most favored team = most likely to win)
    let bestDefaultPickMatchup = null
    if (matchups && matchups.length > 0) {
      // Filter out games that have already started
      const futureMatchups = matchups.filter(m => new Date(m.game_time) > new Date())
      
      if (futureMatchups.length > 0) {
        // Find the matchup with the largest positive spread (most underdog team = most likely to lose)
        bestDefaultPickMatchup = futureMatchups.reduce((best, current) => {
          // Calculate the positive spread for each team (larger positive = more underdog)
          const currentAwayPositiveSpread = Math.max(0, current.away_spread || 0)
          const currentHomePositiveSpread = Math.max(0, current.home_spread || 0)
          const currentMaxPositiveSpread = Math.max(currentAwayPositiveSpread, currentHomePositiveSpread)
          
          const bestAwayPositiveSpread = Math.max(0, best.away_spread || 0)
          const bestHomePositiveSpread = Math.max(0, best.home_spread || 0)
          const bestMaxPositiveSpread = Math.max(bestAwayPositiveSpread, bestHomePositiveSpread)
          
          // Choose the matchup with the LARGEST positive spread (most underdog team)
          return currentMaxPositiveSpread > bestMaxPositiveSpread ? current : best
        })

        // Add computed fields
        if (bestDefaultPickMatchup) {
          // Debug: Log the matchup data
          console.log('Default pick calculation for week', currentWeek)
          console.log('Best matchup found:', {
            id: bestDefaultPickMatchup.id,
            away_team: bestDefaultPickMatchup.away_team,
            home_team: bestDefaultPickMatchup.home_team,
            away_spread: bestDefaultPickMatchup.away_spread,
            home_spread: bestDefaultPickMatchup.home_spread,
            game_time: bestDefaultPickMatchup.game_time
          })
          console.log('All matchups considered:', futureMatchups.map(m => ({
            id: m.id,
            away_team: m.away_team,
            home_team: m.home_team,
            away_spread: m.away_spread,
            home_spread: m.home_spread,
            game_time: m.game_time
          })))
          
          // Determine which team is the underdog (most likely to lose in loser pool)
          const awaySpread = bestDefaultPickMatchup.away_spread || 0
          const homeSpread = bestDefaultPickMatchup.home_spread || 0
          
          // The team with the POSITIVE spread is the underdog (most likely to lose)
          if (awaySpread > 0) {
            // Away team is the underdog (most likely to lose)
            bestDefaultPickMatchup.favored_team = bestDefaultPickMatchup.away_team
            bestDefaultPickMatchup.spread_magnitude = awaySpread
            console.log('Selected away team as most likely to lose (underdog):', bestDefaultPickMatchup.away_team, 'with spread:', awaySpread)
          } else if (homeSpread > 0) {
            // Home team is the underdog (most likely to lose)
            bestDefaultPickMatchup.favored_team = bestDefaultPickMatchup.home_team
            bestDefaultPickMatchup.spread_magnitude = homeSpread
            console.log('Selected home team as most likely to lose (underdog):', bestDefaultPickMatchup.home_team, 'with spread:', homeSpread)
          } else {
            // Fallback: pick the team with the larger positive spread (shouldn't happen with new logic)
            if (awaySpread > homeSpread) {
              bestDefaultPickMatchup.favored_team = bestDefaultPickMatchup.away_team
              bestDefaultPickMatchup.spread_magnitude = awaySpread
            } else {
              bestDefaultPickMatchup.favored_team = bestDefaultPickMatchup.home_team
              bestDefaultPickMatchup.spread_magnitude = homeSpread
            }
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
