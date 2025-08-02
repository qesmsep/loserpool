'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestLoginPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testLogin = async () => {
    setLoading(true)
    setResult(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'tim@828.life',
        password: 'password123' // You'll need to provide the actual password
      })

      setResult({ data, error })
    } catch (err) {
      setResult({ error: err })
    } finally {
      setLoading(false)
    }
  }

  const checkSession = async () => {
    setLoading(true)
    setResult(null)

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      setResult({ session: !!session, error })
    } catch (err) {
      setResult({ error: err })
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    setResult(null)

    try {
      const { error } = await supabase.auth.signOut()
      setResult({ error })
    } catch (err) {
      setResult({ error: err })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Test Login</h1>
        
        <div className="space-y-4 mb-6">
          <button
            onClick={testLogin}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Test Login (tim@828.life)
          </button>
          
          <button
            onClick={checkSession}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 ml-2"
          >
            Check Session
          </button>
          
          <button
            onClick={signOut}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50 ml-2"
          >
            Sign Out
          </button>
        </div>
        
        {result && (
          <div className="bg-gray-50 p-4 rounded">
            <h2 className="font-semibold mb-2">Result:</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="mt-6">
          <p className="text-sm text-gray-600">
            Note: You'll need to provide the actual password for the user tim@828.life
          </p>
        </div>
      </div>
    </div>
  )
} 