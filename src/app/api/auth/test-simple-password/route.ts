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
    
    console.log('🔧 [TEST-SIMPLE-PASSWORD] Attempting update with simple password:', simplePassword)
    
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: simplePassword }
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
