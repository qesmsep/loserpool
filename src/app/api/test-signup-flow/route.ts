import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  }

  try {
    const { email, password } = await request.json()
    const supabase = await createServerSupabaseClient()

    // Test 1: Check current authentication state
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    results.tests.currentAuth = {
      hasSession: !!session,
      hasUser: !!user,
      sessionError: sessionError?.message,
      userError: userError?.message,
      userId: user?.id
    }

    // Test 2: Try signup with Supabase auth
    const signupOptions = {
      emailConfirm: false,
      data: {
        first_name: 'Test',
        last_name: 'User',
        user_type: 'registered',
        default_week: 1,
        needs_password_change: false
      }
    }
    
    console.log('Signup options:', JSON.stringify(signupOptions, null, 2))
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: signupOptions
    })

    results.tests.signup = {
      success: !signupError,
      error: signupError?.message,
      hasUser: !!signupData.user,
      hasSession: !!signupData.session,
      userId: signupData.user?.id,
      userData: signupData.user ? {
        id: signupData.user.id,
        email: signupData.user.email,
        user_metadata: signupData.user.user_metadata
      } : null
    }

    // Test 3: If signup succeeded, try to insert into users table
    if (signupData.user) {
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert({
            id: signupData.user.id,
            email: signupData.user.email,
            first_name: 'Test',
            last_name: 'User',
            user_type: 'registered',
            default_week: 1,
            needs_password_change: false,
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()

        results.tests.userInsert = {
          success: !insertError,
          error: insertError?.message,
          data: insertData
        }

        // Clean up if successful
        if (!insertError && insertData) {
          await supabase.from('users').delete().eq('id', signupData.user.id)
        }
      } catch (insertErr) {
        results.tests.userInsert = {
          success: false,
          error: insertErr instanceof Error ? insertErr.message : 'Unknown error'
        }
      }
    }

    // Test 4: Test with service role (bypasses RLS)
    try {
      const { createClient } = require('@supabase/supabase-js')
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      // Generate a proper UUID for testing
      const testUserId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      const { data: serviceData, error: serviceError } = await serviceClient
        .from('users')
        .insert({
          id: testUserId,
          email: `test-${Date.now()}@example.com`,
          first_name: 'Test',
          last_name: 'User',
          user_type: 'pending',
          default_week: 1,
          needs_password_change: false,
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      results.tests.serviceRoleInsert = {
        success: !serviceError,
        error: serviceError?.message,
        data: serviceData
      }

      // Clean up if successful
      if (!serviceError && serviceData) {
        await serviceClient.from('users').delete().eq('id', testUserId)
      }
    } catch (serviceErr) {
      results.tests.serviceRoleInsert = {
        success: false,
        error: serviceErr instanceof Error ? serviceErr.message : 'Unknown error'
      }
    }

    // Test 5: Check RLS policies
    try {
      const { data: policies, error: policyError } = await supabase
        .rpc('get_policies', { table_name: 'users' })
      
      results.tests.rlsPolicies = {
        success: !policyError,
        error: policyError?.message,
        policies: policies
      }
    } catch (policyErr) {
      results.tests.rlsPolicies = {
        success: false,
        error: policyErr instanceof Error ? policyErr.message : 'Unknown error'
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(results, { status: 500 })
  }
}
