import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchDraftKingsOdds, saveOddsToDatabase, lockOddsForWeek, processAutoRandomPicks } from '@/lib/odds'
import { DateTime } from 'luxon'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // For Vercel cron jobs, we can verify it's a legitimate request by checking the user agent
    // Vercel cron jobs have a specific user agent
    const userAgent = request.headers.get('user-agent') || ''
    const isVercelCron = userAgent.includes('Vercel') || userAgent.includes('vercel')
    
    // Additional security: check if we're in production and require Vercel cron
    if (process.env.NODE_ENV === 'production' && !isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get current week and season start settings
    const { data: settings } = await supabase
      .from('global_settings')
      .select('key, value')
      .in('key', ['current_week', 'season_start', 'auto_random_picks'])
    
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }
    
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)
    
    const currentWeek = parseInt(settingsMap.current_week || '1')
    const seasonStart = settingsMap.season_start
    const autoRandomPicksEnabled = settingsMap.auto_random_picks === 'true'
    
    if (!autoRandomPicksEnabled) {
      return NextResponse.json({ 
        success: true, 
        message: 'Auto random picks is disabled' 
      })
    }
    
    // Check if it's time to process this week
    const now = DateTime.now()
    const weekStartTime = DateTime.fromISO(seasonStart)
    const weekKickoffTime = weekStartTime.plus({ weeks: currentWeek - 1 })
    
    // Allow processing within 30 minutes before or after kickoff
    const timeWindow = 30 // minutes
    const isWithinTimeWindow = Math.abs(now.diff(weekKickoffTime, 'minutes').minutes) <= timeWindow
    
    if (!isWithinTimeWindow) {
      return NextResponse.json({ 
        success: true, 
        message: `Not within time window for Week ${currentWeek}. Kickoff: ${weekKickoffTime.toISO()}, Current: ${now.toISO()}` 
      })
    }
    
    // Check if odds are already locked for this week
    const { data: existingOdds } = await supabase
      .from('team_odds')
      .select('is_locked')
      .eq('week', currentWeek)
      .eq('is_locked', true)
      .limit(1)
    
    if (existingOdds && existingOdds.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: `Odds already locked for Week ${currentWeek}` 
      })
    }
    
    console.log(`Processing auto random picks for Week ${currentWeek}`)
    
    // Fetch odds from DraftKings
    const odds = await fetchDraftKingsOdds(currentWeek)
    
    if (odds.length === 0) {
      return NextResponse.json({ 
        error: 'No odds data available from DraftKings' 
      }, { status: 400 })
    }
    
    // Save odds to database
    await saveOddsToDatabase(odds, currentWeek)
    
    // Lock odds immediately
    await lockOddsForWeek(currentWeek)
    
    // Process auto random picks
    await processAutoRandomPicks(currentWeek)
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed auto random picks for Week ${currentWeek}. Fetched ${odds.length} odds and assigned random picks.` 
    })
    
  } catch (error) {
    console.error('Error in auto random picks cron job:', error)
    return NextResponse.json(
      { error: 'Failed to process auto random picks' }, 
      { status: 500 }
    )
  }
}
