'use client'

import { useState, useEffect } from 'react'
import { Gauge } from 'lucide-react'

export default function RemainingPicksCard() {
  const [remainingPicks, setRemainingPicks] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRemainingPicks = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/remaining-picks')
        
        if (!response.ok) {
          throw new Error('Failed to fetch remaining picks')
        }
        
        const data = await response.json()
        setRemainingPicks(data.remainingPicks)
      } catch (err) {
        console.error('Error fetching remaining picks:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchRemainingPicks()
  }, [])

  return (
    <div className="bg-indigo-500/20 border border-indigo-400/40 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-2 sm:space-x-3">
          <div className="bg-indigo-500/30 border border-indigo-300/40 p-2 rounded-full">
            <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-100" />
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-bold text-white">Remaining Picks</p>
            <p className={`text-xs sm:text-sm ${
              error ? 'text-red-200' : 'text-indigo-100 opacity-80'
            }`}>
              {error ?? 'Live count of picks still alive this week'}
            </p>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <p className="text-sm sm:text-base text-indigo-100 opacity-80">Loading…</p>
          ) : error ? (
            <p className="text-sm sm:text-base text-red-200 font-semibold">—</p>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {remainingPicks !== null ? remainingPicks.toLocaleString() : '—'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
