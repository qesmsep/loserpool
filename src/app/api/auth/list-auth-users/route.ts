import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  console.log('🔧 [LIST-AUTH-USERS] Starting to list all auth users')
  
  try {
    const supabaseAdmin = createServiceRoleClient()
    
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000
    })
    
    if (listError) {
      console.error('❌ [LIST-AUTH-USERS] Failed to list users:', listError)
      return NextResponse.json({ 
        error: 'Failed to list users',
        details: listError.message
      }, { status: 500 })
    }
    
    console.log('✅ [LIST-AUTH-USERS] Successfully listed users')
    
    const userList = users.users.map(user => ({
      id: user.id,
      email: user.email,
      emailConfirmed: !!user.email_confirmed_at,
      provider: user.app_metadata?.provider,
      createdAt: user.created_at,
      lastSignIn: user.last_sign_in_at
    }))
    
    return NextResponse.json({ 
      success: true,
      totalUsers: userList.length,
      users: userList
    })

  } catch (error) {
    console.error('❌ [LIST-AUTH-USERS] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
