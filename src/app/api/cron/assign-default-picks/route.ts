import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify cron secret token
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting automatic default pick assignment check...')
    
    const supabase = createServiceRoleClient()
    
    // Get current week from global settings
    const { data: weekSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_week')
      .single()

    const currentWeek = parseInt(weekSetting?.value || '1')
    console.log(`Current week: ${currentWeek}`)

    // Check if default picks have already been assigned for this week
    const { data: existingDefaultPicks, error: existingError } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', `default_picks_assigned_week_${currentWeek}`)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing default picks:', existingError)
      return NextResponse.json({ success: false, error: existingError.message }, { status: 500 })
    }

    if (existingDefaultPicks?.value === 'true') {
      console.log(`Default picks already assigned for week ${currentWeek}`)
      return NextResponse.json({
        success: true,
        message: `Default picks already assigned for week ${currentWeek}`,
        default_picks_assigned: true,
        current_week: currentWeek
      })
    }

    // Get all matchups for current week to find Thursday night game
    const { data: matchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('id, away_team, home_team, game_time, status, away_spread, home_spread')
      .eq('week', currentWeek)
      .eq('status', 'scheduled')
      .order('game_time', { ascending: true })

    if (matchupsError) {
      console.error('Error fetching matchups:', matchupsError)
      return NextResponse.json({ success: false, error: matchupsError.message }, { status: 500 })
    }

    if (!matchups || matchups.length === 0) {
      console.log(`No scheduled matchups found for week ${currentWeek}`)
      return NextResponse.json({ 
        success: true, 
        message: `No scheduled matchups found for week ${currentWeek}`,
        default_picks_assigned: false 
      })
    }

    // Find Thursday night game (first game of the week)
    const thursdayGame = matchups[0]
    const now = new Date()
    const thursdayKickoff = new Date(thursdayGame.game_time)
    
    // Check if we're at or just past Thursday night kickoff (within 5 minutes)
    const timeDiff = now.getTime() - thursdayKickoff.getTime()
    const fiveMinutes = 5 * 60 * 1000 // 5 minutes in milliseconds
    
    console.log(`Thursday kickoff check: now=${now.toISOString()}, kickoff=${thursdayKickoff.toISOString()}, time_diff_minutes=${Math.round(timeDiff / (60 * 1000))}`)

    // Only run if we're within 5 minutes after kickoff (not before)
    if (timeDiff < 0 || timeDiff > fiveMinutes) {
      console.log('Not at Thursday night kickoff time. No default picks to assign.')
      return NextResponse.json({
        success: true,
        message: 'Not at Thursday night kickoff time',
        default_picks_assigned: false,
        thursday_kickoff: thursdayKickoff.toISOString(),
        current_time: now.toISOString(),
        time_diff_minutes: Math.round(timeDiff / (60 * 1000))
      })
    }

    // We're at Thursday night kickoff - assign default picks based on current odds
    console.log('Thursday night kickoff detected. Assigning default picks to NULL week cells...')

    // Helper: map numeric week to wide picks table column name
    const getWeekColumnFromWeek = (week?: number | null): string | null => {
      if (!week || week < 1) return null
      if (week <= 3) return `pre${week}_team_matchup_id`
      if (week <= 20) return `reg${week - 3}_team_matchup_id`
      const postIdx = week - 20
      if (postIdx >= 1 && postIdx <= 4) return `post${postIdx}_team_matchup_id`
      return null
    }

    const weekColumnName = getWeekColumnFromWeek(currentWeek)
    if (!weekColumnName) {
      return NextResponse.json({ success: false, error: 'Could not determine week column' }, { status: 500 })
    }

    // Get the largest spread matchup and its favorite
    const { data: largestSpreadRows, error: largestErr } = await supabase
      .rpc('get_largest_spread_matchup', { target_week: currentWeek })

    if (largestErr || !largestSpreadRows || largestSpreadRows.length === 0) {
      console.error('Error determining largest spread matchup:', largestErr)
      return NextResponse.json({ success: false, error: 'No largest spread matchup found' }, { status: 500 })
    }

    const largest = largestSpreadRows[0]
    const favoriteTeam: string = largest.favored_team
    const matchupId: string = largest.matchup_id

    // Compute team_matchup_id for the favorite team
    const { data: teamIdResult, error: teamIdError } = await supabase
      .rpc('get_team_matchup_id', { p_matchup_id: matchupId, p_team_name: favoriteTeam })

    if (teamIdError || !teamIdResult) {
      console.error('Error generating team_matchup_id for favorite:', teamIdError)
      return NextResponse.json({ success: false, error: 'Failed to compute team_matchup_id' }, { status: 500 })
    }

    const favoriteTeamMatchupId: string = teamIdResult

    // Update all picks rows that have NULL for this week's column to the favorite team_matchup_id
    const { data: updatedRows, error: updateError } = await supabase
      .from('picks')
      .update({ [weekColumnName]: favoriteTeamMatchupId })
      .is(weekColumnName, null)
      .in('status', ['active', 'pending', 'safe'])
      .select('id')

    if (updateError) {
      console.error('Error updating picks with default team:', updateError)
      return NextResponse.json({ success: false, error: 'Failed to assign default picks' }, { status: 500 })
    }

    // Mark that default picks have been assigned for this week
    const { error: markError } = await supabase
      .from('global_settings')
      .upsert({
        key: `default_picks_assigned_week_${currentWeek}`,
        value: 'true',
        description: `Default picks assigned for week ${currentWeek} at Thursday night kickoff`
      })

    if (markError) {
      console.error('Error marking default picks as assigned:', markError)
    }

    // Already computed largest spread matchup above

    const executionTime = Date.now() - startTime
    const assignedCount = Array.isArray(updatedRows) ? updatedRows.length : 0
    console.log(`Default pick assignment completed in ${executionTime}ms: ${assignedCount} picks assigned`)

    return NextResponse.json({
      success: true,
      message: `Default picks assigned successfully at Thursday night kickoff`,
      picks_assigned: assignedCount,
      current_week: currentWeek,
      largest_spread_matchup: largest,
      execution_time_ms: executionTime,
      thursday_kickoff: thursdayKickoff.toISOString(),
      assignment_time: now.toISOString()
    })

  } catch (error) {
    console.error('Error in automatic default pick assignment:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
