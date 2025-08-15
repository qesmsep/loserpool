'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'
import Header from '@/components/header'
import { Save, Calendar } from 'lucide-react'
import { formatDeadlineForUser, calculatePicksDeadline } from '@/lib/timezone'

interface Matchup {
  id: string
  week: number
  away_team: string
  home_team: string
  game_time: string
  away_score: number | null
  home_score: number | null
  status: 'scheduled' | 'live' | 'final'
}

interface Pick {
  id: string
  user_id: string
  matchup_id: string | null
  team_picked: string
  picks_count: number
  status: 'pending' | 'active' | 'eliminated' | 'safe'
  pick_name: string | null
  week: number
  created_at: string
  updated_at: string
}

export default function PicksSimplePage() {
  const { user, loading: authLoading } = useAuth()
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [userPicks, setUserPicks] = useState<Pick[]>([])
  const [picksRemaining, setPicksRemaining] = useState(0)
  const [currentWeek, setCurrentWeek] = useState(1)
  const [deadline, setDeadline] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const loadData = useCallback(async () => {
    try {
      if (!user) {
        router.push('/login')
        return
      }

      // Get current week from global settings
      const { data: settings } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', ['current_week'])

      const weekSetting = settings?.find(s => s.key === 'current_week')
      const week = weekSetting ? parseInt(weekSetting.value) : 1
      setCurrentWeek(week)

      // Get user's total picks purchased
      const { data: purchases } = await supabase
        .from('purchases')
        .select('picks_count')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      const totalPicksPurchased = purchases?.reduce((sum, purchase) => sum + purchase.picks_count, 0) || 0

      // Get current week matchups
      const { data: matchupsData } = await supabase
        .from('matchups')
        .select('*')
        .eq('week', week)
        .order('game_time', { ascending: true })

      // Get user's available picks (status = 'pending')
      const { data: picksData } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')

      const picksUsed = picksData?.reduce((sum, pick) => sum + pick.picks_count, 0) || 0
      const remaining = totalPicksPurchased - picksUsed

      // Calculate deadline
      const calculatedDeadline = calculatePicksDeadline(matchupsData || [])
      setDeadline(calculatedDeadline)

      setMatchups(matchupsData || [])
      setUserPicks(picksData || [])
      setPicksRemaining(remaining)
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
      setLoading(false)
    }
  }, [router, user])

  useEffect(() => {
    if (!authLoading && user) {
      loadData()
    }
  }, [loadData, authLoading, user])

  const assignPickToMatchup = async (pickId: string, matchupId: string, teamName: string) => {
    try {
      const { error } = await supabase
        .from('picks')
        .update({
          matchup_id: matchupId,
          team_picked: teamName,
          status: 'active',
          week: currentWeek,
          updated_at: new Date().toISOString()
        })
        .eq('id', pickId)

      if (error) throw error

      // Refresh data
      loadData()
    } catch (error) {
      console.error('Error assigning pick:', error)
      setError('Failed to assign pick')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      if (!user) {
        router.push('/login')
        return
      }

      // Check if deadline has passed
      if (deadline && new Date() > new Date(deadline)) {
        setError('Picks deadline has passed. Picks are now locked.')
        setSaving(false)
        return
      }

      setSaving(false)
      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving picks:', error)
      setError('Failed to save picks')
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
          <p className="mt-4 text-blue-200">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg">
      <Header 
        title={`Week ${currentWeek} Picks`}
        subtitle="Assign your picks to teams"
        showBackButton={true}
        backHref="/dashboard"
        backText="Back"
      />
      
      {/* Picks Counter and Save Button */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <p className="text-sm text-blue-200">Available Picks</p>
                <p className="text-3xl font-bold text-white">{picksRemaining}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-blue-200">Assigned Picks</p>
                <p className="text-xl font-bold text-green-300">
                  {userPicks.filter(p => p.status === 'active').length}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : 'Save Picks'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Available Picks */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Your Available Picks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userPicks.filter(pick => pick.status === 'pending').map((pick) => (
              <div key={pick.id} className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-white">{pick.pick_name || 'Unnamed Pick'}</span>
                  <span className="text-sm text-blue-200">Available</span>
                </div>
                <p className="text-sm text-gray-300 mb-3">Click on a team below to assign this pick</p>
              </div>
            ))}
          </div>
        </div>

        {/* Matchups */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Week {currentWeek} Games</h2>
          <div className="space-y-4">
            {matchups.map((matchup) => (
              <div key={matchup.id} className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-white">{matchup.away_team}</div>
                      <div className="text-sm text-blue-200">Away</div>
                    </div>
                    <div className="text-2xl font-bold text-white">@</div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-white">{matchup.home_team}</div>
                      <div className="text-sm text-blue-200">Home</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-blue-200">
                      {new Date(matchup.game_time).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(matchup.game_time).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      const availablePick = userPicks.find(p => p.status === 'pending')
                      if (availablePick) {
                        assignPickToMatchup(availablePick.id, matchup.id, matchup.away_team)
                      }
                    }}
                    disabled={!userPicks.some(p => p.status === 'pending')}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Pick {matchup.away_team} to Lose
                  </button>
                  <button
                    onClick={() => {
                      const availablePick = userPicks.find(p => p.status === 'pending')
                      if (availablePick) {
                        assignPickToMatchup(availablePick.id, matchup.id, matchup.home_team)
                      }
                    }}
                    disabled={!userPicks.some(p => p.status === 'pending')}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Pick {matchup.home_team} to Lose
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
