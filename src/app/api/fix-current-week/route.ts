import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { espnService } from '@/lib/espn-service'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    // Get current week from ESPN API
    const currentYear = new Date().getFullYear()
    const currentWeek = await espnService.getCurrentNFLWeek(currentYear)
    
    console.log('ESPN API detected current week:', currentWeek)

    if (!currentWeek || typeof currentWeek !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Invalid current week info from ESPN API',
        currentWeek
      }, { status: 500 })
    }

    // Update global settings with the detected week
    const { error: updateError } = await supabase
      .from('global_settings')
      .update({ value: currentWeek.toString() })
      .eq('key', 'current_week')

    if (updateError) {
      console.error('Error updating current week:', updateError)
      return NextResponse.json({
        success: false,
        error: `Failed to update current week: ${updateError.message}`
      }, { status: 500 })
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
      current_week: currentWeek,
      current_week_display: `Week ${currentWeek}`,
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
