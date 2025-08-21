import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { userId, matchupId, teamPicked, picksCount } = await request.json()

    if (!userId || !matchupId || !teamPicked || !picksCount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Use the new season detection system to get user's default week
    const { getUserDefaultWeek } = await import('@/lib/season-detection')
    const userDefaultWeek = await getUserDefaultWeek(userId)

    // Check if user has enough picks available
    const { data: purchases } = await supabase
      .from('purchases')
      .select('picks_count')
      .eq('user_id', userId)
      .eq('status', 'completed')

    const totalPicksPurchased = purchases?.reduce((sum, purchase) => sum + purchase.picks_count, 0) || 0

    // Get user's current picks
    const { data: currentPicks } = await supabase
      .from('picks')
      .select('picks_count')
      .eq('user_id', userId)

    const totalPicksUsed = currentPicks?.reduce((sum, pick) => sum + pick.picks_count, 0) || 0
    const picksAvailable = totalPicksPurchased - totalPicksUsed

    if (picksCount > picksAvailable) {
      return NextResponse.json(
        { error: 'Not enough picks available' },
        { status: 400 }
      )
    }

    // Create the pick
    const { data: pick, error } = await supabase
      .from('picks')
      .insert({
        user_id: userId,
        matchup_id: matchupId,
        team_picked: teamPicked,
        picks_count: picksCount,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating pick:', error)
      return NextResponse.json(
        { error: 'Failed to create pick' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      pick,
      picksRemaining: picksAvailable - picksCount,
      userDefaultWeek
    })

  } catch (error) {
    console.error('Error in picks allocation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
