'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatDeadlineForUser, isDeadlinePassed, formatGameTime, calculatePicksDeadline } from '@/lib/timezone'
import { Save, Clock, AlertTriangle, Plus, Minus, Tag, X } from 'lucide-react'
import Header from '@/components/header'
import PickNamesManager from '@/components/pick-names-manager'
import StyledTeamName from '@/components/styled-team-name'
import { PickNameWithUsage } from '@/lib/pick-names-service'
import { useAuth } from '@/components/auth-provider'
import PickSelectionPopup from '@/components/pick-selection-popup'
import { isUserTester, getUserTypeDisplay, getUserDefaultWeek } from '@/lib/user-types-client'

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
  pick_name_id?: string
  pick_names?: {
    name: string
    description?: string
  }
  created_at: string
  updated_at: string
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
  const [showPickPopup, setShowPickPopup] = useState(false)
  const [selectedMatchup, setSelectedMatchup] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [isTester, setIsTester] = useState(false)
  const [seasonFilter, setSeasonFilter] = useState<string>('')

  const router = useRouter()

  const loadData = useCallback(async () => {
    try {
      // Check if user is authenticated
      if (!user) {
        router.push('/login')
        return
      }

      // Get user's default week based on their type
      const userDefaultWeek = await getUserDefaultWeek(user.id)
      console.log('🔍 DEBUG: Picks page - user default week:', userDefaultWeek)
      setCurrentWeek(userDefaultWeek)

      // Get user's total picks purchased
      const { data: purchases } = await supabase
        .from('purchases')
        .select('picks_count')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      const totalPicksPurchased = purchases?.reduce((sum, purchase) => sum + purchase.picks_count, 0) || 0

      // Check if user is a tester
      const userIsTester = await isUserTester(user.id)
      console.log('🔍 DEBUG: Picks page - user is tester:', userIsTester)
      setIsTester(userIsTester)
      
      // Determine the season type based on user type and week
      let seasonFilter = ''
      
      if (userIsTester) {
        // Testers see preseason games
        if (userDefaultWeek === 0) seasonFilter = 'PRE0'
        else if (userDefaultWeek === 1) seasonFilter = 'PRE1'
        else if (userDefaultWeek === 2) seasonFilter = 'PRE2'
        else if (userDefaultWeek === 3) seasonFilter = 'PRE3'
        else seasonFilter = 'REG1' // fallback
      } else {
        // Non-testers see regular season games
        if (userDefaultWeek === 1) seasonFilter = 'REG1'
        else if (userDefaultWeek === 2) seasonFilter = 'REG2'
        else if (userDefaultWeek === 3) seasonFilter = 'REG3'
        else seasonFilter = 'REG1' // fallback
      }
      
      setSeasonFilter(seasonFilter)
      
      console.log('🔍 DEBUG: Picks page - season filter:', seasonFilter)
      console.log('🔍 DEBUG: Picks page - looking for week:', userDefaultWeek)
      
      // Get matchups for the user's default week and season type
      const { data: matchupsData } = await supabase
        .from('matchups')
        .select('*')
        .eq('week', userDefaultWeek)
        .eq('season', seasonFilter)
        .order('game_time', { ascending: true })

      console.log('🔍 DEBUG: Picks page - found matchups:', matchupsData?.length || 0)
      if (matchupsData && matchupsData.length > 0) {
        console.log('🔍 DEBUG: Picks page - first matchup:', {
          week: matchupsData[0].week,
          season: matchupsData[0].season,
          away_team: matchupsData[0].away_team,
          home_team: matchupsData[0].home_team
        })
      }

      // Get user's picks for current week with pick names
      const { data: picksData } = await supabase
        .from('picks')
        .select(`
          *,
          pick_names (
            id,
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

  const getPicksForMatchup = (matchupId: string) => {
    return userPicks.filter(pick => pick.matchup_id === matchupId)
  }

  const getPicksForTeam = (matchupId: string, teamName: string) => {
    return userPicks.filter(pick => pick.matchup_id === matchupId && pick.team_picked === teamName)
  }

  const handleTeamClick = (matchupId: string, teamName: string) => {
    if (checkDeadlinePassed() || picksRemaining <= 0) return
    
    setSelectedMatchup(matchupId)
    setSelectedTeam(teamName)
    setShowPickPopup(true)
  }

  const handlePicksAllocated = (newPicks: Array<Record<string, unknown>>) => {
    // Refresh the data to show the new picks
    loadData()
  }

  const addNamedPickToTeam = (matchupId: string, teamName: string, pickName: PickNameWithUsage) => {
    if (picksRemaining <= 0) return
    
    // Create new pick
    const newPick: Pick = {
      id: `temp-${matchupId}-${Date.now()}`,
      user_id: '',
      matchup_id: matchupId,
      team_picked: teamName,
      picks_count: 1,
      status: 'active',
      pick_name: null,
      pick_name_id: pickName.id,
      pick_names: { name: pickName.name, description: pickName.description },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setUserPicks([...userPicks, newPick])
    
    setPicksRemaining(picksRemaining - 1)
    setSelectedPickName(null)
  }

  const removePickFromTeam = (matchupId: string, teamName: string) => {
    const teamPicks = getPicksForTeam(matchupId, teamName)
    
    if (teamPicks.length === 0) return
    
    // Remove the first pick for this team
    const pickToRemove = teamPicks[0]
    const updatedPicks = userPicks.filter(pick => pick.id !== pickToRemove.id)
    setUserPicks(updatedPicks)
    
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
        title={`${seasonFilter || `Week ${currentWeek}`} Picks`}
        subtitle="Pick teams to lose"
        showBackButton={true}
        backHref="/dashboard"
        backText="Back"
      />
      
      {/* User Type Indicator */}
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-2">
        <div className="bg-blue-500/20 border border-blue-500/30 text-blue-200 px-4 py-2 rounded-lg text-sm">
          <strong>User Type:</strong> {getUserTypeDisplay(isTester ? 'tester' : 'regular')} 
          {isTester && ' - You can access preseason games for testing'}
          {!isTester && ' - You can only access regular season games (Week 1+)'}
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats Section - Moved above deadline */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-blue-200 mb-1">Loser Picks Remaining</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{picksRemaining}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-blue-200 mb-1">Current Week</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{seasonFilter || currentWeek}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-blue-200 mb-1">Wrong Picks Count</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-300">
                {userPicks.reduce((sum, pick) => sum + pick.picks_count, 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Deadline Warning */}
        {deadline && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border ${
            checkDeadlinePassed() 
              ? 'bg-red-500/20 border-red-500/30 text-red-200' 
              : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200'
          }`}>
            <div className="flex items-center">
              {checkDeadlinePassed() ? (
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" />
              ) : (
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" />
              )}
              <span className="font-medium text-sm sm:text-base">
                {checkDeadlinePassed() 
                  ? 'Picks are locked - deadline has passed' 
                  : `Deadline: ${formatDeadline(deadline)}`
                }
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mb-4 sm:mb-6">
          <button
            onClick={() => setShowPickNamesManager(!showPickNamesManager)}
            className="flex items-center justify-center bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base w-full"
          >
            <Tag className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Manage Pick Names</span>
            <span className="sm:hidden">Pick Names</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || checkDeadlinePassed()}
            className="flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm sm:text-base w-full"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Saving...' : checkDeadlinePassed() ? 'Locked' : 'Save Picks'}
          </button>
        </div>

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
        <div className="mb-4 sm:mb-6 bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-2">How to Pick:</h3>
          <div className="text-blue-200 space-y-1 text-sm sm:text-base">
            <p>• Click on the team you think will <strong>LOSE</strong> the game</p>
            <p>• A popup will appear showing your available picks</p>
            <p>• Select one or more picks to allocate to that team</p>
            <p>• You can select multiple picks at once for bulk allocation</p>
            <p>• If your pick wins, you&apos;re eliminated</p>
            <p>• If your pick loses, you survive to next week</p>
            <p>• Last person standing wins!</p>
          </div>
        </div>

        {/* Games List */}
        <div className="space-y-3 sm:space-y-4">
          {matchups.map((matchup) => {
            const userPicksForMatchup = getPicksForMatchup(matchup.id)
            const isThursdayGame = new Date(matchup.game_time).getDay() === 4
            
            return (
              <div key={matchup.id} className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1 sm:space-x-2 mb-1">
                      <StyledTeamName teamName={matchup.away_team} size="lg" />
                      <span className="text-lg sm:text-xl font-semibold text-white">@</span>
                      <StyledTeamName teamName={matchup.home_team} size="lg" />
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm text-blue-200">
                      <span>{formatGameTime(matchup.game_time)}</span>
                      {isThursdayGame && (
                        <span className="flex items-center text-orange-300">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          <span className="hidden sm:inline">Thursday Night Football</span>
                          <span className="sm:hidden">TNF</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  {/* Away Team */}
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                      onClick={() => removePickFromTeam(matchup.id, matchup.away_team)}
                      disabled={checkDeadlinePassed() || getPicksForTeam(matchup.id, matchup.away_team).length === 0}
                      className="bg-red-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleTeamClick(matchup.id, matchup.away_team)}
                      disabled={checkDeadlinePassed() || picksRemaining <= 0}
                      className={`flex-1 min-w-0 p-2 sm:p-4 rounded-lg border-2 transition-all ${
                        getPicksForTeam(matchup.id, matchup.away_team).length > 0
                          ? 'bg-red-500/20 border-red-500 text-white'
                          : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="text-center min-w-0">
                        <StyledTeamName teamName={matchup.away_team} size="md" className="mb-1 sm:mb-2" />
                        {(() => {
                          const teamPicks = getPicksForTeam(matchup.id, matchup.away_team)
                          if (teamPicks.length > 0) {
                            const namedPicks = teamPicks.filter(pick => pick.pick_names)
                            if (namedPicks.length > 0) {
                              return (
                                <div className="text-purple-300 text-xs sm:text-sm font-medium">
                                  {namedPicks.map(pick => pick.pick_names?.name).join(', ')}
                                </div>
                              )
                            } else {
                              return (
                                <div className="text-red-300 text-xs sm:text-sm font-medium">
                                  {teamPicks.length} pick{teamPicks.length !== 1 ? 's' : ''}
                                </div>
                              )
                            }
                          } else {
                            return (
                              <div className="text-blue-200 text-xs sm:text-sm opacity-70">
                                Click to pick
                              </div>
                            )
                          }
                        })()}
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleTeamClick(matchup.id, matchup.away_team)}
                      disabled={checkDeadlinePassed() || picksRemaining <= 0}
                      className="bg-green-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  {/* Home Team */}
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                      onClick={() => removePickFromTeam(matchup.id, matchup.home_team)}
                      disabled={checkDeadlinePassed() || getPicksForTeam(matchup.id, matchup.home_team).length === 0}
                      className="bg-red-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleTeamClick(matchup.id, matchup.home_team)}
                      disabled={checkDeadlinePassed() || picksRemaining <= 0}
                      className={`flex-1 min-w-0 p-2 sm:p-4 rounded-lg border-2 transition-all ${
                        getPicksForTeam(matchup.id, matchup.home_team).length > 0
                          ? 'bg-red-500/20 border-red-500 text-white'
                          : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="text-center min-w-0">
                        <StyledTeamName teamName={matchup.home_team} size="md" className="mb-1 sm:mb-2" />
                        {(() => {
                          const teamPicks = getPicksForTeam(matchup.id, matchup.home_team)
                          if (teamPicks.length > 0) {
                            const namedPicks = teamPicks.filter(pick => pick.pick_names)
                            if (namedPicks.length > 0) {
                              return (
                                <div className="text-purple-300 text-xs sm:text-sm font-medium">
                                  {namedPicks.map(pick => pick.pick_names?.name).join(', ')}
                                </div>
                              )
                            } else {
                              return (
                                <div className="text-red-300 text-xs sm:text-sm font-medium">
                                  {teamPicks.length} pick{teamPicks.length !== 1 ? 's' : ''}
                                </div>
                              )
                            }
                          } else {
                            return (
                              <div className="text-blue-200 text-xs sm:text-sm opacity-70">
                                Click to pick
                              </div>
                            )
                          }
                        })()}
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleTeamClick(matchup.id, matchup.home_team)}
                      disabled={checkDeadlinePassed() || picksRemaining <= 0}
                      className="bg-green-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pick Selection Popup */}
      {showPickPopup && selectedMatchup && selectedTeam && (
        <PickSelectionPopup
          isOpen={showPickPopup}
          onClose={() => {
            setShowPickPopup(false)
            setSelectedMatchup(null)
            setSelectedTeam(null)
          }}
          matchupId={selectedMatchup}
          teamName={selectedTeam}
          onPicksAllocated={handlePicksAllocated}
        />
      )}
    </div>
  )
} 