import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { NFLScheduleScraper } from '@/lib/nfl-schedule-scraper'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    console.log('Testing REG1 insertion one by one...')
    
    // Create a few test games for REG1
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
      }
    ]
    
    const results = []
    
    for (const game of testGames) {
      try {
        // Convert to matchup format
        const convertedGame = NFLScheduleScraper.convertToMatchupFormat(game, 1, 'REG')
        
        console.log('Inserting game:', convertedGame)
        
        // Try to insert
        const { data, error } = await supabase
          .from('matchups')
          .insert(convertedGame)
          .select()
        
        if (error) {
          console.error('Insert error:', error)
          results.push({
            game: `${game.away_team} @ ${game.home_team}`,
            success: false,
            error: error.message
          })
        } else {
          console.log('Insert success:', data)
          results.push({
            game: `${game.away_team} @ ${game.home_team}`,
            success: true,
            data: data
          })
        }
      } catch (error) {
        console.error('Game insertion error:', error)
        results.push({
          game: `${game.away_team} @ ${game.home_team}`,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      results: results
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
