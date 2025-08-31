import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  console.log('🔧 [DEBUG-PASSWORD-UPDATE] Starting password update diagnostic')
  
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()
    
    // Get the auth user details
    console.log('🔧 [DEBUG-PASSWORD-UPDATE] Getting auth user details...')
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ [DEBUG-PASSWORD-UPDATE] Failed to list users:', listError)
      return NextResponse.json({ 
        error: 'Failed to list users',
        details: listError.message
      }, { status: 500 })
    }
    
    const authUser = users.find(user => user.email === email)
    
    if (!authUser) {
      console.log('❌ [DEBUG-PASSWORD-UPDATE] Auth user not found:', email)
      return NextResponse.json({ 
        error: 'Auth user not found',
        email: email
      }, { status: 404 })
    }
    
    console.log('✅ [DEBUG-PASSWORD-UPDATE] Auth user found:', authUser.id)
    
    // Check the user's current state (only using properties that exist)
    const userState = {
      id: authUser.id,
      email: authUser.email,
      emailConfirmed: authUser.email_confirmed_at,
      lastSignIn: authUser.last_sign_in_at,
      createdAt: authUser.created_at,
      updatedAt: authUser.updated_at,
      phoneConfirmed: authUser.phone_confirmed_at,
      provider: authUser.app_metadata?.provider || 'email',
      providers: authUser.app_metadata?.providers || [],
      aud: authUser.aud,
      role: authUser.role,
      isConfirmed: authUser.email_confirmed_at !== null,
      needsPasswordChange: authUser.user_metadata?.needs_password_change || false
    }
    
    console.log('🔍 [DEBUG-PASSWORD-UPDATE] User state:', userState)
    
    // Try to update the password with a test password to see what happens
    console.log('🔧 [DEBUG-PASSWORD-UPDATE] Testing password update...')
    const testPassword = 'TestPassword123!'
    
    try {
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { 
          password: testPassword,
          user_metadata: { needs_password_change: false }
        }
      )
      
      if (updateError) {
        console.error('❌ [DEBUG-PASSWORD-UPDATE] Password update test failed:', updateError)
        return NextResponse.json({
          success: false,
          error: 'Password update test failed',
          details: updateError.message,
          code: updateError.code,
          status: updateError.status,
          userState: userState
        })
      }
      
      console.log('✅ [DEBUG-PASSWORD-UPDATE] Password update test succeeded')
      
      // Now revert the password back to the original (if we can)
      console.log('🔧 [DEBUG-PASSWORD-UPDATE] Reverting test password...')
      const { error: revertError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { 
          password: 'OriginalPassword123!', // This is just a placeholder
          user_metadata: { needs_password_change: true }
        }
      )
      
      if (revertError) {
        console.warn('⚠️ [DEBUG-PASSWORD-UPDATE] Could not revert test password:', revertError.message)
      }
      
      return NextResponse.json({
        success: true,
        message: 'Password update test succeeded',
        userState: userState,
        testResult: {
          updateSucceeded: true,
          revertSucceeded: !revertError
        }
      })
      
    } catch (testError) {
      console.error('❌ [DEBUG-PASSWORD-UPDATE] Password update test exception:', testError)
      return NextResponse.json({
        success: false,
        error: 'Password update test exception',
        details: testError instanceof Error ? testError.message : 'Unknown error',
        userState: userState
      })
    }

  } catch (error) {
    console.error('❌ [DEBUG-PASSWORD-UPDATE] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
