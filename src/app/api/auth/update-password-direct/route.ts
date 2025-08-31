import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  console.log('🔧 [UPDATE-PASSWORD-DIRECT] Starting direct password update')
  
  try {
    const { email, newPassword } = await request.json()
    
    if (!email || !newPassword) {
      console.log('❌ [UPDATE-PASSWORD-DIRECT] Missing email or password')
      return NextResponse.json({ 
        error: 'Email and new password are required' 
      }, { status: 400 })
    }

    console.log('🔧 [UPDATE-PASSWORD-DIRECT] Creating Supabase admin client...')
    const supabaseAdmin = createServiceRoleClient()
    
    // Find the user by email
    console.log('🔧 [UPDATE-PASSWORD-DIRECT] Finding user by email...')
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ [UPDATE-PASSWORD-DIRECT] Failed to list users:', listError)
      return NextResponse.json({ 
        error: 'Failed to find user',
        details: listError.message
      }, { status: 500 })
    }
    
    const authUser = users.find(user => user.email === email)
    
    if (!authUser) {
      console.log('❌ [UPDATE-PASSWORD-DIRECT] User not found:', email)
      return NextResponse.json({ 
        error: 'User not found',
        email: email
      }, { status: 404 })
    }
    
    console.log('✅ [UPDATE-PASSWORD-DIRECT] User found:', authUser.id)
    
    // Update the password directly using admin API
    console.log('🔧 [UPDATE-PASSWORD-DIRECT] Updating password...')
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { 
        password: newPassword,
        user_metadata: { needs_password_change: false }
      }
    )
    
    if (updateError) {
      console.error('❌ [UPDATE-PASSWORD-DIRECT] Password update failed:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Password update failed',
        details: updateError.message,
        code: updateError.code,
        status: updateError.status
      })
    }
    
    console.log('✅ [UPDATE-PASSWORD-DIRECT] Password updated successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      user: {
        id: authUser.id,
        email: authUser.email
      }
    })

  } catch (error) {
    console.error('❌ [UPDATE-PASSWORD-DIRECT] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
