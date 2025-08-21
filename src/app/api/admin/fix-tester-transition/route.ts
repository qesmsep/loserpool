import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { fixAllTesterToActiveTransitions } from '@/lib/user-types'

export async function POST() {
  try {
    // Verify admin access
    await requireAdmin()

    // Fix all users with the Tester to Active transition issue
    const result = await fixAllTesterToActiveTransitions()

    return NextResponse.json({
      message: 'Tester to Active transition fix completed',
      totalFixed: result.totalFixed,
      errors: result.errors,
      success: result.errors.length === 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fixing tester transitions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing and status check
export async function GET() {
  try {
    // Verify admin access
    await requireAdmin()
    
    const { createServerSupabaseClient } = await import('@/lib/supabase-server')
    const supabase = await createServerSupabaseClient()

    // Check how many users are affected
    const { data: affectedUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, email, user_type, default_week, created_at')
      .eq('user_type', 'active')
      .eq('default_week', 3)
      .order('created_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to check affected users: ${fetchError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Tester to Active transition status check',
      affectedUsersCount: affectedUsers?.length || 0,
      affectedUsers: affectedUsers?.slice(0, 10) || [], // Show first 10
      needsFix: (affectedUsers?.length || 0) > 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error checking tester transitions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
