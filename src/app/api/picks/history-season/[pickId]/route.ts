import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { pickId: string } }
) {
  try {
    // Verify user is authenticated
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()

    const { pickId } = params

    if (!pickId) {
      return NextResponse.json(
        { error: 'Pick ID is required' },
        { status: 400 }
      )
    }

    // Get pick history by season using the database function
    const { data: pickHistorySeason, error } = await supabase
      .rpc('get_pick_history_by_season', { p_pick_id: pickId })

    if (error) {
      console.error('Error fetching pick history by season:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pick history' },
        { status: 500 }
      )
    }

    // Verify the pick belongs to the authenticated user
    if (pickHistorySeason && pickHistorySeason.length > 0) {
      const { data: pickOwner } = await supabase
        .from('picks')
        .select('user_id')
        .eq('id', pickId)
        .limit(1)

      if (pickOwner && pickOwner.length > 0 && pickOwner[0].user_id !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized access to pick history' },
          { status: 403 }
        )
      }
    }

    // Get detailed matchup information for each season
    const seasonData = pickHistorySeason?.[0] || {}
    const matchupIds = [
      seasonData.pre1_matchup_id,
      seasonData.pre2_matchup_id,
      seasonData.reg1_matchup_id,
      seasonData.reg2_matchup_id,
      seasonData.post1_matchup_id,
      seasonData.post2_matchup_id
    ].filter(Boolean)

    let matchupDetails = {}
    if (matchupIds.length > 0) {
      const { data: matchups } = await supabase
        .from('matchups')
        .select('id, away_team, home_team, game_time, season, week')
        .in('id', matchupIds)

      matchupDetails = matchups?.reduce((acc, matchup) => {
        acc[matchup.id] = matchup
        return acc
      }, {}) || {}
    }

    return NextResponse.json({ 
      pickHistory: pickHistorySeason?.[0] || {},
      matchupDetails,
      success: true 
    })

  } catch (error) {
    console.error('Error in pick history by season API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
