import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  console.log('🔧 [TEST-PASSWORD-UPDATE] Starting test password update')
  
  try {
    const { password, userId } = await request.json()
    
    if (!password || !userId) {
      console.log('❌ [TEST-PASSWORD-UPDATE] Missing required fields')
      return NextResponse.json({ 
        error: 'Password and user ID are required' 
      }, { status: 400 })
    }

    console.log('🔧 [TEST-PASSWORD-UPDATE] Creating Supabase admin client...')
    const supabaseAdmin = createServiceRoleClient()
    
    // Check user details first
    console.log('🔧 [TEST-PASSWORD-UPDATE] Checking user details...')
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (userError) {
      console.error('❌ [TEST-PASSWORD-UPDATE] Failed to get user details:', userError)
      return NextResponse.json({ 
        error: 'Failed to get user details',
        details: userError.message
      }, { status: 500 })
    }
    
    console.log('✅ [TEST-PASSWORD-UPDATE] User details:', {
      id: userData.user?.id,
      email: userData.user?.email,
      emailConfirmed: !!userData.user?.email_confirmed_at,
      provider: userData.user?.app_metadata?.provider,
      identities: userData.user?.identities?.map((i: any) => i.provider),
      createdAt: userData.user?.created_at,
      lastSignIn: userData.user?.last_sign_in_at
    })
    
    // Try a simple password update without validation
    console.log('🔧 [TEST-PASSWORD-UPDATE] Attempting password update...')
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: password }
    )

    if (error) {
      console.error('❌ [TEST-PASSWORD-UPDATE] Password update failed:', error)
      console.error('❌ [TEST-PASSWORD-UPDATE] Full error object:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: error.message || 'Failed to update password',
        details: {
          code: error.code,
          status: error.status,
          name: error.name
        }
      }, { status: 500 })
    }

    console.log('✅ [TEST-PASSWORD-UPDATE] Password updated successfully!')
    console.log('✅ [TEST-PASSWORD-UPDATE] Updated user:', data.user?.email)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully',
      user: {
        email: data.user?.email,
        updatedAt: data.user?.updated_at
      }
    })

  } catch (error) {
    console.error('❌ [TEST-PASSWORD-UPDATE] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
