import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    console.log('Testing REG1 batch insertion...')
    
    // Create test games for REG1
    const testGames = [
      {
        id: 'test-reg1-1',
        away_team: 'TestAway1',
        home_team: 'TestHome1',
        game_time: '7:00 PM',
        day: 'Sunday',
        date: '',
        status: 'scheduled'
      },
      {
        id: 'test-reg1-2',
        away_team: 'TestAway2',
        home_team: 'TestHome2',
        game_time: '8:00 PM',
        day: 'Sunday',
        date: '',
        status: 'scheduled'
      },
      {
        id: 'test-reg1-3',
        away_team: 'TestAway3',
        home_team: 'TestHome3',
        game_time: '9:00 PM',
        day: 'Sunday',
        date: '',
        status: 'scheduled'
      }
    ]
    
    // Convert to matchup format
    const matchupsToInsert = testGames.map(game => 
      NFLScheduleScraper.convertToMatchupFormat(game, 1, 'REG')
    )
    
    console.log('Attempting batch insert of', matchupsToInsert.length, 'games')
    
    // Try batch insert
    const { data, error } = await supabase
      .from('matchups')
      .insert(matchupsToInsert)
      .select()
    
    if (error) {
      console.error('Batch insert error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        error_details: error
      })
    }
    
    return NextResponse.json({
      success: true,
      data: data,
      count: data?.length || 0
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
