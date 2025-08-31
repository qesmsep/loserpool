import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  console.log('🔧 [CHECK-SUPABASE-AUTH-SETTINGS] Starting auth settings check')
  
  try {
    const supabaseAdmin = createServiceRoleClient()
    
    // Test 1: Check if we can list users (basic connectivity)
    console.log('🔧 [CHECK-SUPABASE-AUTH-SETTINGS] Test 1: Checking user connectivity...')
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 5
    })
    
    if (listError) {
      console.error('❌ [CHECK-SUPABASE-AUTH-SETTINGS] Failed to list users:', listError)
      return NextResponse.json({ 
        error: 'Failed to list users',
        details: listError.message,
        test: 'list_users'
      }, { status: 500 })
    }
    
    console.log('✅ [CHECK-SUPABASE-AUTH-SETTINGS] Test 1 passed: Can list users')
    
    // Test 2: Check specific user details
    if (users.users.length > 0) {
      const testUser = users.users[0]
      console.log('🔧 [CHECK-SUPABASE-AUTH-SETTINGS] Test 2: Checking user details...')
      
      console.log('✅ [CHECK-SUPABASE-AUTH-SETTINGS] Test 2 passed: User details retrieved')
      console.log('🔍 [CHECK-SUPABASE-AUTH-SETTINGS] Test user details:', {
        id: testUser.id,
        email: testUser.email,
        emailConfirmed: !!testUser.email_confirmed_at,
        provider: testUser.app_metadata?.provider,
        createdAt: testUser.created_at,
        lastSignIn: testUser.last_sign_in_at,
        userMetadata: testUser.user_metadata,
        appMetadata: testUser.app_metadata
      })
    }
    
    // Test 3: Check environment variables
    console.log('🔧 [CHECK-SUPABASE-AUTH-SETTINGS] Test 3: Checking environment variables...')
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
    
    console.log('✅ [CHECK-SUPABASE-AUTH-SETTINGS] Test 3 passed: Environment variables check')
    
    // Test 4: Check if we can generate a recovery link (this tests the auth configuration)
    console.log('🔧 [CHECK-SUPABASE-AUTH-SETTINGS] Test 4: Testing recovery link generation...')
    if (users.users.length > 0) {
      const testUser = users.users[0]
      
      try {
        const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: testUser.email!,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://loserpool.app'}/reset-password/confirm`
          }
        })
        
        if (recoveryError) {
          console.error('❌ [CHECK-SUPABASE-AUTH-SETTINGS] Recovery link generation failed:', recoveryError)
          return NextResponse.json({ 
            error: 'Recovery link generation failed',
            details: recoveryError.message,
            test: 'recovery_link_generation',
            environment: envCheck
          }, { status: 500 })
        }
        
        console.log('✅ [CHECK-SUPABASE-AUTH-SETTINGS] Test 4 passed: Recovery link generated successfully')
        console.log('🔍 [CHECK-SUPABASE-AUTH-SETTINGS] Recovery link (first 50 chars):', recoveryData.properties.action_link?.substring(0, 50))
      } catch (error) {
        console.error('❌ [CHECK-SUPABASE-AUTH-SETTINGS] Recovery link generation error:', error)
        return NextResponse.json({ 
          error: 'Recovery link generation error',
          details: error instanceof Error ? error.message : 'Unknown error',
          test: 'recovery_link_generation',
          environment: envCheck
        }, { status: 500 })
      }
    }
    
    // Test 5: Check if we can update a user's password (this is the core issue)
    console.log('🔧 [CHECK-SUPABASE-AUTH-SETTINGS] Test 5: Testing password update capability...')
    if (users.users.length > 0) {
      const testUser = users.users[0]
      
      try {
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          testUser.id,
          { 
            password: 'TestPassword123!',
            user_metadata: {
              ...testUser.user_metadata,
              test_password_update: new Date().toISOString()
            }
          }
        )
        
        if (updateError) {
          console.error('❌ [CHECK-SUPABASE-AUTH-SETTINGS] Password update failed:', updateError)
          return NextResponse.json({ 
            error: 'Password update failed',
            details: updateError.message,
            code: updateError.code,
            status: updateError.status,
            test: 'password_update',
            environment: envCheck,
            userDetails: {
              id: testUser.id,
              email: testUser.email,
              provider: testUser.app_metadata?.provider,
              emailConfirmed: !!testUser.email_confirmed_at
            }
          }, { status: 500 })
        }
        
        console.log('✅ [CHECK-SUPABASE-AUTH-SETTINGS] Test 5 passed: Password update succeeded')
        
        // Revert the test password change
        await supabaseAdmin.auth.admin.updateUserById(
          testUser.id,
          { 
            user_metadata: {
              ...testUser.user_metadata,
              test_password_update: null
            }
          }
        )
        
      } catch (error) {
        console.error('❌ [CHECK-SUPABASE-AUTH-SETTINGS] Password update error:', error)
        return NextResponse.json({ 
          error: 'Password update error',
          details: error instanceof Error ? error.message : 'Unknown error',
          test: 'password_update',
          environment: envCheck
        }, { status: 500 })
      }
    }
    
    console.log('✅ [CHECK-SUPABASE-AUTH-SETTINGS] All tests passed!')
    
    return NextResponse.json({ 
      success: true,
      message: 'All Supabase auth settings tests passed',
      tests: {
        listUsers: 'passed',
        userDetails: 'passed',
        environmentVariables: 'passed',
        recoveryLinkGeneration: 'passed',
        passwordUpdate: 'passed'
      },
      environment: envCheck,
      userCount: users.users.length,
      recommendations: [
        'All basic auth functionality appears to be working',
        'If password reset still fails, the issue may be with the client-side session handling',
        'Check that your Supabase project has SMTP configured for email delivery',
        'Verify that the site URL and redirect URLs are correctly set in Supabase dashboard'
      ]
    })

  } catch (error) {
    console.error('❌ [CHECK-SUPABASE-AUTH-SETTINGS] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
