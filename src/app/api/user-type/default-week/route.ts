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

    // Use the new season detection system
    const { getUserDefaultWeek } = await import('@/lib/season-detection')
    const defaultWeek = await getUserDefaultWeek(userId)

    return NextResponse.json({
      success: true,
      defaultWeek,
      userId,
      debug: {
        reason: 'calculated_from_season_detection',
        calculated_week: defaultWeek
      }
    })

  } catch (error) {
    console.error('❌ ERROR: Error getting user default week:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
