'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function TestAuthContent() {
  const [status, setStatus] = useState('Loading...')
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setError(`Session error: ${sessionError.message}`)
          setStatus('Error')
          return
        }

        if (session) {
          setUser(session.user)
          setStatus('Authenticated')
        } else {
          setStatus('Not authenticated')
        }

        // Check URL parameters
        const code = searchParams.get('code')
        const errorParam = searchParams.get('error')
        const errorCode = searchParams.get('error_code')
        const errorDescription = searchParams.get('error_description')

        if (code) {
          setStatus(`Found code: ${code.substring(0, 20)}...`)
          
          // Try to exchange code for session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            setError(`Code exchange error: ${error.message}`)
            setStatus('Code exchange failed')
          } else {
            setUser(data.user)
            setStatus('Code exchanged successfully!')
          }
        }

        if (errorParam) {
          setError(`URL error: ${errorParam} - ${errorCode} - ${errorDescription}`)
          setStatus('URL error detected')
        }

      } catch (err) {
        setError(`Exception: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setStatus('Exception occurred')
      }
    }

    checkAuth()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded">
            <h2 className="font-semibold">Status: {status}</h2>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="font-semibold text-red-800">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {user && (
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-semibold text-green-800">User Info:</h3>
              <pre className="text-sm text-green-700 overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          )}

          <div className="p-4 bg-gray-50 border border-gray-200 rounded">
            <h3 className="font-semibold">URL Parameters:</h3>
            <ul className="text-sm">
              <li>code: {searchParams.get('code') || 'none'}</li>
              <li>error: {searchParams.get('error') || 'none'}</li>
              <li>error_code: {searchParams.get('error_code') || 'none'}</li>
              <li>error_description: {searchParams.get('error_description') || 'none'}</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Go to Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TestAuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TestAuthContent />
    </Suspense>
  )
}
