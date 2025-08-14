'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Trophy, X } from 'lucide-react'
import Link from 'next/link'

interface PickHistoryEntry {
  id: string
  week: number
  matchup_id: string | null
  team_picked: string | null
  pick_name: string | null
  status: string
  created_at: string
  matchup_away_team: string | null
  matchup_home_team: string | null
  game_time: string | null
}

export default function PickHistoryPage() {
  const params = useParams()
  const pickId = params.pickId as string
  
  const [pickHistory, setPickHistory] = useState<PickHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (pickId) {
      fetchPickHistory()
    }
  }, [pickId])

  const fetchPickHistory = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`/api/picks/history/${pickId}`)
      const data = await response.json()
      
      if (data.success) {
        setPickHistory(data.pickHistory || [])
      } else {
        setError(data.error || 'Failed to fetch pick history')
      }
    } catch (error) {
      console.error('Error fetching pick history:', error)
      setError('Failed to fetch pick history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <div className="w-3 h-3 bg-green-500 rounded-full" />
      case 'eliminated':
        return <X className="w-4 h-4 text-red-500" />
      case 'safe':
        return <Trophy className="w-4 h-4 text-yellow-500" />
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'eliminated':
        return 'Eliminated'
      case 'safe':
        return 'Survived'
      default:
        return status
    }
  }

  const formatGameTime = (gameTime: string) => {
    return new Date(gameTime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-400 mt-2">Loading pick history...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (pickHistory.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">No pick history found</p>
            <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const currentPick = pickHistory[pickHistory.length - 1]
  const pickName = currentPick.pick_name || 'Unnamed Pick'

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Pick History</h1>
              <p className="text-gray-400">{pickName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Total Weeks</p>
            <p className="text-xl font-bold">{pickHistory.length}</p>
          </div>
        </div>

        {/* Pick Journey */}
        <div className="space-y-4">
          {pickHistory.map((entry, index) => (
            <div
              key={`${entry.id}-${entry.week}`}
              className="bg-white/5 border border-white/10 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(entry.status)}
                    <span className="font-semibold text-lg">Week {entry.week}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    entry.status === 'active' ? 'bg-green-500/20 text-green-300' :
                    entry.status === 'eliminated' ? 'bg-red-500/20 text-red-300' :
                    entry.status === 'safe' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {getStatusText(entry.status)}
                  </span>
                </div>
                <div className="text-right text-sm text-gray-400">
                  {entry.created_at && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {entry.matchup_id && entry.matchup_away_team && entry.matchup_home_team ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">
                        {entry.matchup_away_team} @ {entry.matchup_home_team}
                      </span>
                    </div>
                    {entry.game_time && (
                      <span className="text-sm text-gray-400">
                        {formatGameTime(entry.game_time)}
                      </span>
                    )}
                  </div>
                  
                  {entry.team_picked && (
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded p-3">
                      <p className="text-sm text-gray-300 mb-1">Picked to lose:</p>
                      <p className="font-semibold text-blue-300">{entry.team_picked}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 text-sm">
                  No matchup assigned
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
