import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    // Get current week from NFL scraper
    const scraper = new NFLScheduleScraper()
    const currentWeekInfo = await scraper.getCurrentWeekInfo()
    
    console.log('NFL Scraper detected current week:', currentWeekInfo)

    if (!currentWeekInfo || typeof currentWeekInfo.weekNumber !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Invalid current week info from NFL scraper',
        currentWeekInfo
      }, { status: 500 })
    }

    // Update global settings with the detected week
    const { error: updateError } = await supabase
      .from('global_settings')
      .update({ value: currentWeekInfo.weekNumber.toString() })
      .eq('key', 'current_week')

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

    // Verify the update by fetching the new setting
    const { data: updatedSetting } = await supabase
      .from('global_settings')
      .select('*')
      .eq('key', 'current_week')
      .single()

    return NextResponse.json({
      success: true,
      message: 'Current week updated successfully',
      current_week: currentWeekInfo.weekNumber,
      current_week_display: currentWeekInfo.currentWeek,
      season_type: currentWeekInfo.seasonType,
      updated_setting: updatedSetting
    })

  } catch (error) {
    console.error('Error fixing current week:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
