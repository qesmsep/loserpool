import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get a few sample picks to see what's in the database
    const { data: picks, error } = await supabase
      .from('picks')
      .select('*')
      .limit(5)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('picks')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      totalPicksInDatabase: totalCount,
      samplePicks: picks
    })

  } catch (error) {
    console.error('Error in sample picks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
