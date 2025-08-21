import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug - Testing database connection')

    const supabaseAdmin = await createServerSupabaseClient()

    // Test simple query to see if we can access the database
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1)

    console.log('🔍 Debug - Database test result:', { data, error })

    if (error) {
      return NextResponse.json({
        error: 'Database connection failed',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    // Try to get the specific user directly
    const { data: specificUser, error: specificError } = await supabaseAdmin
      .from('users')
      .select('id, email, user_type')
      .eq('id', '3cd4128c-948c-4fbc-9a73-115a458e4904')

    console.log('🔍 Debug - Specific user lookup:', { specificUser, specificError })

    return NextResponse.json({
      success: true,
      databaseConnected: true,
      specificUser,
      specificError: specificError?.message
    })

  } catch (error) {
    console.error('Error in debug database API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
