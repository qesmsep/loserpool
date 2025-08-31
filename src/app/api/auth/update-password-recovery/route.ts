import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  console.log('🔧 [UPDATE-PASSWORD-RECOVERY] Starting recovery password update')
  
  try {
    const { password, accessToken, refreshToken } = await request.json()
    
    if (!password || !accessToken || !refreshToken) {
      console.log('❌ [UPDATE-PASSWORD-RECOVERY] Missing required fields')
      return NextResponse.json({ 
        error: 'Password, access token, and refresh token are required' 
      }, { status: 400 })
    }

    console.log('🔧 [UPDATE-PASSWORD-RECOVERY] Validating password...')
    
    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 })
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      return NextResponse.json({ 
        error: 'Password must contain at least one lowercase letter' 
      }, { status: 400 })
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      return NextResponse.json({ 
        error: 'Password must contain at least one uppercase letter' 
      }, { status: 400 })
    }
    
    if (!/(?=.*\d)/.test(password)) {
      return NextResponse.json({ 
        error: 'Password must contain at least one number' 
      }, { status: 400 })
    }
    
    if (!/(?=.*[!@#$%^&*])/.test(password)) {
      return NextResponse.json({ 
        error: 'Password must contain at least one special character (!@#$%^&*)' 
      }, { status: 400 })
    }

    console.log('✅ [UPDATE-PASSWORD-RECOVERY] Password validation passed')
    console.log('🔧 [UPDATE-PASSWORD-RECOVERY] Creating Supabase admin client...')
    
    const supabaseAdmin = createServiceRoleClient()
    
    // First, try to get the user from the access token
    console.log('🔧 [UPDATE-PASSWORD-RECOVERY] Getting user from access token...')
    
    try {
      // Create a temporary client with the recovery tokens
      const tempClient = createServiceRoleClient()
      
      // Set the session with the recovery tokens
      const { data: sessionData, error: sessionError } = await tempClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      
      if (sessionError) {
        console.error('❌ [UPDATE-PASSWORD-RECOVERY] Failed to set session:', sessionError)
        throw new Error('Invalid recovery session')
      }
      
      if (!sessionData.session?.user) {
        console.error('❌ [UPDATE-PASSWORD-RECOVERY] No user in session')
        throw new Error('No user found in recovery session')
      }
      
      const userId = sessionData.session.user.id
      console.log('✅ [UPDATE-PASSWORD-RECOVERY] User identified:', userId)
      
      // Now update the password using admin API
      console.log('🔧 [UPDATE-PASSWORD-RECOVERY] Updating password via admin API...')
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: password }
      )

      if (error) {
        console.error('❌ [UPDATE-PASSWORD-RECOVERY] Password update failed:', error)
        return NextResponse.json({ 
          error: error.message || 'Failed to update password' 
        }, { status: 500 })
      }

      console.log('✅ [UPDATE-PASSWORD-RECOVERY] Password updated successfully for user:', data.user?.email)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Password updated successfully' 
      })
      
    } catch (sessionError) {
      console.error('❌ [UPDATE-PASSWORD-RECOVERY] Session error:', sessionError)
      return NextResponse.json({ 
        error: 'Invalid recovery session' 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ [UPDATE-PASSWORD-RECOVERY] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
