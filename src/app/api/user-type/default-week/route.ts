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
    
    const { data: user } = await supabase
      .from('users')
      .select('user_type, is_admin, default_week')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // If user has a default_week set, use it
    if (user.default_week !== null && user.default_week !== undefined) {
      return NextResponse.json({
        success: true,
        defaultWeek: user.default_week,
        userId
      })
    }

    // Check if user is a tester
    const isTester = user.is_admin || user.user_type === 'tester'
    
    // Get current week from global settings
    const { data: currentWeekSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_week')
      .single()
    
    const currentWeek = currentWeekSetting ? parseInt(currentWeekSetting.value) : 1
    
    let defaultWeek: number
    if (isTester) {
      // Check if we're past the preseason cutoff date (8/26/25)
      const preseasonCutoff = new Date('2025-08-26')
      const now = new Date()
      
      if (now >= preseasonCutoff) {
        // After 8/26/25, testers see current week like everyone else
        defaultWeek = currentWeek
      } else {
        // Before 8/26/25, testers see preseason week 3
        defaultWeek = 3
      }
    } else {
      // Non-testers always see the current week of regular season
      defaultWeek = currentWeek
    }

    return NextResponse.json({
      success: true,
      defaultWeek,
      userId
    })

  } catch (error) {
    console.error('Error getting user default week:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
