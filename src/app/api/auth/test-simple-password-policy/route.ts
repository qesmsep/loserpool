import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  console.log('🔧 [TEST-SIMPLE-PASSWORD-POLICY] Starting simple password test')
  
  try {
    const supabaseAdmin = createServiceRoleClient()
    
    // Find the user
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000
    })
    
    if (listError) {
      return NextResponse.json({ 
        error: 'Failed to list users',
        details: listError.message
      }, { status: 500 })
    }
    
    const targetUser = users.users.find(u => u.email === 'jpatrickross1961@gmail.com')
    
    if (!targetUser) {
      return NextResponse.json({ 
        error: 'Target user not found',
        details: 'User jpatrickross1961@gmail.com not found in the system',
        availableUsers: users.users.map(u => ({ email: u.email, id: u.id }))
      }, { status: 404 })
    }
    
    console.log('✅ [TEST-SIMPLE-PASSWORD-POLICY] User found:', targetUser.email)
    
    // Try with the simplest possible password that meets basic requirements
    const simplePassword = 'Test123!'
    
    console.log('🔧 [TEST-SIMPLE-PASSWORD-POLICY] Testing with simple password:', simplePassword)
    
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { password: simplePassword }
    )
    
    if (updateError) {
      console.error('❌ [TEST-SIMPLE-PASSWORD-POLICY] Password update failed:', updateError)
      return NextResponse.json({ 
        error: 'Password update failed',
        details: updateError.message,
        code: updateError.code,
        status: updateError.status,
        passwordUsed: simplePassword,
        recommendations: [
          'This confirms a Supabase project configuration issue',
          'Check your Supabase project settings in the dashboard',
          'Verify that password updates are allowed for your project',
          'Check SMTP configuration in Authentication settings',
          'Contact Supabase support with error code: ' + updateError.code
        ]
      }, { status: 500 })
    }
    
    console.log('✅ [TEST-SIMPLE-PASSWORD-POLICY] Password update succeeded!')
    
    return NextResponse.json({ 
      success: true,
      message: 'Simple password update worked!',
      passwordUsed: simplePassword,
      user: {
        email: updateData.user?.email,
        updatedAt: updateData.user?.updated_at
      },
      recommendations: [
        'Password update is working with simple passwords',
        'The issue may be with password complexity requirements',
        'Check your Supabase password policy settings'
      ]
    })

  } catch (error) {
    console.error('❌ [TEST-SIMPLE-PASSWORD-POLICY] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
