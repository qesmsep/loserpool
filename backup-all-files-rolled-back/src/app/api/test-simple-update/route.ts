import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

export async function POST() {
  try {
    console.log('Testing simple database update...')
    
    const supabase = createServiceRoleClient()
    
    // Test deleting existing matchups for week 2
    console.log('Deleting existing matchups for week 2...')
    const { error: deleteError } = await supabase
      .from('matchups')
      .delete()
      .eq('week', '2')

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({
        success: false,
        error: deleteError.message
      }, { status: 500 })
    }

    console.log('Successfully deleted existing matchups')

    // Test inserting a simple matchup
    console.log('Inserting test matchup...')
    const testMatchup = {
      week: '2',
      away_team: 'Test Away',
      home_team: 'Test Home',
      game_time: new Date().toISOString(), // Use proper timestamp
      status: 'scheduled',
      data_source: 'test',
      last_api_update: new Date().toISOString()
    }

    const { error: insertError } = await supabase
      .from('matchups')
      .insert(testMatchup)

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({
        success: false,
        error: insertError.message
      }, { status: 500 })
    }

    console.log('Successfully inserted test matchup')

    return NextResponse.json({
      success: true,
      message: 'Database operations successful'
    })
  } catch (error) {
    console.error('Error in simple test:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
