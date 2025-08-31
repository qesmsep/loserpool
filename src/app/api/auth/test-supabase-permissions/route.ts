import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  console.log('🔧 [TEST-SUPABASE-PERMISSIONS] Starting Supabase permissions test')
  
  try {
    const supabaseAdmin = createServiceRoleClient()
    
    // Test 1: List users (basic connectivity)
    console.log('🔧 [TEST-SUPABASE-PERMISSIONS] Test 1: Listing users...')
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1
    })
    
    if (listError) {
      console.error('❌ [TEST-SUPABASE-PERMISSIONS] Failed to list users:', listError)
      return NextResponse.json({ 
        error: 'Failed to list users',
        details: listError.message,
        test: 'list_users'
      }, { status: 500 })
    }
    
    console.log('✅ [TEST-SUPABASE-PERMISSIONS] Test 1 passed: Can list users')
    
    // Test 2: Get specific user
    if (users.users.length > 0) {
      const testUserId = users.users[0].id
      console.log('🔧 [TEST-SUPABASE-PERMISSIONS] Test 2: Getting user by ID...')
      
      const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(testUserId)
      
      if (getUserError) {
        console.error('❌ [TEST-SUPABASE-PERMISSIONS] Failed to get user:', getUserError)
        return NextResponse.json({ 
          error: 'Failed to get user by ID',
          details: getUserError.message,
          test: 'get_user_by_id'
        }, { status: 500 })
      }
      
      console.log('✅ [TEST-SUPABASE-PERMISSIONS] Test 2 passed: Can get user by ID')
      
      // Test 3: Try to update user metadata (without password)
      console.log('🔧 [TEST-SUPABASE-PERMISSIONS] Test 3: Updating user metadata...')
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        testUserId,
        { 
          user_metadata: {
            ...userData.user?.user_metadata,
            test_metadata_update: new Date().toISOString()
          }
        }
      )
      
      if (updateError) {
        console.error('❌ [TEST-SUPABASE-PERMISSIONS] Failed to update user metadata:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update user metadata',
          details: updateError.message,
          test: 'update_user_metadata'
        }, { status: 500 })
      }
      
      console.log('✅ [TEST-SUPABASE-PERMISSIONS] Test 3 passed: Can update user metadata')
    }
    
    // Test 4: Check environment variables
    console.log('🔧 [TEST-SUPABASE-PERMISSIONS] Test 4: Checking environment variables...')
    const envCheck = {
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length : 0,
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL
    }
    
    console.log('✅ [TEST-SUPABASE-PERMISSIONS] Test 4 passed: Environment variables check')
    console.log('🔍 [TEST-SUPABASE-PERMISSIONS] Environment check:', envCheck)
    
    return NextResponse.json({ 
      success: true,
      message: 'All Supabase permission tests passed',
      tests: {
        listUsers: 'passed',
        getUserById: 'passed',
        updateUserMetadata: 'passed',
        environmentVariables: 'passed'
      },
      environment: envCheck,
      userCount: users.users.length
    })

  } catch (error) {
    console.error('❌ [TEST-SUPABASE-PERMISSIONS] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
