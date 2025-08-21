import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Debug - Looking up user:', userId)

    // Use service role client to bypass RLS
    const supabaseAdmin = createServiceRoleClient()

    // Test simple user lookup
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, user_type, is_admin')
      .eq('id', userId)

    console.log('🔍 Debug - User lookup result:', { users, error, count: users?.length })

    if (error) {
      return NextResponse.json({
        error: 'User lookup failed',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        error: 'User not found',
        searchedId: userId,
        count: 0
      }, { status: 404 })
    }

    if (users.length > 1) {
      return NextResponse.json({
        error: 'Multiple users found',
        searchedId: userId,
        count: users.length,
        users
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: users[0]
    })

  } catch (error) {
    console.error('Error in debug user API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
