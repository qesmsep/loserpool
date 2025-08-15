import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

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

    // Check if deadline has passed
    const { data: settings } = await supabase
      .from('global_settings')
      .select('key, value')
      .in('key', ['current_week'])

    const weekSetting = settings?.find(s => s.key === 'current_week')
    const currentWeek = weekSetting ? parseInt(weekSetting.value) : 1

    if (matchup.week !== currentWeek) {
      return NextResponse.json(
        { error: 'Can only allocate picks for current week' },
        { status: 400 }
      )
    }

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

    // Get current week column - determine the correct prefix based on current week
    let weekColumn: string
    if (currentWeek <= 3) {
      weekColumn = `pre${currentWeek}_team_matchup_id`
    } else if (currentWeek <= 20) {
      weekColumn = `reg${currentWeek - 3}_team_matchup_id`
    } else {
      weekColumn = `post${currentWeek - 20}_team_matchup_id`
    }

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
        
        // Update the pick status to pending (for both new allocations and reallocations)
        const { error: updateError } = await supabase
          .from('picks')
          .update({
            status: 'pending'
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
