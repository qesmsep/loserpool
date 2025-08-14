'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatDeadlineForUser, isDeadlinePassed, formatGameTime, calculatePicksDeadline } from '@/lib/timezone'
import { Save, Clock, AlertTriangle, CheckCircle, Plus, Minus, Tag, X } from 'lucide-react'
import Header from '@/components/header'
import PickNamesManager from '@/components/pick-names-manager'
import StyledTeamName from '@/components/styled-team-name'
import { PickNameWithUsage } from '@/lib/pick-names-service'
import { useAuth } from '@/components/auth-provider'

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
  pick_name_id?: string
  pick_names?: {
    name: string
    description?: string
  }
}

export default function PicksPage() {
  const { user, loading: authLoading } = useAuth()
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [userPicks, setUserPicks] = useState<Pick[]>([])
  const [picksRemaining, setPicksRemaining] = useState(0)
  const [currentWeek, setCurrentWeek] = useState(1)
  const [deadline, setDeadline] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPickNamesManager, setShowPickNamesManager] = useState(false)
  const [selectedPickName, setSelectedPickName] = useState<PickNameWithUsage | null>(null)

  const router = useRouter()

  const loadData = useCallback(async () => {
    try {
      // Check if user is authenticated
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

      // Get current week matchups ordered by season and game time
      const { data: matchupsData } = await supabase
        .from('matchups')
        .select('*')
        .eq('week', week)
        .order('get_season_order(season)', { ascending: true })
        .order('game_time', { ascending: true })

      // Get user's picks for current week with pick names
      const { data: picksData } = await supabase
        .from('picks')
        .select(`
          *,
          pick_names (
            name,
            description
          )
        `)
        .eq('user_id', user.id)
        .in('matchup_id', matchupsData?.map(m => m.id) || [])

      const picksUsed = picksData?.reduce((sum, pick) => sum + pick.picks_count, 0) || 0
      const remaining = totalPicksPurchased - picksUsed

      // Calculate deadline based on current week's matchups
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

  const getPickForMatchup = (matchupId: string) => {
    return userPicks.find(pick => pick.matchup_id === matchupId)
  }

  const addPickToTeam = (matchupId: string, teamName: string) => {
    if (picksRemaining <= 0) return
    
    const existingPick = getPickForMatchup(matchupId)
    
    if (existingPick) {
      // Update existing pick
      const updatedPicks = userPicks.map(pick => 
        pick.id === existingPick.id 
          ? { ...pick, team_picked: teamName, picks_count: pick.picks_count + 1 }
          : pick
      )
      setUserPicks(updatedPicks)
    } else {
      // Create new pick
      const newPick: Pick = {
        id: `temp-${matchupId}`,
        user_id: '',
        matchup_id: matchupId,
        team_picked: teamName,
        picks_count: 1,
        status: 'active'
      }
      setUserPicks([...userPicks, newPick])
    }
    
    setPicksRemaining(picksRemaining - 1)
  }

  const addNamedPickToTeam = (matchupId: string, teamName: string, pickName: PickNameWithUsage) => {
    if (picksRemaining <= 0) return
    
    const existingPick = getPickForMatchup(matchupId)
    
    if (existingPick) {
      // Update existing pick
      const updatedPicks = userPicks.map(pick => 
        pick.id === existingPick.id 
          ? { 
              ...pick, 
              team_picked: teamName, 
              picks_count: pick.picks_count + 1,
              pick_name_id: pickName.id,
              pick_names: { name: pickName.name, description: pickName.description }
            }
          : pick
      )
      setUserPicks(updatedPicks)
    } else {
      // Create new pick
      const newPick: Pick = {
        id: `temp-${matchupId}`,
        user_id: '',
        matchup_id: matchupId,
        team_picked: teamName,
        picks_count: 1,
        status: 'active',
        pick_name_id: pickName.id,
        pick_names: { name: pickName.name, description: pickName.description }
      }
      setUserPicks([...userPicks, newPick])
    }
    
    setPicksRemaining(picksRemaining - 1)
    setSelectedPickName(null)
  }

  const removePickFromTeam = (matchupId: string, teamName: string) => {
    const existingPick = getPickForMatchup(matchupId)
    
    if (!existingPick || existingPick.team_picked !== teamName || existingPick.picks_count <= 0) return
    
    if (existingPick.picks_count === 1) {
      // Remove pick entirely
      const updatedPicks = userPicks.filter(pick => pick.id !== existingPick.id)
      setUserPicks(updatedPicks)
    } else {
      // Decrease pick count
      const updatedPicks = userPicks.map(pick => 
        pick.id === existingPick.id 
          ? { ...pick, picks_count: pick.picks_count - 1 }
          : pick
      )
      setUserPicks(updatedPicks)
    }
    
    setPicksRemaining(picksRemaining + 1)
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
              status: 'active',
              pick_name_id: pick.pick_name_id
            })
          
          if (error) throw error
        } else {
          // Update existing pick
          const { error } = await supabase
            .from('picks')
            .update({
              team_picked: pick.team_picked,
              picks_count: pick.picks_count,
              pick_name_id: pick.pick_name_id,
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

  const checkDeadlinePassed = () => {
    if (!deadline) return false
    return isDeadlinePassed(deadline)
  }

  const formatDeadline = (deadlineStr: string) => {
    return formatDeadlineForUser(deadlineStr)
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
        subtitle="Pick teams to lose"
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
                <p className="text-sm text-blue-200">Picks Remaining</p>
                <p className="text-3xl font-bold text-white">{picksRemaining}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-blue-200">Total Picks Used</p>
                <p className="text-xl font-bold text-green-300">
                  {userPicks.reduce((sum, pick) => sum + pick.picks_count, 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowPickNamesManager(!showPickNamesManager)}
                className="flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Tag className="w-4 h-4 mr-2" />
                Manage Pick Names
              </button>
              <button
                onClick={handleSave}
                disabled={saving || checkDeadlinePassed()}
                className="flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : checkDeadlinePassed() ? 'Locked' : 'Save Picks'}
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

        {/* Deadline Warning */}
        {deadline && (
          <div className={`mb-6 p-4 rounded-lg border ${
            checkDeadlinePassed() 
              ? 'bg-red-500/20 border-red-500/30 text-red-200' 
              : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200'
          }`}>
            <div className="flex items-center">
              {checkDeadlinePassed() ? (
                <AlertTriangle className="w-5 h-5 mr-3" />
              ) : (
                <Clock className="w-5 h-5 mr-3" />
              )}
              <span className="font-medium">
                {checkDeadlinePassed() 
                  ? 'Picks are locked - deadline has passed' 
                  : `Deadline: ${formatDeadline(deadline)}`
                }
              </span>
            </div>
          </div>
        )}

        {/* Pick Names Manager */}
        {showPickNamesManager && (
          <div className="mb-6">
            <PickNamesManager 
              onPickNameSelect={(pickName) => setSelectedPickName(pickName)}
              showUsed={false}
            />
          </div>
        )}

        {/* Selected Pick Name */}
        {selectedPickName && (
          <div className="mb-6 bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Tag className="w-5 h-5 text-purple-300" />
                <div>
                  <p className="text-white font-medium">Selected Pick Name: {selectedPickName.name}</p>
                  {selectedPickName.description && (
                    <p className="text-purple-200 text-sm">{selectedPickName.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedPickName(null)}
                className="text-purple-300 hover:text-purple-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mb-6 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">How to Pick:</h3>
          <div className="text-blue-200 space-y-1">
            <p>• Click on the team you think will <strong>LOSE</strong> the game</p>
            <p>• Each click adds 1 pick to that team</p>
            <p>• <strong>Optional:</strong> Select a pick name first to assign it to your pick</p>
            <p>• If your pick wins, you&apos;re eliminated</p>
            <p>• If your pick loses, you survive to next week</p>
            <p>• Last person standing wins!</p>
          </div>
        </div>

        {/* Games List */}
        <div className="space-y-4">
          {matchups.map((matchup) => {
            const userPick = getPickForMatchup(matchup.id)
            const isThursdayGame = new Date(matchup.game_time).getDay() === 4
            
            return (
              <div key={matchup.id} className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <StyledTeamName teamName={matchup.away_team} size="lg" />
                      <span className="text-xl font-semibold text-white">@</span>
                      <StyledTeamName teamName={matchup.home_team} size="lg" />
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-blue-200">
                      <span>{formatGameTime(matchup.game_time)}</span>
                      {isThursdayGame && (
                        <span className="flex items-center text-orange-300">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>Thursday Night Football</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Away Team */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => removePickFromTeam(matchup.id, matchup.away_team)}
                      disabled={checkDeadlinePassed() || !userPick || userPick.team_picked !== matchup.away_team || userPick.picks_count <= 0}
                      className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => selectedPickName 
                        ? addNamedPickToTeam(matchup.id, matchup.away_team, selectedPickName)
                        : addPickToTeam(matchup.id, matchup.away_team)
                      }
                      disabled={checkDeadlinePassed() || picksRemaining <= 0}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        userPick?.team_picked === matchup.away_team
                          ? 'bg-red-500/20 border-red-500 text-white'
                          : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="text-center">
                        <StyledTeamName teamName={matchup.away_team} size="md" className="mb-2" />
                        {userPick?.team_picked === matchup.away_team && (
                          <div className="flex items-center justify-center space-x-2">
                            <CheckCircle className="w-5 h-5 text-red-400" />
                            <span className="text-red-300 font-medium">
                              {userPick.picks_count} pick{userPick.picks_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {userPick?.pick_names && (
                          <div className="mt-1 text-xs text-purple-300">
                            {userPick.pick_names.name}
                          </div>
                        )}
                      </div>
                    </button>
                    
                    <button
                      onClick={() => addPickToTeam(matchup.id, matchup.away_team)}
                      disabled={checkDeadlinePassed() || picksRemaining <= 0}
                      className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Home Team */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => removePickFromTeam(matchup.id, matchup.home_team)}
                      disabled={checkDeadlinePassed() || !userPick || userPick.team_picked !== matchup.home_team || userPick.picks_count <= 0}
                      className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => selectedPickName 
                        ? addNamedPickToTeam(matchup.id, matchup.home_team, selectedPickName)
                        : addPickToTeam(matchup.id, matchup.home_team)
                      }
                      disabled={checkDeadlinePassed() || picksRemaining <= 0}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        userPick?.team_picked === matchup.home_team
                          ? 'bg-red-500/20 border-red-500 text-white'
                          : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="text-center">
                        <StyledTeamName teamName={matchup.home_team} size="md" className="mb-2" />
                        {userPick?.team_picked === matchup.home_team && (
                          <div className="flex items-center justify-center space-x-2">
                            <CheckCircle className="w-5 h-5 text-red-400" />
                            <span className="text-red-300 font-medium">
                              {userPick.picks_count} pick{userPick.picks_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {userPick?.pick_names && (
                          <div className="mt-1 text-xs text-purple-300">
                            {userPick.pick_names.name}
                          </div>
                        )}
                      </div>
                    </button>
                    
                    <button
                      onClick={() => addPickToTeam(matchup.id, matchup.home_team)}
                      disabled={checkDeadlinePassed() || picksRemaining <= 0}
                      className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
} 