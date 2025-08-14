import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test basic functionality
    const testData = {
      success: true,
      message: 'Dashboard test endpoint working',
      timestamp: new Date().toISOString(),
      components: {
        teamBackground: 'TeamBackground component should be working',
        matchupBox: 'MatchupBox component should be working',
        styledTeamName: 'StyledTeamName component should be working'
      }
    }
    
    return NextResponse.json(testData)
    
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
