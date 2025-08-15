'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugAdminPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  const testAddPicks = async () => {
    try {
      setLoading(true)
      setError('')
      setResult('')

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('No authenticated user')
        return
      }

      // Test the admin add-picks API
      const response = await fetch('/api/admin/add-picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id, 
          picksCount: 2 
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        setError(`API Error: ${data.error}`)
        return
      }

      setResult(JSON.stringify(data, null, 2))

      // Check if picks were actually created
      const { data: picks, error: picksError } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (picksError) {
        setError(`Error checking picks: ${picksError.message}`)
        return
      }

      setResult(prev => prev + '\n\nPicks in database:\n' + JSON.stringify(picks, null, 2))

    } catch (err) {
      setError(`Unexpected error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Admin Add Picks</h1>
      
      <button
        onClick={testAddPicks}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-6"
      >
        {loading ? 'Testing...' : 'Test Add Picks API'}
      </button>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-6">
          <h3 className="font-semibold">Error:</h3>
          <pre className="mt-2 text-sm">{error}</pre>
        </div>
      )}

      {result && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-200 px-4 py-3 rounded-lg">
          <h3 className="font-semibold">Result:</h3>
          <pre className="mt-2 text-sm overflow-auto">{result}</pre>
        </div>
      )}
    </div>
  )
}
