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

    // Get all matchups for current week to check if deadline has passed
    const { data: matchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('id, away_team, home_team, game_time, status')
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

    // Check if the deadline has passed (first game has started or is in the past)
    const now = new Date()
    const firstGameTime = new Date(matchups[0].game_time)
    const deadlinePassed = now >= firstGameTime

    console.log(`Deadline check: now=${now.toISOString()}, first_game=${firstGameTime.toISOString()}, deadline_passed=${deadlinePassed}`)

    if (!deadlinePassed) {
      console.log('Deadline has not passed yet. No default picks to assign.')
      return NextResponse.json({
        success: true,
        message: 'Deadline has not passed yet',
        default_picks_assigned: false,
        deadline_time: firstGameTime.toISOString(),
        current_time: now.toISOString()
      })
    }

    // Deadline has passed, check if default picks have already been assigned
    const { data: existingDefaultPicks, error: existingError } = await supabase
      .from('picks')
      .select('id')
      .eq('created_at', now.toISOString().split('T')[0]) // Check if any picks were created today
      .limit(1)

    if (existingError) {
      console.error('Error checking existing default picks:', existingError)
    }

    // Call the database function to assign default picks
    console.log('Deadline has passed. Assigning default picks...')
    const { data: result, error: assignError } = await supabase
      .rpc('assign_default_picks', { target_week: currentWeek })

    if (assignError) {
      console.error('Error assigning default picks:', assignError)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to assign default picks: ${assignError.message}` 
      }, { status: 500 })
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
      message: `Default picks assigned successfully`,
      picks_assigned: result,
      current_week: currentWeek,
      largest_spread_matchup: largestSpreadMatchup?.[0] || null,
      execution_time_ms: executionTime,
      deadline_time: firstGameTime.toISOString(),
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
