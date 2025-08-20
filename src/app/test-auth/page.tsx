'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'

export default function TestAuthPage() {
  const { user, loading } = useAuth()
  const [testResults, setTestResults] = useState<any>({})
  const [testing, setTesting] = useState(false)

  const runTests = async () => {
    setTesting(true)
    const results: any = {}

    try {
      // Test 1: Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      results.session = {
        hasSession: !!session,
        error: sessionError?.message,
        expiresAt: session?.expires_at,
        expiresIn: session?.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) : null
      }

      // Test 2: Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      results.user = {
        hasUser: !!user,
        error: userError?.message,
        email: user?.email
      }

      // Test 3: Test session refresh
      if (session) {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
        results.refresh = {
          success: !!refreshedSession,
          error: refreshError?.message
        }
      }

      // Test 4: Test sign out
      const { error: signOutError } = await supabase.auth.signOut()
      results.signOut = {
        success: !signOutError,
        error: signOutError?.message
      }

      // Test 5: Test sign in (if we have credentials)
      if (user?.email) {
        // This is just a test - we won't actually sign in
        results.signIn = {
          note: 'Would attempt sign in with existing user'
        }
      }

    } catch (error) {
      results.error = error instanceof Error ? error.message : 'Unknown error'
    }

    setTestResults(results)
    setTesting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Current State</h2>
          <div className="space-y-2">
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            <p><strong>User:</strong> {user ? user.email : 'None'}</p>
            <p><strong>User ID:</strong> {user?.id || 'None'}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Run Tests</h2>
          <button
            onClick={runTests}
            disabled={testing}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {testing ? 'Running Tests...' : 'Run Authentication Tests'}
          </button>
        </div>

        {Object.keys(testResults).length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => supabase.auth.signOut()}
              className="block w-full text-left text-blue-600 hover:text-blue-500"
            >
              Sign Out
            </button>
            <a href="/login" className="block text-blue-600 hover:text-blue-500">
              Go to Login
            </a>
            <a href="/signup" className="block text-blue-600 hover:text-blue-500">
              Go to Signup
            </a>
            <a href="/debug-auth" className="block text-blue-600 hover:text-blue-500">
              Debug Auth Page
            </a>
            <a href="/api/test-supabase-connection" className="block text-blue-600 hover:text-blue-500">
              Test Supabase Connection
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
