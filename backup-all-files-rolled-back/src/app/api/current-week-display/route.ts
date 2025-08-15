import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current week and preseason start date from global settings
    const { data: settings, error } = await supabase
      .from('global_settings')
      .select('key, value')
      .in('key', ['current_week', 'preseason_start_date'])

    if (error) {
      console.error('Error fetching global settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    const currentWeek = settings?.find(s => s.key === 'current_week')?.value || '1'
    const preseasonStartDate = settings?.find(s => s.key === 'preseason_start_date')?.value || '2025-08-07'

    // Convert current week to display format
    const weekNum = parseInt(currentWeek)
    let weekDisplay: string

    if (weekNum <= 3) {
      weekDisplay = `Preseason Week ${weekNum}`
    } else if (weekNum <= 21) {
      weekDisplay = `Week ${weekNum - 3}` // REG1 = Week 1, etc.
    } else {
      weekDisplay = `Postseason Week ${weekNum - 21}` // POST1 = Postseason Week 1, etc.
    }

    return NextResponse.json({
      success: true,
      current_week: weekNum,
      week_display: weekDisplay,
      preseason_start_date: preseasonStartDate,
      is_preseason: weekNum <= 3,
      is_regular_season: weekNum > 3 && weekNum <= 21,
      is_postseason: weekNum > 21
    })

  } catch (error) {
    console.error('Error in current week display API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
