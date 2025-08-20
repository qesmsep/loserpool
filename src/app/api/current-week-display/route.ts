import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Current week display API - Auth check:', { user: user?.id, authError })
    
    if (authError || !user) {
      // If no user, return the global current week
      const { data: settings, error } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', ['current_week'])

      if (error) {
        console.error('Error fetching global settings:', error)
        return NextResponse.json(
          { error: 'Failed to fetch settings' },
          { status: 500 }
        )
      }

      const currentWeek = settings?.find(s => s.key === 'current_week')?.value || '1'
      const weekNum = parseInt(currentWeek)
      
      const weekDisplay = weekNum <= 0 ? 
        `Preseason Week ${Math.abs(weekNum) + 1}` : 
        `Week ${weekNum}`

      return NextResponse.json({
        success: true,
        current_week: weekNum,
        week_display: weekDisplay,
        is_preseason: weekNum <= 0,
        is_regular_season: weekNum > 0
      })
    }

    // Get user's default week based on their type
    const { data: userData } = await supabase
      .from('users')
      .select('user_type, is_admin, default_week')
      .eq('id', user.id)
      .single()

    console.log('Current week display API - User ID:', user.id)
    console.log('Current week display API - User data:', userData)

    // If user has a default_week set, use it
    let userDefaultWeek: number
    if (userData?.default_week) {
      userDefaultWeek = userData.default_week
    } else {
      // Otherwise, determine based on user type
      userDefaultWeek = 1 // Regular season week 1
      if (userData?.is_admin || userData?.user_type === 'tester') {
        userDefaultWeek = 3 // Preseason week 3 for testers
      }
    }

    console.log('Current week display API - Calculated default week:', userDefaultWeek)
    
    // Convert user's default week to display format
    let weekDisplay: string
    let isPreseason: boolean
    let isRegularSeason: boolean

    if (userDefaultWeek <= 0) {
      // Preseason weeks
      weekDisplay = `Pre Season : Week ${Math.abs(userDefaultWeek) + 1}`
      isPreseason = true
      isRegularSeason = false
    } else {
      // Regular season weeks
      weekDisplay = `Regular Season : Week ${userDefaultWeek}`
      isPreseason = false
      isRegularSeason = true
    }

    return NextResponse.json({
      success: true,
      current_week: userDefaultWeek,
      week_display: weekDisplay,
      is_preseason: isPreseason,
      is_regular_season: isRegularSeason,
      user_default_week: userDefaultWeek
    })

  } catch (error) {
    console.error('Error in current week display API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
