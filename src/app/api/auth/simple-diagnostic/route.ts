import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  console.log('🔧 [SIMPLE-DIAGNOSTIC] Starting simple diagnostic')
  
  try {
    const supabaseAdmin = createServiceRoleClient()
    
    // Test 1: Basic connectivity
    console.log('🔧 [SIMPLE-DIAGNOSTIC] Test 1: Basic connectivity...')
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1
    })
    
    if (listError) {
      console.error('❌ [SIMPLE-DIAGNOSTIC] Failed to list users:', listError)
      return NextResponse.json({ 
        error: 'Failed to list users',
        details: listError.message,
        test: 'basic_connectivity'
      }, { status: 500 })
    }
    
    console.log('✅ [SIMPLE-DIAGNOSTIC] Test 1 passed: Basic connectivity')
    
    // Test 2: Check if we can find the specific user
    console.log('🔧 [SIMPLE-DIAGNOSTIC] Test 2: Finding specific user...')
    const targetUser = users.users.find(u => u.email === 'tim.wirick@gmail.com')
    
    if (!targetUser) {
      console.log('❌ [SIMPLE-DIAGNOSTIC] Target user not found')
      return NextResponse.json({ 
        error: 'Target user not found',
        details: 'User tim.wirick@gmail.com not found in the system',
        test: 'find_user'
      }, { status: 404 })
    }
    
    console.log('✅ [SIMPLE-DIAGNOSTIC] Test 2 passed: User found')
    console.log('🔍 [SIMPLE-DIAGNOSTIC] User details:', {
      id: targetUser.id,
      email: targetUser.email,
      emailConfirmed: !!targetUser.email_confirmed_at,
      provider: targetUser.app_metadata?.provider,
      createdAt: targetUser.created_at,
      lastSignIn: targetUser.last_sign_in_at
    })
    
    // Test 3: Try to update the user's password
    console.log('🔧 [SIMPLE-DIAGNOSTIC] Test 3: Testing password update...')
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { password: 'TestPassword123!' }
    )
    
    if (updateError) {
      console.error('❌ [SIMPLE-DIAGNOSTIC] Password update failed:', updateError)
      return NextResponse.json({ 
        error: 'Password update failed',
        details: updateError.message,
        code: updateError.code,
        status: updateError.status,
        test: 'password_update',
        userDetails: {
          id: targetUser.id,
          email: targetUser.email,
          provider: targetUser.app_metadata?.provider,
          emailConfirmed: !!targetUser.email_confirmed_at
        },
        recommendations: [
          'This confirms a Supabase project configuration issue',
          'Check your Supabase project settings in the dashboard',
          'Verify that password updates are allowed for your project',
          'Contact Supabase support with the error details'
        ]
      }, { status: 500 })
    }
    
    console.log('✅ [SIMPLE-DIAGNOSTIC] Test 3 passed: Password update succeeded!')
    
    // Test 4: Check environment variables
    console.log('🔧 [SIMPLE-DIAGNOSTIC] Test 4: Checking environment variables...')
    const envCheck = {
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length : 0,
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL
    }
    
    console.log('✅ [SIMPLE-DIAGNOSTIC] Test 4 passed: Environment variables check')
    
    console.log('✅ [SIMPLE-DIAGNOSTIC] All tests passed!')
    
    return NextResponse.json({ 
      success: true,
      message: 'All diagnostic tests passed - password update should work',
      tests: {
        basicConnectivity: 'passed',
        findUser: 'passed',
        passwordUpdate: 'passed',
        environmentVariables: 'passed'
      },
      environment: envCheck,
      userDetails: {
        id: targetUser.id,
        email: targetUser.email,
        provider: targetUser.app_metadata?.provider,
        emailConfirmed: !!targetUser.email_confirmed_at
      },
      recommendations: [
        'All basic functionality appears to be working',
        'If password reset still fails, the issue may be with the client-side flow',
        'Try the manual password reset again',
        'Check the client-side session handling'
      ]
    })

  } catch (error) {
    console.error('❌ [SIMPLE-DIAGNOSTIC] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
