import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

/**
 * Check if there has been a forced logout since the user's session began
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'last_weekly_logout')
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching last_weekly_logout:', error)
      return NextResponse.json({ lastLogout: null })
    }

    return NextResponse.json({ 
      lastLogout: data?.value || null 
    })
  } catch (error) {
    console.error('Error in check-forced-logout:', error)
    return NextResponse.json({ lastLogout: null })
  }
}

