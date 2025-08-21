import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { matchupId, teamName, pickNameIds } = await request.json()

    if (!matchupId || !teamName || !pickNameIds || !Array.isArray(pickNameIds)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Get the current user from the session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    const userId = user.id
    const picksCount = pickNameIds.length

    // Use the new season detection system to get the correct column name
    const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const { isUserTester } = await import('@/lib/user-types')
    const { getWeekColumnNameFromSeasonInfo } = await import('@/lib/week-utils')
    
    const seasonInfo = await getCurrentSeasonInfo()
    const isTester = await isUserTester(userId)
    const weekColumnName = getWeekColumnNameFromSeasonInfo(seasonInfo, isTester)

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

    // Create the team_matchup_id value in the format: "matchupId_teamName"
    const teamMatchupId = `${matchupId}_${teamName}`

    // Create or update the pick for the current week
    const { data: pick, error } = await supabase
      .from('picks')
      .upsert({
        user_id: userId,
        [weekColumnName]: teamMatchupId,
        picks_count: picksCount,
        status: 'active',
        pick_name: `Pick ${pickNameIds.join(', ')}`
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating/updating pick:', error)
      return NextResponse.json(
        { error: 'Failed to create pick' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      pick,
      picksRemaining: picksAvailable - picksCount,
      weekColumnName
    })

  } catch (error) {
    console.error('Error in picks allocation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
