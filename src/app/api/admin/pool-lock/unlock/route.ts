import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function POST() {
  try {
    await requireAdmin()
    const supabase = await createServerSupabaseClient()

    // Remove manual lock
    const { error } = await supabase
      .from('global_settings')
      .upsert({
        key: 'pool_locked',
        value: 'false'
      })

    if (error) {
      console.error('Error unlocking pool:', error)
      return NextResponse.json(
        { error: 'Failed to unlock pool' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Pool unlocked successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in pool unlock:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 