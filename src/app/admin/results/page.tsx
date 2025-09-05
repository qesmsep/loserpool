'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Trophy, TrendingUp, Target, Users } from 'lucide-react'

interface Pick {
  picks_count: number
  status: string
  team_picked: string
}

interface Matchup {
  id: number | string
  week: number
  season: string
  away_team: string
  home_team: string
  status: string
  game_time: string
  away_score: number | null
  home_score: number | null
  picks: Pick[]
  totalPicks: number
  activePicks: number
  eliminatedPicks: number
  winner: string | null
}

interface DefaultPickData {
  currentWeek: number
  defaultPick: {
    matchup_id: string
    away_team: string
    home_team: string
    favored_team: string
    spread_magnitude: number
    game_time: string
  } | null
  usersNeedingPicks: Array<{
    id: string
    email: string
    username: string
    name: string
    picksAvailable: number
  }>
  userCount: number
  totalPicksToAssign: number
  currentWeekMatchups: Array<{
    id: string
    away_team: string
    home_team: string
    away_spread: number | null
    home_spread: number | null
    game_time: string
    status: string
  }>
}

export default function AdminResultsPage() {
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [defaultPickData, setDefaultPickData] = useState<DefaultPickData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError('')
        
        // Get the current session token
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token
        
        if (!accessToken) {
          throw new Error('No session token available')
        }
        
        // Prepare headers with authorization
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
        
        // Load matchups and default pick data in parallel
        const [matchupsResponse, defaultPickResponse] = await Promise.all([
          fetch('/api/admin/results', {
            credentials: 'include',
            headers
          }),
          fetch('/api/admin/current-week-default-pick', {
            credentials: 'include',
            headers
          })
        ])
        
        if (!matchupsResponse.ok) {
          const errorData = await matchupsResponse.json()
          throw new Error(errorData.error || 'Failed to fetch matchups')
        }
        
        if (!defaultPickResponse.ok) {
          const errorData = await defaultPickResponse.json()
          console.error('Default pick API error:', errorData)
          // Don't throw error, just log it and continue without default pick data
        }
        
        const matchupsData = await matchupsResponse.json()
        setMatchups(matchupsData.matchups || [])
        
        // Only try to parse default pick data if the response was ok
        if (defaultPickResponse.ok) {
          const defaultPickData = await defaultPickResponse.json()
          setDefaultPickData(defaultPickData)
        } else {
          setDefaultPickData(null)
        }
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate stats for each matchup
  const matchupsWithStats = matchups?.map(matchup => {
    const matchupPicks = matchup.picks || []
    const totalPicks = matchupPicks.reduce((sum: number, p: Pick) => sum + p.picks_count, 0)
    const activePicks = matchupPicks
      .filter((p: Pick) => p.status === 'active')
      .reduce((sum: number, p: Pick) => sum + p.picks_count, 0)
    const eliminatedPicks = matchupPicks
      .filter((p: Pick) => p.status === 'eliminated')
      .reduce((sum: number, p: Pick) => sum + p.picks_count, 0)

    // Determine winner
    let winner = null
    if (matchup.away_score !== null && matchup.home_score !== null) {
      if (matchup.away_score > matchup.home_score) {
        winner = 'away'
      } else if (matchup.home_score > matchup.away_score) {
        winner = 'home'
      } else {
        winner = 'tie'
      }
    }

    return {
      ...matchup,
      totalPicks,
      activePicks,
      eliminatedPicks,
      winner
    }
  }) || []

  // Group by week
  const matchupsByWeek = matchupsWithStats.reduce((acc, matchup) => {
    if (!acc[matchup.week]) {
      acc[matchup.week] = []
    }
    acc[matchup.week].push(matchup)
    return acc
  }, {} as Record<number, typeof matchupsWithStats>)

  const totalMatchups = matchupsWithStats.length
  const completedMatchups = matchupsWithStats.filter(m => m.status === 'final').length
  const pendingMatchups = matchupsWithStats.filter(m => m.status === 'scheduled').length
  const liveMatchups = matchupsWithStats.filter(m => m.status === 'live').length

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-white text-lg">Loading matchups...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-red-400 text-lg">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="flex items-center text-blue-100 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Update Results</h1>
                <p className="text-blue-100">Update game scores and results</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/api/admin/assign-default-picks"
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Assign Default Picks
            </Link>
            <Link
              href="/api/admin/assign-default-picks"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Preview Default Picks
            </Link>
          </div>
        </div>

        {/* Current Week Default Pick */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-orange-200" />
            {defaultPickData ? `Week ${defaultPickData.currentWeek} Default Pick` : 'Current Week Default Pick'}
          </h2>
          
          {loading ? (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-blue-200">Loading default pick information...</p>
            </div>
          ) : defaultPickData && defaultPickData.defaultPick ? (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {defaultPickData.defaultPick.away_team} @ {defaultPickData.defaultPick.home_team}
                      </h3>
                      <p className="text-blue-200">
                        Game Time: {new Date(defaultPickData.defaultPick.game_time).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-300">
                        {defaultPickData.defaultPick.favored_team}
                      </div>
                      <div className="text-sm text-orange-200">
                        Favored by {defaultPickData.defaultPick.spread_magnitude} points
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <Users className="w-5 h-5 text-orange-200" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-orange-100">Users Needing Picks</p>
                        <p className="text-xl font-bold text-white">{defaultPickData.userCount}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Target className="w-5 h-5 text-blue-200" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-100">Total Picks to Assign</p>
                        <p className="text-xl font-bold text-white">{defaultPickData.totalPicksToAssign}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {defaultPickData.userCount > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-yellow-200 text-sm">
                      <strong>{defaultPickData.userCount}</strong> users with completed purchases haven't made picks for Week {defaultPickData.currentWeek}.
                      They will automatically be assigned to pick <strong>{defaultPickData.defaultPick.favored_team}</strong> (the most favored team).
                    </p>
                  </div>
                )}
              </div>
            ) : defaultPickData ? (
              <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                <p className="text-gray-200">
                  No default pick available for Week {defaultPickData.currentWeek}. 
                  This could mean no games are scheduled or no spreads are available.
                </p>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-200">
                  Unable to load default pick information. Please check the console for errors.
                </p>
              </div>
            )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Total Games</p>
                <p className="text-2xl font-bold text-white">{totalMatchups}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Trophy className="w-6 h-6 text-green-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Completed</p>
                <p className="text-2xl font-bold text-white">{completedMatchups}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-100">Live</p>
                <p className="text-2xl font-bold text-white">{liveMatchups}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Pending</p>
                <p className="text-2xl font-bold text-white">{pendingMatchups}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Matchups by Week */}
        <div className="space-y-8">
          {Object.entries(matchupsByWeek).map(([week, weekMatchups]) => {
            const weekMatchupsArr = weekMatchups as Matchup[];
            return (
              <div key={week} className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <div className="px-6 py-4 border-b border-white/20">
                  <h2 className="text-xl font-semibold text-white">Week {week}</h2>
                  <p className="text-blue-100">{weekMatchupsArr.length} games</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {weekMatchupsArr.map((matchup) => (
                      <div key={matchup.id} className="flex items-center justify-between p-4 border border-white/20 rounded-lg bg-white/5">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-white">{matchup.away_team}</span>
                              <span className="text-lg font-semibold text-white">@</span>
                              <span className="text-sm font-semibold text-white">{matchup.home_team}</span>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              matchup.status === 'final' ? 'bg-green-500/20 text-green-200' :
                              matchup.status === 'live' ? 'bg-yellow-500/20 text-yellow-200' :
                              'bg-gray-500/20 text-gray-200'
                            }`}>
                              {matchup.status}
                            </span>
                          </div>
                          <div className="text-sm text-blue-200 mt-1">
                            {new Date(matchup.game_time).toLocaleString()}
                            {matchup.away_score !== null && matchup.home_score !== null && (
                              <span className="ml-4">
                                Score: {matchup.away_score} - {matchup.home_score}
                                {matchup.winner && (
                                  <span className="ml-2 text-green-300">
                                    ({matchup.winner === 'away' ? matchup.away_team : 
                                      matchup.winner === 'home' ? matchup.home_team : 'Tie'})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <div className="text-sm text-blue-200">Total Picks</div>
                            <div className="text-lg font-semibold text-white">{matchup.totalPicks}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-green-200">Active</div>
                            <div className="text-lg font-semibold text-green-300">{matchup.activePicks}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-red-200">Eliminated</div>
                            <div className="text-lg font-semibold text-red-300">{matchup.eliminatedPicks}</div>
                          </div>
                          <div className="flex space-x-2">
                            <Link
                              href={`/admin/results/${matchup.id}/update`}
                              className="text-blue-200 hover:text-white transition-colors"
                            >
                              Update
                            </Link>
                            <Link
                              href={`/admin/results/${matchup.id}/picks`}
                              className="text-green-200 hover:text-white transition-colors"
                            >
                              Picks
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )})}
        </div>

        {matchupsWithStats.length === 0 && (
          <div className="text-center py-12">
            <div className="text-blue-200 text-lg">No matchups found</div>
            <p className="text-blue-100 mt-2">Add matchups to start updating results</p>
            <Link
              href="/admin/matchups"
              className="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Manage Matchups
            </Link>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/results/bulk-update"
              className="bg-blue-600/20 text-blue-200 px-4 py-3 rounded-lg hover:bg-blue-600/30 transition-colors"
            >
              <div className="font-medium">Bulk Update</div>
              <div className="text-sm opacity-75">Update multiple games at once</div>
            </Link>
            
            <Link
              href="/admin/results/auto-update"
              className="bg-green-600/20 text-green-200 px-4 py-3 rounded-lg hover:bg-green-600/30 transition-colors"
            >
              <div className="font-medium">Auto Update</div>
              <div className="text-sm opacity-75">Fetch scores from API</div>
            </Link>
            
            <Link
              href="/admin/results/process"
              className="bg-purple-600/20 text-purple-200 px-4 py-3 rounded-lg hover:bg-purple-600/30 transition-colors"
            >
              <div className="font-medium">Process Results</div>
              <div className="text-sm opacity-75">Update pick statuses</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 