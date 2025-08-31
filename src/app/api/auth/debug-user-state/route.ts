import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  console.log('🔧 [DEBUG-USER-STATE] Starting user state diagnostic')
  
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      console.log('❌ [DEBUG-USER-STATE] No user ID provided')
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    console.log('🔧 [DEBUG-USER-STATE] Creating Supabase admin client...')
    const supabaseAdmin = createServiceRoleClient()
    
    console.log('🔧 [DEBUG-USER-STATE] Fetching user details...')
    
    // Get user details from auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (authError) {
      console.error('❌ [DEBUG-USER-STATE] Failed to get auth user:', authError)
      return NextResponse.json({ 
        error: 'Failed to get user details',
        details: authError.message 
      }, { status: 500 })
    }

    console.log('✅ [DEBUG-USER-STATE] Auth user details retrieved')
    
    // Get user profile from users table
    const { data: profileUser, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    console.log('✅ [DEBUG-USER-STATE] Profile user details retrieved')
    
    // Check if user can be updated
    const userState = {
      id: authUser.user?.id,
      email: authUser.user?.email,
      emailConfirmed: authUser.user?.email_confirmed_at,
      createdAt: authUser.user?.created_at,
      updatedAt: authUser.user?.updated_at,
      lastSignIn: authUser.user?.last_sign_in_at,
      userMetadata: authUser.user?.user_metadata,
      appMetadata: authUser.user?.app_metadata,
      isConfirmed: !!authUser.user?.email_confirmed_at,
      hasProfile: !!profileUser,
      profileData: profileUser,
      canUpdatePassword: true // We'll determine this based on the data
    }

    // Check for potential issues
    const issues = []
    
    if (!authUser.user?.email_confirmed_at) {
      issues.push('User email not confirmed')
      userState.canUpdatePassword = false
    }
    
    if (!profileUser) {
      issues.push('User profile not found in users table')
    }
    
    if (authUser.user?.app_metadata?.provider !== 'email') {
      issues.push(`User provider is ${authUser.user?.app_metadata?.provider}, not email`)
    }

    console.log('✅ [DEBUG-USER-STATE] User state analysis complete')
    
    return NextResponse.json({ 
      success: true,
      userState,
      issues,
      canUpdatePassword: userState.canUpdatePassword
    })

  } catch (error) {
    console.error('❌ [DEBUG-USER-STATE] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
