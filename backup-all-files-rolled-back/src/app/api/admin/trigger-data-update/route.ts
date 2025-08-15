import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { MatchupDataService } from '@/lib/matchup-data-service'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { manual = false, admin_id } = body

    // Log the start of the update
    const logId = crypto.randomUUID()
    await supabase
      .from('automated_update_logs')
      .insert({
        id: logId,
        timestamp: new Date().toISOString(),
        status: 'running',
        message: manual ? 'Manual update triggered by admin' : 'Automated update triggered',
        games_found: 0,
        games_updated: 0,
        execution_time_ms: 0
      })

    console.log(`Starting ${manual ? 'manual' : 'automated'} data update...`)

    // Initialize the matchup data service
    const matchupService = new MatchupDataService()
    
    let totalGamesFound = 0
    let totalGamesUpdated = 0
    let updateMessage = ''

    try {
      // Update current week matchups
      console.log('Updating current week matchups...')
      const currentWeekResult = await matchupService.updateCurrentWeekMatchups()
      totalGamesFound += currentWeekResult.gamesFound
      totalGamesUpdated += currentWeekResult.gamesUpdated
      updateMessage += `Current week: ${currentWeekResult.gamesFound} games found, ${currentWeekResult.gamesUpdated} updated. `

      // Update next week matchups
      console.log('Updating next week matchups...')
      const nextWeekResult = await matchupService.updateNextWeekMatchups()
      totalGamesFound += nextWeekResult.gamesFound
      totalGamesUpdated += nextWeekResult.gamesUpdated
      updateMessage += `Next week: ${nextWeekResult.gamesFound} games found, ${nextWeekResult.gamesUpdated} updated.`

      const executionTime = Date.now() - startTime

      // Update the log with success
      await supabase
        .from('automated_update_logs')
        .update({
          status: 'success',
          message: updateMessage,
          games_found: totalGamesFound,
          games_updated: totalGamesUpdated,
          execution_time_ms: executionTime
        })
        .eq('id', logId)

      // Update last run time in global settings
      await supabase
        .from('global_settings')
        .upsert({
          key: 'automated_updates_last_run',
          value: new Date().toISOString()
        })

      console.log(`Update completed successfully in ${executionTime}ms`)
      console.log(`Total games found: ${totalGamesFound}, updated: ${totalGamesUpdated}`)

      return NextResponse.json({
        success: true,
        games_found: totalGamesFound,
        games_updated: totalGamesUpdated,
        execution_time_ms: executionTime,
        message: updateMessage
      })

    } catch (updateError) {
      const executionTime = Date.now() - startTime
      const errorMessage = updateError instanceof Error ? updateError.message : 'Unknown error occurred'

      // Update the log with error
      await supabase
        .from('automated_update_logs')
        .update({
          status: 'error',
          message: `Update failed: ${errorMessage}`,
          games_found: totalGamesFound,
          games_updated: totalGamesUpdated,
          execution_time_ms: executionTime
        })
        .eq('id', logId)

      console.error('Error during data update:', updateError)
      throw updateError
    }

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    console.error('Error in trigger-data-update:', error)
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      execution_time_ms: executionTime
    }, { status: 500 })
  }
}
