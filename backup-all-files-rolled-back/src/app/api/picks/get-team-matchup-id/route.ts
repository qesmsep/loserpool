import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    await requireAuth()
    const supabase = await createServerSupabaseClient()

    // Parse request body
    const { matchupId, teamName } = await request.json()

    if (!matchupId || !teamName) {
      return NextResponse.json(
        { error: 'Missing required fields: matchupId, teamName' },
        { status: 400 }
      )
    }

    // Call the database function to generate team_matchup_id
    const { data: result, error } = await supabase
      .rpc('get_team_matchup_id', {
        p_matchup_id: matchupId,
        p_team_name: teamName
      })

    if (error) {
      console.error('Error generating team matchup ID:', error)
      return NextResponse.json(
        { error: 'Failed to generate team matchup ID' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      teamMatchupId: result
    })

  } catch (error) {
    console.error('Error in get team matchup ID API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
