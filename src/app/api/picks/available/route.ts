import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

// Type for pick data with dynamic week columns
type PickData = {
  pick_name: string
  status: string
  [key: string]: string | null // Allow dynamic week column properties
}

export async function GET() {
  try {
    // Verify user is authenticated
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()

    // Get current week
    const { data: settings } = await supabase
      .from('global_settings')
      .select('key, value')
      .in('key', ['current_week'])

    const weekSetting = settings?.find(s => s.key === 'current_week')
    const currentWeek = weekSetting ? parseInt(weekSetting.value) : 1

    // Get all picks that have a pick_name (both allocated and unallocated)
    // Get current week column - determine the correct prefix based on current week
    let weekColumn: string
    if (currentWeek <= 3) {
      weekColumn = `pre${currentWeek}_team_matchup_id`
    } else if (currentWeek <= 20) {
      weekColumn = `reg${currentWeek - 3}_team_matchup_id`
    } else {
      weekColumn = `post${currentWeek - 20}_team_matchup_id`
    }
    
    const { data: allPicksData } = await supabase
      .from('picks')
      .select(`
        pick_name,
        ${weekColumn},
        status
      `)
      .eq('user_id', user.id)
      .not('pick_name', 'is', null)
      .neq('status', 'eliminated') as { data: PickData[] | null }

    // Get all matchups for the current week to map team_matchup_id to team names
    const { data: matchupsData } = await supabase
      .from('matchups')
      .select('id, away_team, home_team')
      .eq('week', currentWeek)

    // Create a mapping of team_matchup_id to team name
    const teamMatchupMapping: { [key: string]: string } = {}
    matchupsData?.forEach(matchup => {
      const awayTeamMatchupId = `${matchup.id}_${matchup.away_team}`
      const homeTeamMatchupId = `${matchup.id}_${matchup.home_team}`
      teamMatchupMapping[awayTeamMatchupId] = matchup.away_team
      teamMatchupMapping[homeTeamMatchupId] = matchup.home_team
    })

    // Convert to the format expected by the popup
    const availablePicks = allPicksData?.map((pick: PickData) => {
      const isAllocated = !!pick[weekColumn]
      const allocatedTeam = isAllocated ? teamMatchupMapping[pick[weekColumn] as string] : null
      
      return {
        id: pick.pick_name,
        name: pick.pick_name,
        description: null,
        isAllocated,
        allocatedTeam,
        status: pick.status,
        matchupInfo: null
      }
    }) || []

    return NextResponse.json({ 
      availablePicks,
      success: true 
    })

  } catch (error) {
    console.error('Error in available picks API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
