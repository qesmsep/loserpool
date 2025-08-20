import { NextRequest, NextResponse } from 'next/server'
import { MatchupUpdateService } from '@/lib/matchup-update-service'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week')
    
    const updateService = new MatchupUpdateService()
    
    if (week === 'next') {
      // Get next week matchups
      const matchups = await updateService.getNextWeekMatchups()
      const weekDisplay = await updateService.getNextWeekDisplay()
      
      return NextResponse.json({
        success: true,
        week_display: weekDisplay,
        matchups: matchups,
        count: matchups.length
      })
    } else {
      // Get current week matchups based on user type
      const supabase = await createServerSupabaseClient()
      
      // Get the authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      console.log('Matchups API - Auth check:', { user: user?.id, authError })
      
      let targetWeek: number
      let weekDisplay: string
      
      if (authError || !user) {
        // If no user, use global current week
        const matchups = await updateService.getCurrentWeekMatchups()
        const globalWeekDisplay = await updateService.getCurrentWeekDisplay()
        
        return NextResponse.json({
          success: true,
          week_display: globalWeekDisplay,
          matchups: matchups,
          count: matchups.length
        })
      } else {
        // Get user's default week based on their type
        const { data: userData } = await supabase
          .from('users')
          .select('user_type, is_admin, default_week')
          .eq('id', user.id)
          .single()

        console.log('Matchups API - User ID:', user.id)
        console.log('Matchups API - User data:', userData)

        // If user has a default_week set, use it
        if (userData?.default_week) {
          targetWeek = userData.default_week
        } else {
          // Otherwise, determine based on user type
          targetWeek = 1 // Regular season week 1
          if (userData?.is_admin || userData?.user_type === 'tester') {
            targetWeek = 3 // Preseason week 3 for testers
          }
        }

        console.log('Matchups API - Calculated target week:', targetWeek)
        
        // Determine the season type based on user type and week
        const isTester = userData?.is_admin || userData?.user_type === 'tester'
        let seasonFilter = ''
        
        if (isTester) {
          // Testers see preseason games
          if (targetWeek === 0) seasonFilter = 'PRE0'
          else if (targetWeek === 1) seasonFilter = 'PRE1'
          else if (targetWeek === 2) seasonFilter = 'PRE2'
          else if (targetWeek === 3) seasonFilter = 'PRE3'
          else seasonFilter = 'REG1' // fallback
        } else {
          // Non-testers see regular season games
          if (targetWeek === 1) seasonFilter = 'REG1'
          else if (targetWeek === 2) seasonFilter = 'REG2'
          else if (targetWeek === 3) seasonFilter = 'REG3'
          else seasonFilter = 'REG1' // fallback
        }
        
        // Get matchups for the user's default week and season type
        const { data: matchups, error } = await supabase
          .from('matchups')
          .select('*')
          .eq('week', targetWeek)
          .eq('season', seasonFilter)
          .order('game_time', { ascending: true })

        if (error) {
          console.error('Error fetching matchups for user week:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to fetch matchups',
            matchups: [],
            count: 0
          }, { status: 500 })
        }

        // Format week display based on season type
        if (isTester) {
          // Testers see preseason games
          if (targetWeek === 0) weekDisplay = 'Pre Season : Week 1'
          else if (targetWeek === 1) weekDisplay = 'Pre Season : Week 2'
          else if (targetWeek === 2) weekDisplay = 'Pre Season : Week 3'
          else weekDisplay = 'Pre Season : Week 3' // fallback
        } else {
          // Non-testers see regular season games
          weekDisplay = `Regular Season : Week ${targetWeek}`
        }

        return NextResponse.json({
          success: true,
          week_display: weekDisplay,
          matchups: matchups || [],
          count: matchups?.length || 0,
          user_week: targetWeek
        })
      }
    }
    
  } catch (error) {
    console.error('Error fetching matchups:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      matchups: [],
      count: 0
    }, { status: 500 })
  }
}
