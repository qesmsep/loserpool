import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      return NextResponse.json({ error: 'Failed to check session' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      hasValidSession: !!session?.user,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email
      } : null
    })
  } catch (error) {
    console.error('Check reset status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
