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

    // Use the new season detection system instead of default_week
    const { getUserSeasonFilter } = await import('@/lib/season-detection')
    const seasonFilter = await getUserSeasonFilter(userId)

    // Get matchups for the user's season filter
    const { data: matchups, error } = await supabase
      .from('matchups')
      .select('*')
      .eq('season', seasonFilter)
      .order('game_time', { ascending: true })

    if (error) {
      console.error('Error fetching matchups:', error)
      return NextResponse.json(
        { error: 'Failed to fetch matchups' },
        { status: 500 }
      )
    }

    // Format the week display for the dashboard based on user's season filter
    let weekDisplay: string
    if (seasonFilter.startsWith('PRE')) {
      const week = seasonFilter.replace('PRE', '')
      weekDisplay = `Pre Season : Week ${week}`
    } else if (seasonFilter.startsWith('REG')) {
      const week = seasonFilter.replace('REG', '')
      weekDisplay = `Regular Season : Week ${week}`
    } else if (seasonFilter.startsWith('POST')) {
      const week = seasonFilter.replace('POST', '')
      weekDisplay = `Post Season : Week ${week}`
    } else {
      weekDisplay = `Regular Season : Week 1` // fallback
    }

    return NextResponse.json({
      success: true,
      matchups: matchups || [],
      seasonFilter,
      week_display: weekDisplay, // This is what the dashboard expects
      userId
    })

  } catch (error) {
    console.error('Error in matchups API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
