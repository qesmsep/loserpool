'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Save, Clock } from 'lucide-react'

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
        .eq('week', 1) // TODO: Get current week dynamically
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
      if (!user) return

      const totalUsed = getTotalPicksUsed()
      if (totalUsed > picksRemaining + totalUsed) {
        setError('You don&apos;t have enough picks remaining')
        setSaving(false)
        return
      }

      // Save all picks
      for (const pick of userPicks) {
        if (pick.id.startsWith('temp-')) {
          // New pick
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
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-blue-100 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Make Your Picks</h1>
                <p className="text-blue-100">Week 1 - Picks lock at Thursday Night Football kickoff</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-blue-200">Picks Remaining</p>
                <p className="text-2xl font-bold text-blue-300">{picksRemaining}</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Picks'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {matchups.map((matchup) => {
            const userPick = getPickForMatchup(matchup.id)
            const isThursdayGame = new Date(matchup.game_time).getDay() === 4 // Thursday
            
            return (
              <div key={matchup.id} className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {matchup.away_team} @ {matchup.home_team}
                    </h3>
                    <p className="text-blue-200">
                      {format(new Date(matchup.game_time), 'EEEE, MMM d, h:mm a')}
                    </p>
                  </div>
                  {isThursdayGame && (
                    <div className="flex items-center text-orange-300">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">Lock Time</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white">
                      Pick Team to Lose
                    </label>
                    <select
                      value={userPick?.team_picked || ''}
                      onChange={(e) => updatePick(matchup.id, e.target.value, userPick?.picks_count || 0)}
                      className="w-full px-3 py-2 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                    >
                      <option value="">Select a team</option>
                      <option value={matchup.away_team}>{matchup.away_team}</option>
                      <option value={matchup.home_team}>{matchup.home_team}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white">
                      Number of Picks
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={picksRemaining + (userPick?.picks_count || 0)}
                      value={userPick?.picks_count || 0}
                      onChange={(e) => updatePick(matchup.id, userPick?.team_picked || '', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">How it works:</h3>
          <ul className="text-blue-200 space-y-1">
            <li>• Pick the team you think will LOSE the game</li>
            <li>• If your pick wins, you&apos;re eliminated</li>
            <li>• If your pick loses, you survive to next week</li>
            <li>• Ties are safe - your pick carries over</li>
            <li>• Last person standing wins the pool!</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 