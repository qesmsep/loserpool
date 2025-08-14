import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pickId: string }> }
) {
  const { pickId } = await params
  try {
    // Verify user is authenticated
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()



    if (!pickId) {
      return NextResponse.json(
        { error: 'Pick ID is required' },
        { status: 400 }
      )
    }

    // Get pick history using the database function
    const { data: pickHistory, error } = await supabase
      .rpc('get_pick_history', { p_pick_id: pickId })

    if (error) {
      console.error('Error fetching pick history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pick history' },
        { status: 500 }
      )
    }

    // Verify the pick belongs to the authenticated user
    if (pickHistory && pickHistory.length > 0) {
      const { data: pickOwner } = await supabase
        .from('picks')
        .select('user_id')
        .eq('id', pickId)
        .limit(1)

      if (pickOwner && pickOwner.length > 0 && pickOwner[0].user_id !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized access to pick history' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({ 
      pickHistory: pickHistory || [],
      success: true 
    })

  } catch (error) {
    console.error('Error in pick history API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
