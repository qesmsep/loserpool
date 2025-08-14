import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const matchupId = searchParams.get('matchupId')
    const currentWeek = searchParams.get('currentWeek')

    if (!matchupId || !currentWeek) {
      return NextResponse.json(
        { error: 'Missing required parameters: matchupId, currentWeek' },
        { status: 400 }
      )
    }

    // Get current week column
    let weekColumn: string
    const week = parseInt(currentWeek)
    if (week <= 3) {
      weekColumn = `pre${week}_team_matchup_id`
    } else if (week <= 20) {
      weekColumn = `reg${week - 3}_team_matchup_id`
    } else {
      weekColumn = `post${week - 20}_team_matchup_id`
    }

    // Get picks for this user that have a team_matchup_id for the current week
    const { data: picks, error: picksError } = await supabase
      .from('picks')
      .select('*')
      .eq('user_id', user.id)
      .not(weekColumn, 'is', null)

    if (picksError) {
      console.error('Error fetching picks:', picksError)
      return NextResponse.json(
        { error: 'Failed to fetch picks' },
        { status: 500 }
      )
    }

    // Get matchup info
    const { data: matchup, error: matchupError } = await supabase
      .from('matchups')
      .select('away_team, home_team')
      .eq('id', matchupId)
      .single()

    if (matchupError) {
      console.error('Error fetching matchup:', matchupError)
      return NextResponse.json(
        { error: 'Failed to fetch matchup' },
        { status: 500 }
      )
    }

    // Map picks to team names
    const picksWithTeams = picks?.map(pick => {
      const teamMatchupId = (pick as any)[weekColumn]
      
      // Determine which team this pick belongs to
      let team_picked = 'Unknown'
      
      if (teamMatchupId) {
        // For now, default to away team - we'll improve this later
        team_picked = matchup.away_team
      }

      return {
        id: pick.id,
        pick_name: pick.pick_name,
        picks_count: pick.picks_count,
        status: pick.status,
        team_picked,
        team_matchup_id: teamMatchupId
      }
    }) || []

    return NextResponse.json({
      success: true,
      picks: picksWithTeams
    })

  } catch (error) {
    console.error('Error in matchup picks API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
