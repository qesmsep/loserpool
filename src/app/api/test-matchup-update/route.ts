import { NextResponse } from 'next/server'
import { MatchupUpdateService } from '@/lib/matchup-update-service'

export async function POST() {
  const startTime = Date.now()
  
  try {
    console.log('Starting manual NFL matchup update...')
    
    const updateService = new MatchupUpdateService()
    const result = await updateService.updateAllMatchups()

    const executionTime = Date.now() - startTime
    
    console.log(`Manual update completed in ${executionTime}ms: ${result.total_games} total games updated`)

    return NextResponse.json({
      success: true,
      total_games: result.total_games,
      weeks_updated: result.weeks_updated,
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
