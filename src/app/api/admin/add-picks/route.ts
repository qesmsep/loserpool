import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    await requireAdmin()
    
    const { userId, picksCount } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!picksCount || picksCount <= 0) {
      return NextResponse.json({ error: 'Valid picks count is required' }, { status: 400 })
    }

    console.log('Adding picks:', { userId, picksCount })

    const supabase = await createServerSupabaseClient()

    // Add purchase record
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        picks_count: picksCount,
        amount_paid: picksCount * 2100, // $21 per pick in cents
        status: 'completed'
      })
      .select()

    if (purchaseError) {
      console.error('Error adding purchase:', purchaseError)
      return NextResponse.json({ error: purchaseError.message }, { status: 400 })
    }

    // Create actual pick records in the picks table
    const pickRecords = []
    for (let i = 1; i <= picksCount; i++) {
      pickRecords.push({
        user_id: userId,
        matchup_id: null, // Will be NULL for pending picks
        team_picked: null, // Will be NULL for pending picks
        picks_count: 1,
        status: 'pending',
        pick_name: `Pick ${i}`,
        week: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    const { data: picksData, error: picksError } = await supabase
      .from('picks')
      .insert(pickRecords)
      .select()

    if (picksError) {
      console.error('Error creating pick records:', picksError)
      return NextResponse.json({ error: picksError.message }, { status: 400 })
    }

    console.log('Picks added successfully:', { purchase: purchaseData[0], picks: picksData })
    return NextResponse.json({ 
      message: `${picksCount} picks added successfully`,
      purchase: purchaseData[0],
      picks: picksData
    })
  } catch (error) {
    console.error('Add picks error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 