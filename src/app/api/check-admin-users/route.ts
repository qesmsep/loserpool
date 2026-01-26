import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Check for bearer token first (same pattern as other admin routes)
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader : null
    
    let authenticatedUser: { id: string; email?: string } | null = null
    
    if (bearer) {
      // Create a client with the bearer token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: bearer } },
          auth: { persistSession: false, autoRefreshToken: false }
        }
      )
      
      const { data: { user: bearerUser }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('Bearer token auth error:', error)
      } else if (bearerUser) {
        authenticatedUser = bearerUser
        console.log('✅ User authenticated via bearer token:', authenticatedUser.email)
      }
    }
    
    // Fall back to cookie-based authentication if bearer token failed
    if (!authenticatedUser) {
      try {
        const supabase = await createServerSupabaseClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Cookie session error:', sessionError.message)
        } else if (session?.user) {
          authenticatedUser = session.user
          console.log('✅ User authenticated via cookie:', authenticatedUser.email)
        }
      } catch (error) {
        console.error('Cookie authentication error:', error)
      }
    }
    
    if (!authenticatedUser) {
      console.log('❌ No authenticated user found for admin check')
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    
    // Check if user is admin using service role client
    const supabaseAdmin = createServiceRoleClient()
    const { data: userProfile, error: adminError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', authenticatedUser.id)
      .single()
    
    console.log('🔍 Admin check result:', {
      hasProfile: !!userProfile,
      isAdmin: userProfile?.is_admin,
      error: adminError?.message
    })
    
    if (adminError) {
      console.error('Admin check error:', adminError.message)
      return NextResponse.json({ error: 'Admin verification failed' }, { status: 403 })
    }
    
    if (!userProfile?.is_admin) {
      console.log('❌ User is not admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // User is admin - return success
    console.log('✅ User is admin, allowing access')
    return NextResponse.json({
      success: true,
      isAdmin: true,
      userId: authenticatedUser.id
    })

  } catch (error) {
    console.error('Error checking admin status:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
