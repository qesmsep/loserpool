'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PickNamesService } from '@/lib/pick-names-service'

export default function DebugPickNamesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    debugPickNames()
  }, [])

  const debugPickNames = async () => {
    try {
      setLoading(true)
      setError('')

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        setError(`Auth error: ${authError.message}`)
        setDebugInfo({ authError: authError.message })
        return
      }

      if (!user) {
        setError('No authenticated user found')
        setDebugInfo({ user: null })
        return
      }

      // Check if pick_names table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('pick_names')
        .select('count(*)')
        .limit(1)

      if (tableError) {
        setError(`Table error: ${tableError.message}`)
        setDebugInfo({ 
          user: user.email,
          tableError: tableError.message 
        })
        return
      }

      // Try to get pick names
      const pickNamesService = new PickNamesService()
      const pickNames = await pickNamesService.getUserPickNamesWithUsage()

      // Get user's purchases
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      setDebugInfo({
        user: user.email,
        userId: user.id,
        tableExists: true,
        pickNamesCount: pickNames.length,
        pickNames: pickNames,
        purchasesCount: purchases?.length || 0,
        purchases: purchases,
        purchasesError: purchasesError?.message
      })

    } catch (err) {
      setError(`Unexpected error: ${err}`)
      setDebugInfo({ unexpectedError: err })
    } finally {
      setLoading(false)
    }
  }

  const generateDefaultPickNames = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('No authenticated user')
        return
      }

      // Get total picks purchased
      const { data: purchases } = await supabase
        .from('purchases')
        .select('picks_count')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      const totalPicks = purchases?.reduce((sum, p) => sum + p.picks_count, 0) || 0

      // Call the function to generate default pick names
      const { error } = await supabase.rpc('generate_default_pick_names', {
        user_uuid: user.id,
        count: totalPicks
      })

      if (error) {
        setError(`Failed to generate pick names: ${error.message}`)
      } else {
        setError('Default pick names generated successfully!')
        debugPickNames() // Refresh the debug info
      }
    } catch (err) {
      setError(`Error generating pick names: ${err}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading debug info...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Pick Names Debug</h1>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <button
            onClick={generateDefaultPickNames}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-4"
          >
            Generate Default Pick Names
          </button>
          
          <button
            onClick={debugPickNames}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Refresh Debug Info
          </button>
        </div>
      </div>
    </div>
  )
}
