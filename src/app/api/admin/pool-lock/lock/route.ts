import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = await createServerSupabaseClient()

    // Set manual lock
    const { error } = await supabase
      .from('global_settings')
      .upsert({
        key: 'pool_locked',
        value: 'true'
      })

    if (error) {
      console.error('Error locking pool:', error)
      return NextResponse.json(
        { error: 'Failed to lock pool' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Pool locked successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in pool lock:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 