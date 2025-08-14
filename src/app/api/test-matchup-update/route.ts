import { NextResponse } from 'next/server'
import { MatchupUpdateService } from '@/lib/matchup-update-service'

export async function POST() {
  const startTime = Date.now()
  
  try {
    console.log('Starting manual NFL matchup update...')
    
    const updateService = new MatchupUpdateService()
    const result = await updateService.updateAllMatchups()

    const executionTime = Date.now() - startTime
    const totalGames = result.current_week_games + result.next_week_games
    
    console.log(`Manual update completed in ${executionTime}ms: ${totalGames} total games updated`)

    return NextResponse.json({
      success: true,
      current_week_games: result.current_week_games,
      next_week_games: result.next_week_games,
      total_games: totalGames,
      execution_time_ms: executionTime,
      errors: result.errors.length > 0 ? result.errors : null
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Error in manual update:', error)
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      execution_time_ms: executionTime
    }, { status: 500 })
  }
}
