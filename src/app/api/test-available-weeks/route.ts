import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    console.log('Checking available weeks in database...')
    
    const supabase = createServiceRoleClient()
    
    // Get all unique weeks from matchups table
    const { data, error } = await supabase
      .from('matchups')
      .select('week')
      .order('week')
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    // Get unique weeks
    const uniqueWeeks = [...new Set(data.map(row => row.week))]
    
    // Get count for each week
    const weekCounts = await Promise.all(
      uniqueWeeks.map(async (week) => {
        const { count } = await supabase
          .from('matchups')
          .select('*', { count: 'exact', head: true })
          .eq('week', week)
        
        return { week, count }
      })
    )
    
    return NextResponse.json({
      success: true,
      available_weeks: weekCounts,
      total_matchups: data.length
    })
  } catch (error) {
    console.error('Error checking available weeks:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
