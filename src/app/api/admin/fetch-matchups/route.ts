import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { MatchupDataService } from '@/lib/matchup-data-service'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    console.log('Admin triggered matchup fetch and create...')

    // Initialize the matchup data service
    const matchupService = new MatchupDataService()
    
    // Fetch and create matchups
    const result = await matchupService.fetchAndCreateCurrentWeekMatchups()

    console.log(`Matchup fetch completed: ${result.gamesFound} found, ${result.gamesCreated} created, ${result.gamesUpdated} updated`)

    return NextResponse.json({
      success: true,
      games_found: result.gamesFound,
      games_created: result.gamesCreated,
      games_updated: result.gamesUpdated,
      message: `Found ${result.gamesFound} games, created ${result.gamesCreated} new matchups, updated ${result.gamesUpdated} existing matchups`
    })

  } catch (error) {
    console.error('Error in fetch-matchups API:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

