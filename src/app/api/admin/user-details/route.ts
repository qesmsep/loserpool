import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    // Check admin authentication
    const adminUser = await requireAdmin()
    console.log('Admin check passed:', adminUser?.email)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

    // Create service role client to bypass RLS
    const supabaseAdmin = createServiceRoleClient()

    // Get current week
    const { data: settings } = await supabaseAdmin
      .from('global_settings')
      .select('key, value')
      .in('key', ['current_week'])

    const weekSetting = settings?.find(s => s.key === 'current_week')
    const currentWeek = weekSetting ? parseInt(weekSetting.value) : 1

    // Get user details
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }

    // Get current week column
    let weekColumn: string
    if (currentWeek <= 3) {
      weekColumn = `pre${currentWeek}_team_matchup_id`
    } else if (currentWeek <= 20) {
      weekColumn = `reg${currentWeek - 3}_team_matchup_id`
    } else {
      weekColumn = `post${currentWeek - 20}_team_matchup_id`
    }
    
    // Fix: For regular season weeks 1-17, we need to use reg1_team_matchup_id through reg17_team_matchup_id
    // The current calculation is wrong for weeks 1-3
    if (currentWeek >= 1 && currentWeek <= 17) {
      weekColumn = `reg${currentWeek}_team_matchup_id`
    }
    
    console.log('🔍 DEBUG: Current week:', currentWeek, 'Week column:', weekColumn)

    // Get user's picks for current week (both allocated and unallocated)
    const { data: picks, error: picksError } = await supabaseAdmin
      .from('picks')
      .select('*')
      .eq('user_id', userId)
      .not('pick_name', 'is', null)

    if (picksError) {
      console.error('Error fetching picks:', picksError)
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
    }

    // Get all matchups for the current week to map team_matchup_id to team names
    const { data: matchupsData } = await supabaseAdmin
      .from('matchups')
      .select('id, away_team, home_team, away_score, home_score, game_time, status')
      .eq('week', currentWeek)
    


    // Create a mapping of team_matchup_id to team name and matchup info
    const matchupMapping: { [key: string]: {
      team: string
      opponent: string
      matchup: {
        id: string
        away_team: string
        home_team: string
        away_score: number | null
        home_score: number | null
        game_time: string
        status: string
      }
      isHome: boolean
    } } = {}
    matchupsData?.forEach(matchup => {
      const awayTeamMatchupId = `${matchup.id}_${matchup.away_team}`
      const homeTeamMatchupId = `${matchup.id}_${matchup.home_team}`
      matchupMapping[awayTeamMatchupId] = {
        team: matchup.away_team,
        opponent: matchup.home_team,
        matchup: matchup,
        isHome: false
      }
      matchupMapping[homeTeamMatchupId] = {
        team: matchup.home_team,
        opponent: matchup.away_team,
        matchup: matchup,
        isHome: true
      }
    })
    


    // Map picks to include team and matchup information
    const picksWithDetails = picks?.map(pick => {
      const teamMatchupId = (pick as Record<string, unknown>)[weekColumn]
      const matchupInfo = teamMatchupId ? matchupMapping[teamMatchupId as string] : null
      const hasTeamSelected = teamMatchupId !== null && teamMatchupId !== undefined
      

      
      return {
        id: pick.id,
        pick_name: pick.pick_name,
        picks_count: pick.picks_count,
        status: pick.status,
        team_picked: hasTeamSelected ? (matchupInfo?.team || 'Unknown') : 'Pending',
        opponent: hasTeamSelected ? (matchupInfo?.opponent || 'Unknown') : 'Pending',
        is_home: hasTeamSelected ? (matchupInfo?.isHome || false) : false,
        game_time: hasTeamSelected ? matchupInfo?.matchup?.game_time : null,
        game_status: hasTeamSelected ? matchupInfo?.matchup?.status : null,
        away_score: hasTeamSelected ? matchupInfo?.matchup?.away_score : null,
        home_score: hasTeamSelected ? matchupInfo?.matchup?.home_score : null,
        team_matchup_id: teamMatchupId,
        has_team_selected: hasTeamSelected
      }
    }) || []

    // Get user's purchase history
    const { data: purchases, error: purchasesError } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError)
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
    }

    // Calculate summary stats
    const totalPurchased = purchases
      ?.filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.picks_count, 0) || 0

    const activePicks = picksWithDetails
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.picks_count, 0)

    const eliminatedPicks = picksWithDetails
      .filter(p => p.status === 'eliminated')
      .reduce((sum, p) => sum + p.picks_count, 0)

    return NextResponse.json({
      user,
      currentWeek,
      picks: picksWithDetails,
      purchases,
      stats: {
        totalPurchased,
        activePicks,
        eliminatedPicks,
        isEliminated: eliminatedPicks > 0 && activePicks === 0 && totalPurchased > 0
      }
    })

  } catch (error) {
    console.error('Admin user details API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
