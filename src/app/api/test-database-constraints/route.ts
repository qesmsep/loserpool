import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  }

  try {
    const supabase = await createServerSupabaseClient()

    // Test 1: Check table structure and constraints
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('users')
        .select('*')
        .limit(0)
      
      results.tests.tableStructure = {
        success: !tableError,
        error: tableError?.message,
        columns: tableInfo ? Object.keys(tableInfo[0] || {}) : []
      }
    } catch (error) {
      results.tests.tableStructure = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 2: Check existing user_type values
    try {
      const { data: userTypes, error: userTypeError } = await supabase
        .from('users')
        .select('user_type')
        .not('user_type', 'is', null)
      
      results.tests.existingUserTypes = {
        success: !userTypeError,
        error: userTypeError?.message,
        values: userTypes ? [...new Set(userTypes.map(u => u.user_type))] : []
      }
    } catch (error) {
      results.tests.existingUserTypes = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 3: Try different user_type values
    const testUserTypes = ['pending', 'active', 'tester', 'eliminated', 'admin', 'user']
    
    results.tests.userTypeTests = {}
    
    for (const userType of testUserTypes) {
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

        const testUserId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

        const { data: insertData, error: insertError } = await serviceClient
          .from('users')
          .insert({
            id: testUserId,
            email: `test-${Date.now()}@example.com`,
            user_type: userType,
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()

        results.tests.userTypeTests[userType] = {
          success: !insertError,
          error: insertError?.message,
          data: insertData
        }

        // Clean up if successful
        if (!insertError && insertData) {
          await serviceClient.from('users').delete().eq('id', testUserId)
        }
      } catch (error) {
        results.tests.userTypeTests[userType] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Test 4: Check if user_type is required
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

      const testUserId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      const { data: insertData, error: insertError } = await serviceClient
        .from('users')
        .insert({
          id: testUserId,
          email: `test-${Date.now()}@example.com`,
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      results.tests.noUserType = {
        success: !insertError,
        error: insertError?.message,
        data: insertData
      }

      // Clean up if successful
      if (!insertError && insertData) {
        await serviceClient.from('users').delete().eq('id', testUserId)
      }
    } catch (error) {
      results.tests.noUserType = {
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
