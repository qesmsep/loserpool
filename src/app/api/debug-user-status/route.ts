import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getUserDefaultWeek } from '@/lib/season-detection'

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
    
    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get current week from global settings
    const { data: currentWeekSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_week')
      .single()

    // Get user's default week
    const userDefaultWeek = await getUserDefaultWeek(userId)

    // Check if user is a tester
    const isTester = user.is_admin || user.user_type === 'tester'

    // Get some matchups to see what's available
    const { data: week1Matchups } = await supabase
      .from('matchups')
      .select('week, season, away_team, home_team')
      .eq('week', 1)
      .limit(3)

    const { data: week3Matchups } = await supabase
      .from('matchups')
      .select('week, season, away_team, home_team')
      .eq('week', 3)
      .limit(3)

    return NextResponse.json({
      success: true,
      debug: {
        user: {
          id: user.id,
          email: user.email,
          user_type: user.user_type,
          is_admin: user.is_admin,
          default_week: user.default_week
        },
        system: {
          current_week: currentWeekSetting ? parseInt(currentWeekSetting.value) : 1,
          user_default_week: userDefaultWeek,
          is_tester: isTester,
          preseason_cutoff: '2025-08-26',
          current_date: new Date().toISOString()
        },
        available_matchups: {
          week_1: week1Matchups || [],
          week_3: week3Matchups || []
        }
      }
    })

  } catch (error) {
    console.error('❌ ERROR: Debug user status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
