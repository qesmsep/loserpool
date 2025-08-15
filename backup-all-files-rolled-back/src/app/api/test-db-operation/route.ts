import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    console.log('Testing database operations...')
    
    const supabase = await createServerSupabaseClient()
    
    // Test basic query
    const { data, error } = await supabase
      .from('matchups')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: data,
      message: 'Database connection successful'
    })
  } catch (error) {
    console.error('Error testing database:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
