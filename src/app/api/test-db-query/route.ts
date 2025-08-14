import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    // Check if matchups table exists and has data
    const { data: matchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('*')
      .limit(5)
    
    // Check for week 2 matchups specifically
    const { data: week2Matchups, error: week2Error } = await supabase
      .from('matchups')
      .select('*')
      .eq('week', 2)
    
    // Check for week 1 matchups specifically
    const { data: week1Matchups, error: week1Error } = await supabase
      .from('matchups')
      .select('*')
      .eq('week', 1)
    
    // Get current week from global settings
    const { data: settings, error: settingsError } = await supabase
      .from('global_settings')
      .select('*')
      .eq('key', 'current_week')
    
    // Check if season column exists by trying to select it
    let seasonTest = null
    let seasonError = null
    try {
      const { data, error } = await supabase
        .from('matchups')
        .select('season')
        .limit(1)
      seasonTest = data
      seasonError = error
    } catch (err) {
      seasonError = err instanceof Error ? err : new Error('Unknown error')
    }
    
    return NextResponse.json({
      success: true,
      data: {
        matchups_count: matchups?.length || 0,
        matchups_sample: matchups || [],
        week1_matchups_count: week1Matchups?.length || 0,
        week1_matchups: week1Matchups || [],
        week2_matchups_count: week2Matchups?.length || 0,
        week2_matchups: week2Matchups || [],
        settings: settings || [],
        has_season_column: !seasonError,
        season_error: seasonError?.message,
        errors: {
          matchups: matchupsError?.message,
          week1: week1Error?.message,
          week2: week2Error?.message,
          settings: settingsError?.message
        }
      }
    })
    
  } catch (error) {
    console.error('Error in test-db-query:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
