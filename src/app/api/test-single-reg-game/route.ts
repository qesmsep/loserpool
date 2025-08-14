import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    console.log('Testing single REG1 game insertion...')
    
    // Create a test game for REG1
    const testGame = {
      id: 'test-game-1',
      away_team: 'TestAway',
      home_team: 'TestHome',
      game_time: '7:00 PM',
      day: 'Sunday',
      date: '',
      status: 'scheduled'
    }
    
    // Convert to matchup format
    const convertedGame = NFLScheduleScraper.convertToMatchupFormat(testGame, 1, 'REG')
    
    console.log('Converted game:', JSON.stringify(convertedGame, null, 2))
    
    // Try to insert
    const { data, error } = await supabase
      .from('matchups')
      .insert(convertedGame)
      .select()
    
    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        error_details: error
      })
    }
    
    return NextResponse.json({
      success: true,
      data: data
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
