import { NextRequest, NextResponse } from 'next/server'
import { MatchupDataService } from '@/lib/matchup-data-service'

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

    console.log('Starting automated matchup update...')
    
    const matchupService = new MatchupDataService()
    const result = await matchupService.updateAllMatchups()

    // Send error notification if there were errors
    if (result.errors.length > 0) {
      const errorMessage = `Automated update completed with ${result.errors.length} errors:\n${result.errors.join('\n')}`
      await matchupService.sendErrorNotification(errorMessage)
    }

    return NextResponse.json({ 
      message: 'Comprehensive matchup update completed successfully',
      total_games: result.total_games,
      weeks_updated: result.weeks_updated,
      errors: result.errors.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in automated matchup update:', error)
    
    // Send error notification
    try {
      const matchupService = new MatchupDataService()
      const errorMessage = `Fatal error in automated matchup update: ${error instanceof Error ? error.message : 'Unknown error'}`
      await matchupService.sendErrorNotification(errorMessage)
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
    console.log('Manual matchup update started')
    
    const matchupService = new MatchupDataService()
    const result = await matchupService.updateAllMatchups()

    return NextResponse.json({ 
      success: true,
      total_games: result.total_games,
      weeks_updated: result.weeks_updated,
      errors: result.errors,
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
