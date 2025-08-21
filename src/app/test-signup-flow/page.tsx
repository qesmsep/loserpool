'use client'

import { useState } from 'react'

export default function TestSignupFlowPage() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('testpassword123')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-signup-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setResult({
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Comprehensive Signup Flow Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Parameters</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <button
              onClick={runTest}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Running Test...' : 'Run Comprehensive Test'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">What This Test Does</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p>1. <strong>Current Auth State:</strong> Checks if there&apos;s an existing session/user</p>
            <p>2. <strong>Supabase Signup:</strong> Attempts to create a new user via Supabase auth</p>
            <p>3. <strong>Database Insert:</strong> Tries to insert the user into the users table</p>
            <p>4. <strong>Service Role Test:</strong> Tests insertion with admin privileges (bypasses RLS)</p>
            <p>5. <strong>RLS Policies:</strong> Checks the current RLS policy configuration</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-y-2">
            <a href="/api/test-database" className="block text-blue-600 hover:text-blue-500">
              Test Database Connection
            </a>
            <a href="/test-signup" className="block text-blue-600 hover:text-blue-500">
              Simple Signup Test
            </a>
            <a href="/debug-auth" className="block text-blue-600 hover:text-blue-500">
              Debug Auth Page
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
