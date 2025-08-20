import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { getWeekColumnName } from '@/lib/week-utils'

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()

    // Parse request body
    const { matchupId, teamName, pickNameIds } = await request.json()

    // Validate required fields
    if (!matchupId || !teamName || !pickNameIds) {
      return NextResponse.json(
        { error: 'Missing required fields: matchupId, teamName, pickNameIds' },
        { status: 400 }
      )
    }

    // Ensure pickNameIds is an array
    const pickNames = Array.isArray(pickNameIds) ? pickNameIds : [pickNameIds]

    if (pickNames.length === 0) {
      return NextResponse.json(
        { error: 'At least one pick must be selected' },
        { status: 400 }
      )
    }

    // Verify the matchup exists
    const { data: matchup, error: matchupError } = await supabase
      .from('matchups')
      .select('id, week, away_team, home_team')
      .eq('id', matchupId)
      .single()

    if (matchupError || !matchup) {
      return NextResponse.json(
        { error: 'Invalid matchup' },
        { status: 400 }
      )
    }

    // Verify the team name is valid for this matchup
    if (teamName !== matchup.away_team && teamName !== matchup.home_team) {
      return NextResponse.json(
        { error: 'Invalid team for this matchup' },
        { status: 400 }
      )
    }

    // Get user's default week
    const { data: userData } = await supabase
      .from('users')
      .select('user_type, is_admin, default_week')
      .eq('id', user.id)
      .single()

    let userDefaultWeek: number
    if (userData?.default_week) {
      userDefaultWeek = userData.default_week
    } else {
      userDefaultWeek = 1
      if (userData?.is_admin || userData?.user_type === 'tester') {
        userDefaultWeek = 3
      }
    }

    console.log('Debug - Allocate API:', {
      userId: user.id,
      userType: userData?.user_type,
      userDefaultWeek,
      matchupWeek: matchup.week,
      matchupId: matchupId,
      teamName
    })

    // For now, allow allocation regardless of matchup week
    // The week column will be determined by the user's default week
    console.log('Debug - Allowing allocation:', { 
      matchupWeek: matchup.week, 
      userDefaultWeek,
      matchupId: matchupId
    })

    // Check if the game has already started (picks are locked)
    const { data: matchupData } = await supabase
      .from('matchups')
      .select('game_time')
      .eq('id', matchupId)
      .single()

    if (matchupData && new Date(matchupData.game_time) < new Date()) {
      return NextResponse.json(
        { error: 'Game has already started. Picks are locked.' },
        { status: 400 }
      )
    }

    // Get current week column using centralized logic
    const weekColumn = getWeekColumnName(userDefaultWeek)

    // Allocate or reallocate picks to the current week
    for (const pickName of pickNames) {
      // Find the existing pick (whether allocated or not)
      const { data: existingPick } = await supabase
        .from('picks')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('pick_name', pickName)
        .limit(1)

      if (existingPick && existingPick.length > 0) {
        const pick = existingPick[0]
        
        // Check if the pick has been eliminated - eliminated picks cannot be reallocated
        if (pick.status === 'eliminated') {
          return NextResponse.json(
            { error: `Pick "${pickName}" has been eliminated and cannot be reallocated` },
            { status: 400 }
          )
        }
        
              // Update the pick status to active (for both new allocations and reallocations)
      const { error: updateError } = await supabase
        .from('picks')
        .update({
          status: 'active'
          })
          .eq('id', pick.id)

        if (updateError) {
          console.error('Error updating pick status:', updateError)
          return NextResponse.json(
            { error: 'Failed to allocate picks' },
            { status: 500 }
          )
        }

        // Update the specific week column (this will overwrite any existing allocation)
        const { error: weekUpdateError } = await supabase
          .rpc('assign_pick_to_week', {
            p_pick_id: pick.id,
            p_week_column: weekColumn,
            p_matchup_id: matchupId,
            p_team_picked: teamName
          })

        if (weekUpdateError) {
          console.error('Error updating week column:', weekUpdateError)
          return NextResponse.json(
            { error: 'Failed to allocate picks' },
            { status: 500 }
          )
        }
      }
    }

    // Get the updated picks
    const { data: newPicks, error: selectError } = await supabase
      .from('picks')
      .select(`
        id,
        pick_name,
        picks_count,
        status,
        ${weekColumn}
      `)
      .eq('user_id', user.id)
      .in('pick_name', pickNames)
      .not(weekColumn, 'is', null)

    if (selectError) {
      console.error('Error selecting updated picks:', selectError)
      return NextResponse.json(
        { error: 'Failed to get updated picks' },
        { status: 500 }
      )
    }

    const pickCount = pickNames.length

    return NextResponse.json({
      success: true,
      picks: newPicks,
      message: `${pickCount} pick${pickCount !== 1 ? 's' : ''} allocated/reallocated to ${teamName}: ${pickNames.join(', ')}`
    })

  } catch (error) {
    console.error('Error in allocate picks API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
