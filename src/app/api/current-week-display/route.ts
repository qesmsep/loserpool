import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Use the new season detection system
    const { getUserDefaultWeek, getUserSeasonFilter } = await import('@/lib/season-detection')
    const userDefaultWeek = await getUserDefaultWeek(userId)
    const userSeasonFilter = await getUserSeasonFilter(userId)

    // Get current week from global settings for reference
    const { data: currentWeekSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_week')
      .single()

    const globalCurrentWeek = currentWeekSetting ? parseInt(currentWeekSetting.value) : 1

    // Format the week display for the dashboard based on user's season filter
    let weekDisplay: string
    if (userSeasonFilter.startsWith('PRE')) {
      const week = userSeasonFilter.replace('PRE', '')
      weekDisplay = `Pre Season : Week ${week}`
    } else if (userSeasonFilter.startsWith('REG')) {
      const week = userSeasonFilter.replace('REG', '')
      weekDisplay = `Regular Season : Week ${week}`
    } else if (userSeasonFilter.startsWith('POST')) {
      const week = userSeasonFilter.replace('POST', '')
      weekDisplay = `Post Season : Week ${week}`
    } else {
      weekDisplay = `Regular Season : Week 1` // fallback
    }

    return NextResponse.json({
      success: true,
      user_default_week: userDefaultWeek,
      global_current_week: globalCurrentWeek,
      week_display: weekDisplay, // This is what the dashboard expects
      current_week: userSeasonFilter.replace('PRE', '').replace('REG', ''), // Extract week number from userSeasonFilter
      season_info: {
        currentSeason: userSeasonFilter.startsWith('PRE') ? 'Preseason' : 'Regular Season',
        currentWeek: userSeasonFilter.replace('PRE', '').replace('REG', ''),
        seasonDisplay: userSeasonFilter,
        isPreseason: userSeasonFilter.startsWith('PRE'),
        isRegularSeason: userSeasonFilter.startsWith('REG')
      },
      userId
    })

  } catch (error) {
    console.error('Error in current week display API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
