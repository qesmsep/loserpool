import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
// Remove this import since we're implementing the logic directly in this API route

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

    const supabase = await createServerSupabaseClient()
    
    const { data: user } = await supabase
      .from('users')
      .select('user_type, is_admin')
      .eq('id', userId)
      .single()

    // Check user_type first - if explicitly set to non-tester, respect that
    let isTester = false
    if (user?.user_type && user.user_type !== 'tester') {
      isTester = false
    } else if (user?.is_admin) {
      // Admins are testers by default, unless explicitly set to another type
      isTester = true
    } else {
      isTester = user?.user_type === 'tester'
    }

    return NextResponse.json({
      success: true,
      isTester,
      userId
    })

  } catch (error) {
    console.error('Error checking if user is tester:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
