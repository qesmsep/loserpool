'use client'

import { useState, useEffect } from 'react'
import { Clock, MapPin } from 'lucide-react'

interface PickHistoryTableProps {
  pickId: string
}

interface SeasonData {
  id: string
  pick_name: string
  pre1_matchup_id?: string
  pre1_team_picked?: string
  pre1_status?: string
  pre2_matchup_id?: string
  pre2_team_picked?: string
  pre2_status?: string
  reg1_matchup_id?: string
  reg1_team_picked?: string
  reg1_status?: string
  reg2_matchup_id?: string
  reg2_team_picked?: string
  reg2_status?: string
  post1_matchup_id?: string
  post1_team_picked?: string
  post1_status?: string
  post2_matchup_id?: string
  post2_team_picked?: string
  post2_status?: string
}

interface MatchupDetails {
  [key: string]: {
    id: string
    away_team: string
    home_team: string
    game_time: string
    season: string
    week: number
  }
}

export default function PickHistoryTable({ pickId }: PickHistoryTableProps) {
  const [pickHistory, setPickHistory] = useState<SeasonData | null>(null)
  const [matchupDetails, setMatchupDetails] = useState<MatchupDetails>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPickHistory()
  }, [pickId])

  const fetchPickHistory = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`/api/picks/history-season/${pickId}`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setPickHistory(data.pickHistory)
        setMatchupDetails(data.matchupDetails)
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

  const formatGameTime = (gameTime: string) => {
    const date = new Date(gameTime)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'eliminated':
        return 'text-red-600 bg-red-100'
      case 'safe':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const renderSeasonCell = (
    matchupId?: string,
    teamPicked?: string,
    status?: string
  ) => {
    if (!matchupId || !teamPicked) {
      return (
        <div className="text-gray-400 text-sm">
          No pick
        </div>
      )
    }

    const matchup = matchupDetails[matchupId]
    if (!matchup) {
      return (
        <div className="text-red-400 text-sm">
          Matchup not found
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {/* Team picked */}
        <div className="font-semibold text-sm">
          {teamPicked}
        </div>
        
        {/* Game info */}
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatGameTime(matchup.game_time)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span>
              {matchup.season && matchup.season.startsWith('POST') ? (
                (() => {
                  const postWeek = matchup.week - 18
                  const postWeekNames: Record<number, string> = {
                    1: 'Wild Card',
                    2: 'Divisional',
                    3: 'Conference',
                    4: 'Super Bowl'
                  }
                  return postWeekNames[postWeek] || `Post Season Week ${postWeek}`
                })()
              ) : matchup.season && matchup.season.startsWith('PRE') ? (
                `Preseason Week ${matchup.season.replace('PRE', '')}`
              ) : (
                `Week ${matchup.week}`
              )}
            </span>
          </div>
          <div>
            {matchup.away_team} @ {matchup.home_team}
          </div>
        </div>
        
        {/* Status */}
        {status && (
          <div className={`text-xs px-2 py-1 rounded-full inline-block ${getStatusColor(status)}`}>
            {status}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading pick history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (!pickHistory) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No pick history found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Pick History: {pickHistory.pick_name}
        </h3>
        <p className="text-sm text-gray-600">
          Track this pick&apos;s journey through all seasons
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Season
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pick Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                PRE1
              </td>
              <td className="px-6 py-4">
                {renderSeasonCell(
                  pickHistory.pre1_matchup_id,
                  pickHistory.pre1_team_picked,
                  pickHistory.pre1_status
                )}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                PRE2
              </td>
              <td className="px-6 py-4">
                {renderSeasonCell(
                  pickHistory.pre2_matchup_id,
                  pickHistory.pre2_team_picked,
                  pickHistory.pre2_status
                )}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                REG1
              </td>
              <td className="px-6 py-4">
                {renderSeasonCell(
                  pickHistory.reg1_matchup_id,
                  pickHistory.reg1_team_picked,
                  pickHistory.reg1_status
                )}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                REG2
              </td>
              <td className="px-6 py-4">
                {renderSeasonCell(
                  pickHistory.reg2_matchup_id,
                  pickHistory.reg2_team_picked,
                  pickHistory.reg2_status
                )}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                POST1
              </td>
              <td className="px-6 py-4">
                {renderSeasonCell(
                  pickHistory.post1_matchup_id,
                  pickHistory.post1_team_picked,
                  pickHistory.post1_status
                )}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                POST2
              </td>
              <td className="px-6 py-4">
                {renderSeasonCell(
                  pickHistory.post2_matchup_id,
                  pickHistory.post2_team_picked,
                  pickHistory.post2_status
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
