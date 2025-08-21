import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug - Listing all users')

    const supabaseAdmin = await createServerSupabaseClient()

    // List all users
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, user_type, is_admin')
      .limit(10)

    console.log('🔍 Debug - All users result:', { users, error, count: users?.length })

    if (error) {
      return NextResponse.json({
        error: 'User lookup failed',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      users,
      count: users?.length || 0
    })

  } catch (error) {
    console.error('Error in debug users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
