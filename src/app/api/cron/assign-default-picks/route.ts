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
    console.log('Thursday night kickoff detected. Assigning default picks...')
    
    // Call the database function to assign default picks
    const { data: result, error: assignError } = await supabase
      .rpc('assign_default_picks', { target_week: currentWeek })

    if (assignError) {
      console.error('Error assigning default picks:', assignError)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to assign default picks: ${assignError.message}` 
      }, { status: 500 })
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

    // Get details about what was assigned
    const { data: largestSpreadMatchup, error: matchupError } = await supabase
      .rpc('get_largest_spread_matchup', { target_week: currentWeek })

    if (matchupError) {
      console.error('Error getting largest spread matchup:', matchupError)
    }

    const executionTime = Date.now() - startTime
    console.log(`Default pick assignment completed in ${executionTime}ms: ${result} picks assigned`)

    return NextResponse.json({
      success: true,
      message: `Default picks assigned successfully at Thursday night kickoff`,
      picks_assigned: result,
      current_week: currentWeek,
      largest_spread_matchup: largestSpreadMatchup?.[0] || null,
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
