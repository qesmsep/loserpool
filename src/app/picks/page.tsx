'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Save, Clock, AlertTriangle } from 'lucide-react'

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
  matchup_id: string
  team_picked: string
  picks_count: number
  status: 'active' | 'eliminated' | 'safe'
}

export default function PicksPage() {
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get current week and deadline from global settings
      const { data: settings } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', ['current_week', 'week1_picks_deadline'])

      const weekSetting = settings?.find(s => s.key === 'current_week')
      const deadlineSetting = settings?.find(s => s.key === 'week1_picks_deadline')
      
      const week = weekSetting ? parseInt(weekSetting.value) : 1
      const deadlineTime = deadlineSetting?.value || null
      
      setCurrentWeek(week)
      setDeadline(deadlineTime)

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
        .order('game_time')

      // Get user's picks for current week
      const { data: picksData } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)
        .in('matchup_id', matchupsData?.map(m => m.id) || [])

      const picksUsed = picksData?.reduce((sum, pick) => sum + pick.picks_count, 0) || 0
      const remaining = totalPicksPurchased - picksUsed

      setMatchups(matchupsData || [])
      setUserPicks(picksData || [])
      setPicksRemaining(remaining)
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updatePick = (matchupId: string, teamPicked: string, picksCount: number) => {
    const existingPick = userPicks.find(p => p.matchup_id === matchupId)
    
    if (existingPick) {
      // Update existing pick
      setUserPicks(prev => prev.map(p => 
        p.id === existingPick.id 
          ? { ...p, team_picked: teamPicked, picks_count: picksCount }
          : p
      ))
    } else {
      // Create new pick
      const newPick: Pick = {
        id: `temp-${matchupId}`,
        user_id: '',
        matchup_id: matchupId,
        team_picked: teamPicked,
        picks_count: picksCount,
        status: 'active'
      }
      setUserPicks(prev => [...prev, newPick])
    }
  }

  const getPickForMatchup = (matchupId: string) => {
    return userPicks.find(p => p.matchup_id === matchupId)
  }

  const getTotalPicksUsed = () => {
    return userPicks.reduce((sum, pick) => sum + pick.picks_count, 0)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
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

      // Save each pick
      for (const pick of userPicks) {
        if (pick.id.startsWith('temp-')) {
          // Create new pick
          const { error } = await supabase
            .from('picks')
            .insert({
              user_id: user.id,
              matchup_id: pick.matchup_id,
              team_picked: pick.team_picked,
              picks_count: pick.picks_count,
              status: 'active'
            })
          
          if (error) throw error
        } else {
          // Update existing pick
          const { error } = await supabase
            .from('picks')
            .update({
              team_picked: pick.team_picked,
              picks_count: pick.picks_count,
              updated_at: new Date().toISOString()
            })
            .eq('id', pick.id)
          
          if (error) throw error
        }
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving picks:', error)
      setError('Failed to save picks')
      setSaving(false)
    }
  }

  const isDeadlinePassed = () => {
    if (!deadline) return false
    return new Date() > new Date(deadline)
  }

  const formatDeadline = (deadlineStr: string) => {
    try {
      return format(new Date(deadlineStr), 'MMM d, h:mm a')
    } catch {
      return deadlineStr
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
          <p className="mt-4 text-blue-200">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Compact Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-blue-100 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Week {currentWeek} Picks</h1>
                <p className="text-sm text-blue-100">Pick teams to lose</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs text-blue-200">Picks Left</p>
                <p className="text-xl font-bold text-blue-300">{picksRemaining}</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || isDeadlinePassed()}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : isDeadlinePassed() ? 'Locked' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Compact Deadline Warning */}
        {deadline && (
          <div className={`mb-4 p-3 rounded-lg border text-sm ${
            isDeadlinePassed() 
              ? 'bg-red-500/20 border-red-500/30 text-red-200' 
              : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200'
          }`}>
            <div className="flex items-center">
              {isDeadlinePassed() ? (
                <AlertTriangle className="w-4 h-4 mr-2" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              <span>
                {isDeadlinePassed() 
                  ? 'Picks are locked' 
                  : `Deadline: ${formatDeadline(deadline)}`
                }
              </span>
            </div>
          </div>
        )}

        {/* Compact Games Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {matchups.map((matchup) => {
            const userPick = getPickForMatchup(matchup.id)
            const isThursdayGame = new Date(matchup.game_time).getDay() === 4
            
            return (
              <div key={matchup.id} className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white mb-0.5">
                      {matchup.away_team} @ {matchup.home_team}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-blue-200">
                      <span>{format(new Date(matchup.game_time), 'EEE, MMM d, h:mm a')}</span>
                      {isThursdayGame && (
                        <span className="flex items-center text-orange-300">
                          <Clock className="w-3 h-3 mr-1" />
                          <span className="text-xs">Lock</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-white mb-0.5">
                      Pick to Lose
                    </label>
                    <select
                      value={userPick?.team_picked || ''}
                      onChange={(e) => updatePick(matchup.id, e.target.value, userPick?.picks_count || 0)}
                      disabled={isDeadlinePassed()}
                      className="w-full px-2 py-1 border border-white/30 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10 text-white disabled:opacity-50"
                    >
                      <option value="">Select team</option>
                      <option value={matchup.away_team}>{matchup.away_team}</option>
                      <option value={matchup.home_team}>{matchup.home_team}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white mb-0.5">
                      Picks Used
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={picksRemaining + (userPick?.picks_count || 0)}
                      value={userPick?.picks_count || 0}
                      onChange={(e) => updatePick(matchup.id, userPick?.team_picked || '', parseInt(e.target.value) || 0)}
                      disabled={isDeadlinePassed()}
                      className="w-full px-2 py-1 border border-white/30 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10 text-white disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Compact Instructions */}
        <div className="mt-6 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-2">How it works:</h3>
          <div className="text-xs text-blue-200 space-y-1">
            <p>• Pick the team you think will LOSE the game</p>
            <p>• If your pick wins, you're eliminated</p>
            <p>• If your pick loses, you survive to next week</p>
            <p>• Last person standing wins!</p>
          </div>
        </div>
      </div>
    </div>
  )
} 