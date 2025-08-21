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

    // Add debugging logs
    console.log('🔍 DEBUG: getUserDefaultWeek called for user:', userId)
    console.log('🔍 DEBUG: User data:', {
      user_type: user.user_type,
      is_admin: user.is_admin,
      default_week: user.default_week
    })

    // If user has a default_week set, use it
    if (user.default_week !== null && user.default_week !== undefined) {
      console.log('🔍 DEBUG: Using existing default_week:', user.default_week)
      return NextResponse.json({
        success: true,
        defaultWeek: user.default_week,
        userId,
        debug: {
          reason: 'existing_default_week',
          user_type: user.user_type,
          is_admin: user.is_admin,
          default_week: user.default_week
        }
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
    
    console.log('🔍 DEBUG: Current week from global settings:', currentWeek)
    console.log('🔍 DEBUG: Is tester?', isTester)
    
    let defaultWeek: number
    if (isTester) {
      // Check if we're past the preseason cutoff date (8/26/25)
      const preseasonCutoff = new Date('2025-08-26')
      const now = new Date()
      
      console.log('🔍 DEBUG: Preseason cutoff date:', preseasonCutoff)
      console.log('🔍 DEBUG: Current date:', now)
      console.log('🔍 DEBUG: Past cutoff?', now >= preseasonCutoff)
      
      if (now >= preseasonCutoff) {
        // After 8/26/25, testers see current week like everyone else
        defaultWeek = currentWeek
        console.log('🔍 DEBUG: Tester after cutoff - using current week:', defaultWeek)
      } else {
        // Before 8/26/25, testers see preseason week 3
        defaultWeek = 3
        console.log('🔍 DEBUG: Tester before cutoff - using preseason week 3:', defaultWeek)
      }
    } else {
      // Non-testers always see the current week of regular season
      defaultWeek = currentWeek
      console.log('🔍 DEBUG: Non-tester - using current week:', defaultWeek)
    }

    console.log('🔍 DEBUG: Final default week calculated:', defaultWeek)

    return NextResponse.json({
      success: true,
      defaultWeek,
      userId,
      debug: {
        reason: 'calculated',
        user_type: user.user_type,
        is_admin: user.is_admin,
        is_tester: isTester,
        current_week: currentWeek,
        calculated_week: defaultWeek
      }
    })

  } catch (error) {
    console.error('❌ ERROR: Error getting user default week:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
