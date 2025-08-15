'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPicksPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [picks, setPicks] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkAuthAndLoadPicks()
  }, [])

  const checkAuthAndLoadPicks = async () => {
    try {
      setLoading(true)
      setError('')

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        setError(`Auth error: ${authError.message}`)
        setLoading(false)
        return
      }

      if (!user) {
        setError('No authenticated user found')
        setLoading(false)
        return
      }

      setUser(user)

      // Check if pick_name column exists by trying to select it
      const { data: picksData, error: picksError } = await supabase
        .from('picks')
        .select('id, user_id, pick_name, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (picksError) {
        setError(`Picks error: ${picksError.message}`)
        setLoading(false)
        return
      }

      setPicks(picksData || [])
      setLoading(false)

    } catch (err) {
      setError(`Unexpected error: ${err}`)
      setLoading(false)
    }
  }

  const clearCookies = async () => {
    try {
      await supabase.auth.signOut()
      setError('Signed out - please refresh the page')
    } catch (err) {
      setError(`Sign out error: ${err}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Test Picks Page</h1>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">User Info</h2>
          {user ? (
            <div>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>ID:</strong> {user.id}</p>
              <button
                onClick={clearCookies}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Clear Cookies & Sign Out
              </button>
            </div>
          ) : (
            <p>No user found</p>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Picks Data</h2>
          {picks.length === 0 ? (
            <p>No picks found</p>
          ) : (
            <div>
              <p><strong>Total picks:</strong> {picks.length}</p>
              <div className="mt-4 space-y-2">
                {picks.map((pick) => (
                  <div key={pick.id} className="bg-gray-700 p-3 rounded">
                    <p><strong>ID:</strong> {pick.id}</p>
                    <p><strong>Name:</strong> {pick.pick_name || 'NULL'}</p>
                    <p><strong>Status:</strong> {pick.status}</p>
                    <p><strong>Created:</strong> {new Date(pick.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={checkAuthAndLoadPicks}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Refresh Data
        </button>
      </div>
    </div>
  )
}
