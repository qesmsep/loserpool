import { NextRequest, NextResponse } from 'next/server'
import { MatchupUpdateServicePreserveUuid } from '@/lib/matchup-update-service-preserve-uuid'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing UUID preservation functionality...')
    
    const matchupService = new MatchupUpdateServicePreserveUuid()
    const result = await matchupService.updateMatchupsPreserveUuid()

    return NextResponse.json({ 
      success: true,
      message: 'UUID preservation test completed',
      processed: result.processed,
      updated: result.updated,
      created: result.created,
      errors: result.errors,
      preservedUuids: result.preservedUuids,
      preservedUuidCount: result.preservedUuids.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in UUID preservation test:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
