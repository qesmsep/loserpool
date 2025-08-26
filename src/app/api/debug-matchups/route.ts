import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season')
    
    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('matchups')
      .select('*')
      .order('game_time', { ascending: true })

    if (season) {
      query = query.eq('season', season)
    }

    const { data: matchups, error } = await query

    if (error) {
      console.error('Error fetching matchups:', error)
      return NextResponse.json(
        { error: 'Failed to fetch matchups' },
        { status: 500 }
      )
    }

    // Group by season and count
    const seasonCounts = matchups?.reduce((acc: any, matchup) => {
      const season = matchup.season
      acc[season] = (acc[season] || 0) + 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      success: true,
      total_matchups: matchups?.length || 0,
      season_counts: seasonCounts,
      matchups: matchups || []
    })

  } catch (error) {
    console.error('Error in debug matchups API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
