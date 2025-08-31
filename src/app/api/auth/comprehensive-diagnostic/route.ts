import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  console.log('🔧 [COMPREHENSIVE-DIAGNOSTIC] Starting comprehensive diagnostic')
  
  try {
    const supabaseAdmin = createServiceRoleClient()
    
    // Test 1: Basic connectivity and user listing
    console.log('🔧 [COMPREHENSIVE-DIAGNOSTIC] Test 1: Basic connectivity...')
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000
    })
    
    if (listError) {
      return NextResponse.json({ 
        error: 'Failed to list users',
        details: listError.message,
        test: 'basic_connectivity'
      }, { status: 500 })
    }
    
    console.log('✅ [COMPREHENSIVE-DIAGNOSTIC] Test 1 passed: Basic connectivity')
    
    // Test 2: Find specific user
    console.log('🔧 [COMPREHENSIVE-DIAGNOSTIC] Test 2: Finding specific user...')
    const targetUser = users.users.find(u => u.email === 'tim.wirick@gmail.com')
    
    if (!targetUser) {
      return NextResponse.json({ 
        error: 'Target user not found',
        details: 'User tim.wirick@gmail.com not found in the system',
        availableUsers: users.users.map(u => ({ email: u.email, id: u.id })).slice(0, 5)
      }, { status: 404 })
    }
    
    console.log('✅ [COMPREHENSIVE-DIAGNOSTIC] Test 2 passed: User found')
    
    // Test 3: Check user details
    console.log('🔧 [COMPREHENSIVE-DIAGNOSTIC] Test 3: Checking user details...')
    const userDetails = {
      id: targetUser.id,
      email: targetUser.email,
      emailConfirmed: !!targetUser.email_confirmed_at,
      provider: targetUser.app_metadata?.provider,
      createdAt: targetUser.created_at,
      lastSignIn: targetUser.last_sign_in_at,
      userMetadata: targetUser.user_metadata,
      appMetadata: targetUser.app_metadata
    }
    
    console.log('✅ [COMPREHENSIVE-DIAGNOSTIC] Test 3 passed: User details retrieved')
    
    // Test 4: Try to update user metadata (this tests basic update permissions)
    console.log('🔧 [COMPREHENSIVE-DIAGNOSTIC] Test 4: Testing metadata update...')
    try {
      const { data: metadataUpdateData, error: metadataUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.id,
        { 
          user_metadata: {
            ...targetUser.user_metadata,
            diagnostic_test: new Date().toISOString()
          }
        }
      )
      
      if (metadataUpdateError) {
        console.error('❌ [COMPREHENSIVE-DIAGNOSTIC] Metadata update failed:', metadataUpdateError)
        return NextResponse.json({ 
          error: 'Metadata update failed',
          details: metadataUpdateError.message,
          code: metadataUpdateError.code,
          status: metadataUpdateError.status,
          test: 'metadata_update',
          userDetails
        }, { status: 500 })
      }
      
      console.log('✅ [COMPREHENSIVE-DIAGNOSTIC] Test 4 passed: Metadata update succeeded')
      
    } catch (error) {
      console.error('❌ [COMPREHENSIVE-DIAGNOSTIC] Metadata update error:', error)
      return NextResponse.json({ 
        error: 'Metadata update error',
        details: error instanceof Error ? error.message : 'Unknown error',
        test: 'metadata_update',
        userDetails
      }, { status: 500 })
    }
    
    // Test 5: Try password update with different approaches
    console.log('🔧 [COMPREHENSIVE-DIAGNOSTIC] Test 5: Testing password update approaches...')
    
    const passwordUpdateTests = [
      {
        name: 'Simple password only',
        data: { password: 'TestPassword123!' }
      },
      {
        name: 'Password with app_metadata',
        data: { 
          password: 'TestPassword123!',
          app_metadata: {
            ...targetUser.app_metadata,
            password_updated_at: new Date().toISOString()
          }
        }
      },
      {
        name: 'Password with user_metadata',
        data: { 
          password: 'TestPassword123!',
          user_metadata: {
            ...targetUser.user_metadata,
            password_updated_at: new Date().toISOString()
          }
        }
      }
    ]
    
    const passwordUpdateResults = []
    
    for (const test of passwordUpdateTests) {
      try {
        console.log(`🔧 [COMPREHENSIVE-DIAGNOSTIC] Testing: ${test.name}`)
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          targetUser.id,
          test.data
        )
        
        if (updateError) {
          passwordUpdateResults.push({
            test: test.name,
            success: false,
            error: updateError.message,
            code: updateError.code,
            status: updateError.status
          })
          console.log(`❌ [COMPREHENSIVE-DIAGNOSTIC] ${test.name} failed:`, updateError.message)
        } else {
          passwordUpdateResults.push({
            test: test.name,
            success: true,
            message: 'Password updated successfully'
          })
          console.log(`✅ [COMPREHENSIVE-DIAGNOSTIC] ${test.name} succeeded`)
          break // Stop testing if one succeeds
        }
        
      } catch (error) {
        passwordUpdateResults.push({
          test: test.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.log(`❌ [COMPREHENSIVE-DIAGNOSTIC] ${test.name} error:`, error)
      }
    }
    
    // Test 6: Check environment variables
    console.log('🔧 [COMPREHENSIVE-DIAGNOSTIC] Test 6: Checking environment variables...')
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
    
    console.log('✅ [COMPREHENSIVE-DIAGNOSTIC] Test 6 passed: Environment variables check')
    
    // Determine if any password update succeeded
    const anyPasswordUpdateSucceeded = passwordUpdateResults.some(result => result.success)
    
    console.log('✅ [COMPREHENSIVE-DIAGNOSTIC] All tests completed')
    
    return NextResponse.json({ 
      success: anyPasswordUpdateSucceeded,
      message: anyPasswordUpdateSucceeded 
        ? 'At least one password update approach succeeded' 
        : 'All password update approaches failed',
      tests: {
        basicConnectivity: 'passed',
        findUser: 'passed',
        userDetails: 'passed',
        metadataUpdate: 'passed',
        passwordUpdate: anyPasswordUpdateSucceeded ? 'passed' : 'failed',
        environmentVariables: 'passed'
      },
      environment: envCheck,
      userDetails,
      passwordUpdateResults,
      recommendations: anyPasswordUpdateSucceeded ? [
        'Password update is working with at least one approach',
        'The automated password reset flow should work',
        'Check the client-side session handling'
      ] : [
        'All password update approaches failed',
        'This confirms a Supabase project configuration issue',
        'Check your Supabase project settings in the dashboard',
        'Verify that password updates are allowed for your project',
        'Check SMTP configuration in Authentication settings',
        'Contact Supabase support with error code: unexpected_failure'
      ]
    })
    
  } catch (error) {
    console.error('❌ [COMPREHENSIVE-DIAGNOSTIC] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
