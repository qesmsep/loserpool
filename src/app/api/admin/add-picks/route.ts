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
    const { data, error } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        picks_count: picksCount,
        amount_paid: picksCount * 2100, // $21 per pick in cents
        status: 'completed'
      })
      .select()

    if (error) {
      console.error('Error adding picks:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('Picks added successfully:', data)
    return NextResponse.json({ 
      message: `${picksCount} picks added successfully`,
      purchase: data[0]
    })
  } catch (error) {
    console.error('Add picks error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 