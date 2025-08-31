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
    
    // Try with a very simple password to test if it's a policy issue
    const simplePassword = 'Test123!'
    
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
    
    console.log('🔧 [TEST-SIMPLE-PASSWORD] Attempting update with simple password:', simplePassword)
    
    // Prepare update data - clear the needs_password_change flag
    const updateData = { 
      password: simplePassword,
      user_metadata: {
        ...userData.user?.user_metadata,
        needs_password_change: false
      }
    }
    
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updateData
    )

    if (error) {
      console.error('❌ [TEST-SIMPLE-PASSWORD] Simple password update failed:', error)
      console.error('❌ [TEST-SIMPLE-PASSWORD] Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name
      })
      return NextResponse.json({ 
        error: error.message || 'Failed to update password',
        details: {
          code: error.code,
          status: error.status
        }
      }, { status: 500 })
    }

    console.log('✅ [TEST-SIMPLE-PASSWORD] Simple password update succeeded!')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Simple password update succeeded',
      user: {
        email: data.user?.email,
        updatedAt: data.user?.updated_at
      }
    })

  } catch (error) {
    console.error('❌ [TEST-SIMPLE-PASSWORD] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
