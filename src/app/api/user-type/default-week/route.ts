import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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
      .select('user_type, is_admin, default_week')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // If user has a default_week set, use it
    if (user.default_week !== null && user.default_week !== undefined) {
      return NextResponse.json({
        success: true,
        defaultWeek: user.default_week,
        userId
      })
    }

    // Otherwise calculate based on user type
    const isTester = user.is_admin || user.user_type === 'tester'
    const defaultWeek = isTester ? 3 : 1 // 3 = preseason week 3, 1 = regular season week 1

    return NextResponse.json({
      success: true,
      defaultWeek,
      userId
    })

  } catch (error) {
    console.error('Error getting user default week:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
