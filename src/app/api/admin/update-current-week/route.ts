import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServiceRoleClient()
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

    // Get current week from NFL scraper
    const scraper = new NFLScheduleScraper()
    const currentWeekInfo = await scraper.getCurrentWeekInfo()
    
    console.log('NFL Scraper detected current week:', currentWeekInfo)

    // Update global settings with the detected week
    const { error: updateError } = await supabase
      .from('global_settings')
      .upsert({
        key: 'current_week',
        value: currentWeekInfo.weekNumber.toString()
      })

    if (updateError) {
      console.error('Error updating current week:', updateError)
      return NextResponse.json({
        success: false,
        error: `Failed to update current week: ${updateError.message}`
      }, { status: 500 })
    }

    // Also update the season type if needed
    const { error: seasonUpdateError } = await supabase
      .from('global_settings')
      .upsert({
        key: 'current_season_type',
        value: currentWeekInfo.seasonType
      })

    if (seasonUpdateError) {
      console.error('Error updating season type:', seasonUpdateError)
    }

    return NextResponse.json({
      success: true,
      message: 'Current week updated successfully',
      current_week: currentWeekInfo.weekNumber,
      current_week_display: currentWeekInfo.current_week,
      season_type: currentWeekInfo.seasonType
    })

  } catch (error) {
    console.error('Error updating current week:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
