import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = await createServerSupabaseClient()

    const formData = await request.formData()
    const lockDate = formData.get('lockDate') as string

    if (!lockDate) {
      return NextResponse.json(
        { error: 'Lock date is required' },
        { status: 400 }
      )
    }

    // Convert datetime-local to proper format
    const formattedDate = new Date(lockDate).toISOString().replace('T', ' ').slice(0, 19)

    // Update lock date
    const { error } = await supabase
      .from('global_settings')
      .upsert({
        key: 'pool_lock_date',
        value: formattedDate
      })

    if (error) {
      console.error('Error updating lock date:', error)
      return NextResponse.json(
        { error: 'Failed to update lock date' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Lock date updated successfully',
      lockDate: formattedDate,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error updating lock date:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 