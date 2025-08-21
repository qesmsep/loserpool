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
    const { getUserDefaultWeek, getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const userDefaultWeek = await getUserDefaultWeek(userId)
    const seasonInfo = await getCurrentSeasonInfo()

    // Get current week from global settings for reference
    const { data: currentWeekSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_week')
      .single()

    const globalCurrentWeek = currentWeekSetting ? parseInt(currentWeekSetting.value) : 1

    return NextResponse.json({
      success: true,
      user_default_week: userDefaultWeek,
      global_current_week: globalCurrentWeek,
      season_info: {
        currentSeason: seasonInfo.currentSeason,
        currentWeek: seasonInfo.currentWeek,
        seasonDisplay: seasonInfo.seasonDisplay,
        isPreseason: seasonInfo.isPreseason,
        isRegularSeason: seasonInfo.isRegularSeason
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
