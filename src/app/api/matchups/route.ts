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

    return NextResponse.json({
      success: true,
      matchups: matchups || [],
      seasonFilter,
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
