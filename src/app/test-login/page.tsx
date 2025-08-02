'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestLoginPage() {
  const [email, setEmail] = useState('tim@828.life')
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testLogin = async () => {
    setLoading(true)
    setResult(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
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
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={testLogin}
            disabled={loading || !password}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Test Login
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
            Enter the password you used when creating the account for tim@828.life
          </p>
        </div>
      </div>
    </div>
  )
} 