import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    console.log('🔍 Debug session API called')
    
    // Debug cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    console.log('🔍 All cookies received:', allCookies.map(c => ({ name: c.name, value: c.value?.substring(0, 20) + '...' })))
    
    // Check for Supabase auth cookies specifically
    const supabaseCookies = allCookies.filter(c => c.name.includes('supabase') || c.name.includes('auth'))
    console.log('🔍 Supabase auth cookies:', supabaseCookies.map(c => ({ name: c.name, value: c.value?.substring(0, 20) + '...' })))
    
    // Create Supabase client
    const supabase = await createServerSupabaseClient()
    
    // Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('🔍 Session check result:', {
      hasSession: !!session,
      sessionError: sessionError?.message,
      sessionExpiresAt: session?.expires_at,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })
    
    return NextResponse.json({
      success: true,
      hasSession: !!session,
      sessionError: sessionError?.message,
      sessionExpiresAt: session?.expires_at,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      allCookies: allCookies.map(c => c.name),
      supabaseCookies: supabaseCookies.map(c => c.name)
    })

  } catch (error) {
    console.error('Error in debug session API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
