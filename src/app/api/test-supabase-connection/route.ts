import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    },
    tests: {}
  }

  try {
    // Test 1: Create Supabase client
    const supabase = await createServerSupabaseClient()
    results.tests.clientCreation = { success: true }

    // Test 2: Test basic connection
    try {
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true })
      results.tests.databaseConnection = {
        success: !error,
        error: error?.message,
        count: data
      }
    } catch (dbError) {
      results.tests.databaseConnection = {
        success: false,
        error: dbError instanceof Error ? dbError.message : 'Unknown error'
      }
    }

    // Test 3: Test auth session
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      results.tests.authSession = {
        success: !sessionError,
        error: sessionError?.message,
        hasSession: !!session
      }
    } catch (authError) {
      results.tests.authSession = {
        success: false,
        error: authError instanceof Error ? authError.message : 'Unknown error'
      }
    }

    // Test 4: Test auth user
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      results.tests.authUser = {
        success: !userError,
        error: userError?.message,
        hasUser: !!user
      }
    } catch (userError) {
      results.tests.authUser = {
        success: false,
        error: userError instanceof Error ? userError.message : 'Unknown error'
      }
    }

    // Test 5: Test signup endpoint with different redirect URLs
    const redirectUrls = [
      'https://loserpool.vercel.app/api/auth/confirm-email',
      'https://loserpool.vercel.app/dashboard',
      'http://localhost:3000/api/auth/confirm-email',
      'https://example.com/callback'
    ]

    results.tests.signupEndpoints = {}

    for (const redirectUrl of redirectUrls) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'testpassword123',
            options: {
              emailRedirectTo: redirectUrl
            }
          })
        })
        
        const responseText = await response.text()
        
        results.tests.signupEndpoints[redirectUrl] = {
          status: response.status,
          statusText: response.statusText,
          success: response.status < 500,
          error: response.status >= 500 ? `HTTP ${response.status}` : null,
          response: responseText.substring(0, 200) // First 200 chars of response
        }
      } catch (signupError) {
        results.tests.signupEndpoints[redirectUrl] = {
          success: false,
          error: signupError instanceof Error ? signupError.message : 'Unknown error'
        }
      }
    }

    // Test 6: Test direct Supabase signup
    try {
              const { data, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123',
        options: {
          emailRedirectTo: 'https://loserpool.vercel.app/api/auth/confirm-email'
        }
      })
      
      results.tests.directSignup = {
        success: !error,
        error: error?.message,
        hasUser: !!data.user,
        userEmail: data.user?.email
      }
    } catch (directError) {
      results.tests.directSignup = {
        success: false,
        error: directError instanceof Error ? directError.message : 'Unknown error'
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(results, { status: 500 })
  }
}
