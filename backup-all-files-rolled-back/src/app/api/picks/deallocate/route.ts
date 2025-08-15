import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()

    // Parse request body
    const { matchupId, teamName, pickNames } = await request.json()

    // Validate required fields
    if (!matchupId || !teamName || !pickNames) {
      return NextResponse.json(
        { error: 'Missing required fields: matchupId, teamName, pickNames' },
        { status: 400 }
      )
    }

    // Ensure pickNames is an array
    const pickNameArray = Array.isArray(pickNames) ? pickNames : [pickNames]

    if (pickNameArray.length === 0) {
      return NextResponse.json(
        { error: 'At least one pick must be specified' },
        { status: 400 }
      )
    }

    // Get current week
    const { data: settings } = await supabase
      .from('global_settings')
      .select('key, value')
      .in('key', ['current_week'])

    const weekSetting = settings?.find(s => s.key === 'current_week')
    const currentWeek = weekSetting ? parseInt(weekSetting.value) : 1

    // Determine which week column to clear - determine the correct prefix based on current week
    let weekColumn: string
    if (currentWeek <= 3) {
      weekColumn = `pre${currentWeek}_team_matchup_id`
    } else if (currentWeek <= 20) {
      weekColumn = `reg${currentWeek - 3}_team_matchup_id`
    } else {
      weekColumn = `post${currentWeek - 20}_team_matchup_id`
    }

    // Update each pick to set it back to pending
    for (const pickName of pickNameArray) {
      // Find the existing pick
      const { data: existingPick } = await supabase
        .from('picks')
        .select('id')
        .eq('user_id', user.id)
        .eq('pick_name', pickName)
        .not(weekColumn, 'is', null)
        .limit(1)

      if (existingPick && existingPick.length > 0) {
        // Update the pick to set it back to pending
        const { error: updateError } = await supabase
          .from('picks')
          .update({
            status: 'pending'
          })
          .eq('id', existingPick[0].id)

        if (updateError) {
          console.error('Error updating pick:', updateError)
          return NextResponse.json(
            { error: 'Failed to deallocate picks' },
            { status: 500 }
          )
        }

        // Also clear the specific week column
        const { error: weekUpdateError } = await supabase
          .from('picks')
          .update({ [weekColumn]: null })
          .eq('id', existingPick[0].id)

        if (weekUpdateError) {
          console.error('Error clearing week column:', weekUpdateError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${pickNameArray.length} pick${pickNameArray.length !== 1 ? 's' : ''} deallocated from ${teamName}`
    })

  } catch (error) {
    console.error('Error in deallocate picks API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
