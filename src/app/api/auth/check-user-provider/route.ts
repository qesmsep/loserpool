import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  console.log('🔧 [CHECK-USER-PROVIDER] Starting user provider check')
  
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()
    
    // Get user details from auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (authError) {
      console.error('❌ [CHECK-USER-PROVIDER] Failed to get auth user:', authError)
      return NextResponse.json({ 
        error: 'Failed to get user details',
        details: authError.message 
      }, { status: 500 })
    }

    const user = authUser.user
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Check authentication provider
    const provider = user.app_metadata?.provider || 'unknown'
    const identities = user.identities || []
    
    const userInfo = {
      id: user.id,
      email: user.email,
      emailConfirmed: !!user.email_confirmed_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastSignIn: user.last_sign_in_at,
      provider: provider,
      identities: identities.map((identity: { provider: string; id: string; email?: string }) => ({
        provider: identity.provider,
        id: identity.id,
        email: identity.email
      })),
      userMetadata: user.user_metadata,
      appMetadata: user.app_metadata,
      canUpdatePassword: provider === 'email' || provider === 'supabase',
      isEmailProvider: provider === 'email',
      isSupabaseProvider: provider === 'supabase',
      hasPassword: provider === 'email' || provider === 'supabase',
      isConfirmed: !!user.email_confirmed_at
    }

    console.log('✅ [CHECK-USER-PROVIDER] User info:', userInfo)
    
    return NextResponse.json({ 
      success: true,
      userInfo
    })

  } catch (error) {
    console.error('❌ [CHECK-USER-PROVIDER] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
