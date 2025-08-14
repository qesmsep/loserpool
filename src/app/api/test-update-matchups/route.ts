import { NextRequest, NextResponse } from 'next/server'
import { MatchupDataService } from '@/lib/matchup-data-service'

export async function POST(request: NextRequest) {
  try {
    console.log('Testing Matchup Update System...')
    
    const matchupService = new MatchupDataService()
    const result = await matchupService.updateAllMatchups()
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      updated: result.updated,
      errors: result.errors,
      message: 'Matchup update test completed successfully'
    })
  } catch (error) {
    console.error('Matchup update test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: 0,
      updated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, { status: 500 })
  }
}
