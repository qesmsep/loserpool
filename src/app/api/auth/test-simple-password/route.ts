import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  console.log('🔧 [TEST-SIMPLE-PASSWORD] Starting simple password test')
  
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      console.log('❌ [TEST-SIMPLE-PASSWORD] Missing user ID')
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    console.log('🔧 [TEST-SIMPLE-PASSWORD] Creating Supabase admin client...')
    const supabaseAdmin = createServiceRoleClient()
    
    // Get user details first to check metadata
    console.log('🔧 [TEST-SIMPLE-PASSWORD] Getting user details...')
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (userError) {
      console.error('❌ [TEST-SIMPLE-PASSWORD] Failed to get user details:', userError)
      return NextResponse.json({ 
        error: 'Failed to get user details',
        details: userError.message
      }, { status: 500 })
    }
    
    console.log('✅ [TEST-SIMPLE-PASSWORD] User details retrieved:', {
      id: userData.user?.id,
      email: userData.user?.email,
      emailConfirmed: !!userData.user?.email_confirmed_at,
      provider: userData.user?.app_metadata?.provider,
      needsPasswordChange: userData.user?.user_metadata?.needs_password_change,
      createdAt: userData.user?.created_at,
      lastSignIn: userData.user?.last_sign_in_at
    })
    
    // Try with an even simpler password to test if it's a complexity issue
    const simplePassword = 'Password123!'
    
    console.log('🔧 [TEST-SIMPLE-PASSWORD] Attempting update with simple password:', simplePassword)
    
    // Try multiple approaches:
    
    // Approach 1: Just password update
    console.log('🔧 [TEST-SIMPLE-PASSWORD] Approach 1: Password only update...')
    const { data: data1, error: error1 } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: simplePassword }
    )
    
    if (!error1) {
      console.log('✅ [TEST-SIMPLE-PASSWORD] Approach 1 succeeded!')
      return NextResponse.json({ 
        success: true, 
        message: 'Simple password update succeeded (approach 1)',
        user: {
          email: data1.user?.email,
          updatedAt: data1.user?.updated_at
        }
      })
    }
    
    console.log('❌ [TEST-SIMPLE-PASSWORD] Approach 1 failed:', error1)
    
    // Approach 2: Password + clear metadata flag
    console.log('🔧 [TEST-SIMPLE-PASSWORD] Approach 2: Password + metadata update...')
    const updateData = { 
      password: simplePassword,
      user_metadata: {
        ...userData.user?.user_metadata,
        needs_password_change: false
      }
    }
    
    const { data: data2, error: error2 } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updateData
    )
    
    if (!error2) {
      console.log('✅ [TEST-SIMPLE-PASSWORD] Approach 2 succeeded!')
      return NextResponse.json({ 
        success: true, 
        message: 'Simple password update succeeded (approach 2)',
        user: {
          email: data2.user?.email,
          updatedAt: data2.user?.updated_at
        }
      })
    }
    
    console.log('❌ [TEST-SIMPLE-PASSWORD] Approach 2 failed:', error2)
    
    // Approach 3: Try without user_metadata at all
    console.log('🔧 [TEST-SIMPLE-PASSWORD] Approach 3: Password only, no metadata...')
    const { data: data3, error: error3 } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: simplePassword }
    )
    
    if (!error3) {
      console.log('✅ [TEST-SIMPLE-PASSWORD] Approach 3 succeeded!')
      return NextResponse.json({ 
        success: true, 
        message: 'Simple password update succeeded (approach 3)',
        user: {
          email: data3.user?.email,
          updatedAt: data3.user?.updated_at
        }
      })
    }
    
    console.log('❌ [TEST-SIMPLE-PASSWORD] All approaches failed')
    console.error('❌ [TEST-SIMPLE-PASSWORD] Final error details:', {
      error1: error1?.message,
      error2: error2?.message,
      error3: error3?.message
    })
    
    return NextResponse.json({ 
      error: 'All password update approaches failed',
      details: {
        approach1: error1?.message,
        approach2: error2?.message,
        approach3: error3?.message
      }
    }, { status: 500 })

  } catch (error) {
    console.error('❌ [TEST-SIMPLE-PASSWORD] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
