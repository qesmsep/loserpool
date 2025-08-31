import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  console.log('🔧 [MANUAL-PASSWORD-RESET] Starting manual password reset')
  
  try {
    const { email, newPassword } = await request.json()
    
    if (!email || !newPassword) {
      console.log('❌ [MANUAL-PASSWORD-RESET] Missing required fields')
      return NextResponse.json({ 
        error: 'Email and new password are required' 
      }, { status: 400 })
    }

    console.log('🔧 [MANUAL-PASSWORD-RESET] Creating Supabase admin client...')
    const supabaseAdmin = createServiceRoleClient()
    
    // First, find the user by email
    console.log('🔧 [MANUAL-PASSWORD-RESET] Finding user by email...')
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000
    })
    
    if (listError) {
      console.error('❌ [MANUAL-PASSWORD-RESET] Failed to list users:', listError)
      return NextResponse.json({ 
        error: 'Failed to list users',
        details: listError.message
      }, { status: 500 })
    }
    
    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.log('❌ [MANUAL-PASSWORD-RESET] User not found:', email)
      return NextResponse.json({ 
        error: 'User not found',
        details: `No user found with email: ${email}`
      }, { status: 404 })
    }
    
    console.log('✅ [MANUAL-PASSWORD-RESET] User found:', {
      id: user.id,
      email: user.email,
      emailConfirmed: !!user.email_confirmed_at,
      provider: user.app_metadata?.provider
    })
    
    // Try to update the password
    console.log('🔧 [MANUAL-PASSWORD-RESET] Attempting password update...')
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )
    
    if (updateError) {
      console.error('❌ [MANUAL-PASSWORD-RESET] Password update failed:', updateError)
      return NextResponse.json({ 
        error: 'Password update failed',
        details: updateError.message,
        code: updateError.code,
        status: updateError.status,
        recommendations: [
          'This appears to be a Supabase project configuration issue',
          'Check your Supabase project settings in the dashboard',
          'Verify that password updates are allowed for your project',
          'Contact Supabase support if the issue persists'
        ]
      }, { status: 500 })
    }
    
    console.log('✅ [MANUAL-PASSWORD-RESET] Password updated successfully!')
    console.log('✅ [MANUAL-PASSWORD-RESET] Updated user:', updateData.user?.email)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully',
      user: {
        email: updateData.user?.email,
        updatedAt: updateData.user?.updated_at
      }
    })

  } catch (error) {
    console.error('❌ [MANUAL-PASSWORD-RESET] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
