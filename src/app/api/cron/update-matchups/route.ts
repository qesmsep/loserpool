import { NextRequest, NextResponse } from 'next/server'
import { MatchupUpdateServicePreserveUuid } from '@/lib/matchup-update-service-preserve-uuid'

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a legitimate cron job
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN

    if (!expectedToken) {
      console.error('CRON_SECRET_TOKEN not configured')
      return NextResponse.json({ error: 'Cron token not configured' }, { status: 500 })
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      console.error('Invalid cron authentication')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if automated updates are enabled
    const supabase = await import('@/lib/supabase-server').then(m => m.createServerSupabaseClient())
    const { data: settings } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'automated_updates_enabled')
      .single()

    if (!settings || settings.value !== 'true') {
      console.log('Automated updates are disabled')
      return NextResponse.json({ message: 'Automated updates are disabled' })
    }

    // Check if it's the right time (6am or 6pm CST)
    const now = new Date()
    const cstHour = now.getUTCHours() - 6 // Convert to CST (UTC-6)
    const adjustedHour = cstHour < 0 ? cstHour + 24 : cstHour
    
    // TEMPORARY: Allow testing at any time
    console.log(`TESTING MODE: Current CST hour: ${adjustedHour} - allowing comprehensive update of ALL 25 WEEKS`)
    /*
    if (adjustedHour !== 6 && adjustedHour !== 18) {
      console.log(`Not update time (current CST hour: ${adjustedHour}) - skipping update`)
      return NextResponse.json({ message: 'Not update time, skipping' })
    }
    */

    console.log('Starting automated matchup update with UUID preservation...')
    
    const matchupService = new MatchupUpdateServicePreserveUuid()
    const result = await matchupService.updateMatchupsPreserveUuid()

    // Send error notification if there were errors
    if (result.errors.length > 0) {
      const errorMessage = `Automated update completed with ${result.errors.length} errors:\n${result.errors.join('\n')}`
      console.error(errorMessage)
      // TODO: Implement error notification if needed
    }

    return NextResponse.json({ 
      message: 'Matchup update with UUID preservation completed successfully',
      processed: result.processed,
      updated: result.updated,
      created: result.created,
      errors: result.errors.length,
      preservedUuids: result.preservedUuids.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in automated matchup update:', error)
    
    // Send error notification
    try {
      const errorMessage = `Fatal error in automated matchup update: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMessage)
      // TODO: Implement error notification if needed
    } catch (emailError) {
      console.error('Failed to send error notification:', emailError)
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing
export async function GET() {
  try {
    console.log('Manual matchup update with UUID preservation started')
    
    const matchupService = new MatchupUpdateServicePreserveUuid()
    const result = await matchupService.updateMatchupsPreserveUuid()

    return NextResponse.json({ 
      success: true,
      processed: result.processed,
      updated: result.updated,
      created: result.created,
      errors: result.errors,
      preservedUuids: result.preservedUuids.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in manual matchup update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
