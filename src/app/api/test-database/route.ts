import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Generate a proper UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  }

  try {
    const supabase = await createServerSupabaseClient()

    // Test 1: Check if public.users table exists and is accessible
    try {
      const { data: publicUsers, error: publicError } = await supabase
        .from('users')
        .select('*')
        .limit(1)
      
      results.tests.publicUsersTable = {
        success: !publicError,
        error: publicError?.message,
        hasData: !!publicUsers && publicUsers.length > 0,
        count: publicUsers?.length || 0,
        columns: publicUsers && publicUsers.length > 0 ? Object.keys(publicUsers[0]) : []
      }
    } catch (error) {
      results.tests.publicUsersTable = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 2: Check RLS policies with service role (bypasses RLS)
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

      const testUserId = generateUUID()
      const { data: insertData, error: insertError } = await serviceClient
        .from('users')
        .insert({
          id: testUserId,
          email: 'test@example.com',
          username: 'testuser',
          is_admin: false,
          invited_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          first_name: 'Test',
          last_name: 'User',
          phone: null,
          needs_password_change: false,
          user_type: 'pending',
          default_week: 1
        })
        .select()
      
      results.tests.serviceRoleInsert = {
        success: !insertError,
        error: insertError?.message,
        data: insertData
      }

      // Clean up test user if it was created
      if (!insertError && insertData) {
        await serviceClient.from('users').delete().eq('id', testUserId)
      }
    } catch (error) {
      results.tests.serviceRoleInsert = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 3: Try to insert with minimal required fields only (with RLS)
    try {
      const testUserId2 = generateUUID()
      const { data: insertData2, error: insertError2 } = await supabase
        .from('users')
        .insert({
          id: testUserId2,
          email: 'test2@example.com'
        })
        .select()
      
      results.tests.userInsertMinimal = {
        success: !insertError2,
        error: insertError2?.message,
        data: insertData2
      }

      // Clean up test user if it was created
      if (!insertError2 && insertData2) {
        await supabase.from('users').delete().eq('id', testUserId2)
      }
    } catch (error) {
      results.tests.userInsertMinimal = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 4: Check if there are any database triggers or constraints
    try {
      const { data: constraints, error: constraintError } = await supabase
        .from('users')
        .select('id')
        .eq('id', generateUUID()) // Use a proper UUID for non-existent test
      
      results.tests.constraints = {
        success: !constraintError,
        error: constraintError?.message
      }
    } catch (error) {
      results.tests.constraints = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 5: Check database connection with service role
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

      const { data: serviceData, error: serviceError } = await serviceClient
        .from('users')
        .select('id, email')
        .limit(1)
      
      results.tests.serviceRole = {
        success: !serviceError,
        error: serviceError?.message,
        hasData: !!serviceData && serviceData.length > 0
      }
    } catch (error) {
      results.tests.serviceRole = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(results, { status: 500 })
  }
}
