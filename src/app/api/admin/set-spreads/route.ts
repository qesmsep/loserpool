import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

interface SpreadUpdateData {
  away_spread?: number
  home_spread?: number
  over_under?: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { gameId, awaySpread, homeSpread, overUnder } = await request.json()

    if (!gameId) {
      return NextResponse.json({ success: false, error: 'Game ID is required' }, { status: 400 })
    }

    const updateData: SpreadUpdateData = {}
    if (awaySpread !== undefined) updateData.away_spread = awaySpread
    if (homeSpread !== undefined) updateData.home_spread = homeSpread
    if (overUnder !== undefined) updateData.over_under = overUnder

    const { error } = await supabase
      .from('matchups')
      .update(updateData)
      .eq('id', gameId)

    if (error) {
      console.error('Error updating spreads:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Spreads updated successfully',
      gameId,
      spreads: updateData
    })

  } catch (error) {
    console.error('Error in set-spreads:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
