'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Trophy, Calendar, Plus, Minus, Save } from 'lucide-react'
import Header from '@/components/header'
import { formatDeadlineForUser, getTimeRemaining, formatGameTime, calculatePicksDeadline } from '@/lib/timezone'
import { getTeamColors } from '@/lib/team-logos'

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
  week: number
  status: 'active' | 'eliminated' | 'safe'
}

interface UserProfile {
  id: string
  email: string
  username: string | null
  is_admin: boolean
  needs_password_change?: boolean
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const [currentWeek, setCurrentWeek] = useState(1)
  const [deadline, setDeadline] = useState<string | null>(null)
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [userPicks, setUserPicks] = useState<Pick[]>([])
  const [picksRemaining, setPicksRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [picksSaved, setPicksSaved] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const router = useRouter()

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get user profile
      let { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist, create it
      if (!profileData) {
        const { data: newProfile, error } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            username: null,
            is_admin: false,
          })
          .select()
          .single()

        if (error) {
          console.error('Failed to create user profile:', error)
          profileData = {
            id: user.id,
            email: user.email!,
            username: null,
            is_admin: false,
          }
        } else {
          profileData = newProfile
        }
      }

      setProfile(profileData)

      // Check if user needs to change password
      if (profileData?.needs_password_change) {
        router.push('/change-password')
        return
      }

      // Get user's total picks purchased
      const { data: purchases } = await supabase
        .from('purchases')
        .select('picks_count')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      const totalPicks = purchases?.reduce((sum, purchase) => sum + purchase.picks_count, 0) || 0


      // Get current week from global settings
      const { data: settings } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', ['current_week'])

      const weekSetting = settings?.find(s => s.key === 'current_week')
      const week = weekSetting ? parseInt(weekSetting.value) : 1
      setCurrentWeek(week)

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
      const remaining = totalPicks - picksUsed

      // Calculate deadline based on current week's matchups
      const calculatedDeadline = calculatePicksDeadline(matchupsData || [])
      setDeadline(calculatedDeadline)

      setMatchups(matchupsData || [])
      setUserPicks(picksData || [])
      setPicksRemaining(remaining)
      setPicksSaved((picksData || []).length > 0) // Set saved state based on existing picks
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getPickForMatchup = (matchupId: string) => {
    return userPicks.find(pick => pick.matchup_id === matchupId)
  }

  const addPickToTeam = (matchupId: string, teamName: string) => {
    const existingPick = getPickForMatchup(matchupId)
    
    if (existingPick) {
      if (existingPick.team_picked === teamName) {
        // Same team - add 1 pick
        const updatedPicks = userPicks.map(pick => 
          pick.id === existingPick.id 
            ? { ...pick, picks_count: pick.picks_count + 1 }
            : pick
        )
              setUserPicks(updatedPicks)
      setPicksRemaining(picksRemaining - 1)
      setPicksSaved(false) // Reset saved state when picks change
      // Keep controls visible when adding picks
      } else {
        // Different team - transfer picks
        const updatedPicks = userPicks.map(pick => 
          pick.id === existingPick.id 
            ? { ...pick, team_picked: teamName }
            : pick
        )
        setUserPicks(updatedPicks)
      }
    } else {
      // Create new pick
      const newPick: Pick = {
        id: `temp-${matchupId}`,
        user_id: '',
        matchup_id: matchupId,
        team_picked: teamName,
        picks_count: 1,
        week: currentWeek,
        status: 'active'
      }
      setUserPicks([...userPicks, newPick])
      setPicksRemaining(picksRemaining - 1)
      setPicksSaved(false) // Reset saved state when picks change
      // Keep controls visible when adding picks
    }
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
    setPicksSaved(false) // Reset saved state when picks change
    // Don't hide controls when removing picks - keep them visible for editing
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

      // Delete any existing picks for this user and week first
      console.log('=== DELETE OPERATION START ===')
      console.log('User ID:', user.id)
      console.log('Current Week:', currentWeek)
      
      // First, let's see what picks exist before deletion
      const { data: existingPicksBefore, error: fetchError } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)
        .eq('week', currentWeek)
      
      console.log('Existing picks before deletion:', existingPicksBefore)
      console.log('Number of existing picks:', existingPicksBefore?.length || 0)
      
      if (fetchError) {
        console.error('Error fetching existing picks:', fetchError)
        throw fetchError
      }
      
      // Now attempt the deletion
      const { data: deleteResult, error: deleteError } = await supabase
        .from('picks')
        .delete()
        .eq('user_id', user.id)
        .eq('week', currentWeek)
        .select() // Add this to see what was actually deleted
      
      console.log('Delete result:', deleteResult)
      console.log('Number of picks deleted:', deleteResult?.length || 0)
      
      if (deleteError) {
        console.error('Error deleting existing picks:', deleteError)
        console.error('Delete error details:', {
          message: deleteError?.message,
          code: deleteError?.code,
          details: deleteError?.details,
          hint: deleteError?.hint
        })
        throw deleteError
      }
      
      // Verify deletion by checking again
      const { data: existingPicksAfter, error: verifyError } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)
        .eq('week', currentWeek)
      
      console.log('Existing picks after deletion:', existingPicksAfter)
      console.log('Number of picks after deletion:', existingPicksAfter?.length || 0)
      console.log('=== DELETE OPERATION END ===')

      // Create new picks for all current selections
      for (const pick of userPicks) {
        console.log('Creating new pick:', pick)
        
        const insertData = {
          user_id: user.id,
          matchup_id: pick.matchup_id,
          team_picked: pick.team_picked,
          picks_count: pick.picks_count,
          week: currentWeek,
          status: 'active'
        }
        console.log('Inserting pick data:', insertData)
        
        const { error } = await supabase
          .from('picks')
          .insert(insertData)
        
        if (error) {
          console.error('Insert error:', error)
          throw error
        }
      }

      // Reload data to refresh the display
      await loadData()
      setSaving(false)
      setError('') // Clear any previous errors
      setPicksSaved(true) // Mark that picks have been saved
      setShowControls(true) // Show +/- buttons after initial save
      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed inset-0 flex items-center justify-center z-50'
      successMessage.innerHTML = `
        <div class="bg-white rounded-xl p-8 max-w-md mx-4 text-center shadow-2xl border border-gray-200">
          <div class="mb-4">
            <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-2xl font-bold text-gray-800 mb-2">Picks Saved Successfully!</h3>
          <p class="text-gray-600 mb-6">Your picks have been saved and can be updated until the deadline.</p>
          <button id="okay-btn" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors shadow-lg">
            Got it
          </button>
        </div>
      `
      document.body.appendChild(successMessage)
      
      // Add click handler for the okay button
      const okayBtn = successMessage.querySelector('#okay-btn')
      if (okayBtn) {
        okayBtn.addEventListener('click', () => {
          if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage)
          }
        })
      }
    } catch (error: unknown) {
      console.error('Error saving picks:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to save picks: ${errorMessage}`)
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
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

      // Delete all existing picks for this user and week
      console.log('Deleting all existing picks for week', currentWeek, 'user:', user.id)
      
      // First, let's see what picks exist
      const { data: existingPicks, error: fetchError } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)
        .eq('week', currentWeek)
      
      console.log('Existing picks before deletion:', existingPicks)
      
      const { error: deleteError } = await supabase
        .from('picks')
        .delete()
        .eq('user_id', user.id)
        .eq('week', currentWeek)
      
      if (deleteError) {
        console.error('Error deleting existing picks:', deleteError)
        throw deleteError
      }
      
      console.log('Successfully deleted existing picks')

      // Create new picks for all current selections
      for (const pick of userPicks) {
        console.log('Creating new pick:', pick)
        
        const insertData = {
          user_id: user.id,
          matchup_id: pick.matchup_id,
          team_picked: pick.team_picked,
          picks_count: pick.picks_count,
          week: currentWeek,
          status: 'active'
        }
        console.log('Inserting pick data:', insertData)
        
        const { error } = await supabase
          .from('picks')
          .insert(insertData)
        
        if (error) {
          console.error('Insert error:', error)
          throw error
        }
      }

      // Reload data to refresh the display
      await loadData()
      setSaving(false)
      setError('') // Clear any previous errors
      setPicksSaved(true) // Mark that picks have been saved
      setShowControls(false) // Hide +/- buttons after updating
      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed inset-0 flex items-center justify-center z-50'
      successMessage.innerHTML = `
        <div class="bg-white rounded-xl p-8 max-w-md mx-4 text-center shadow-2xl border border-gray-200">
          <div class="mb-4">
            <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-2xl font-bold text-gray-800 mb-2">Picks Updated Successfully!</h3>
          <p class="text-gray-600 mb-6">Your picks have been updated successfully!</p>
          <button id="okay-btn" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors shadow-lg">
            Got it
          </button>
        </div>
      `
      document.body.appendChild(successMessage)
      
      // Add click handler for the okay button
      const okayBtn = successMessage.querySelector('#okay-btn')
      if (okayBtn) {
        okayBtn.addEventListener('click', () => {
          if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage)
          }
        })
      }
    } catch (error: unknown) {
      console.error('Error updating picks:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to update picks: ${errorMessage}`)
      setSaving(false)
    }
  }

  const checkDeadlinePassed = () => {
    if (!deadline) return false
    const now = new Date()
    const deadlineDate = new Date(deadline)
    return now >= deadlineDate
  }

  if (loading) {
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
    <div className="app-bg">
      <Header 
        title="Dashboard"
        subtitle={`Welcome back, ${profile?.username || profile?.email}`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Picks Deadline */}
        {deadline && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-200 mr-2 sm:mr-3" />
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">Picks Deadline</h3>
                  <p className="text-sm sm:text-base text-yellow-200">
                    Deadline: {formatDeadlineForUser(deadline)} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-sm text-yellow-200">Time Remaining</p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {getTimeRemaining(deadline)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard/Results/Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Link
            href="/leaderboard"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 sm:p-6 hover:bg-white/20 transition-all"
          >
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Leaderboard</h3>
            <p className="text-sm sm:text-base text-blue-100">See who&apos;s still in the running</p>
          </Link>

          <Link
            href="/results"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 sm:p-6 hover:bg-white/20 transition-all"
          >
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Results</h3>
            <p className="text-sm sm:text-base text-blue-100">Check last week&apos;s results</p>
          </Link>

          <Link
            href="/weekly-stats"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 sm:p-6 hover:bg-white/20 transition-all sm:col-span-2 lg:col-span-1"
          >
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">This Week&apos;s Stats</h3>
            <p className="text-sm sm:text-base text-blue-100">See total picks for each team</p>
          </Link>
        </div>

        {/* How to Pick */}
        <div className="mb-4 sm:mb-6 bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-2">How to Pick:</h3>
          <div className="text-sm sm:text-base text-blue-200 space-y-1">
            <p>• Click on the team you think will <strong>LOSE</strong> the game</p>
            <p>• Each click adds 1 pick to that team</p>
            <p>• Use the + and - buttons to adjust your pick allocation</p>
            <p>• If your pick wins, you&apos;re eliminated</p>
            <p>• If your pick loses, you survive to next week</p>
            <p>• Last person standing wins!</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-green-200" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-green-100">Loser Picks Remaining</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{picksRemaining}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-orange-200" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-orange-100">Current Week</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{currentWeek === 0 ? 'Zero' : currentWeek}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-red-200" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-red-100">Wrong Picks Count</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{userPicks.filter(pick => pick.status === 'eliminated').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Week Matchups with Picking */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/20">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">This Week&apos;s Games</h2>
                <p className="text-sm sm:text-base text-blue-100">{currentWeek === 0 ? 'Week Zero' : `Week ${currentWeek}`} - {matchups?.length || 0} games scheduled</p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  onClick={picksSaved ? handleUpdate : handleSave}
                  disabled={saving || checkDeadlinePassed() || userPicks.length === 0 || (picksSaved && !showControls)}
                  className="flex items-center justify-center bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : checkDeadlinePassed() ? 'Locked' : picksSaved ? 'Update Picks' : 'Save Picks'}
                </button>
                {picksSaved && !showControls && !checkDeadlinePassed() && (
                  <button
                    onClick={() => setShowControls(true)}
                    disabled={saving}
                    className="flex items-center justify-center bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    Edit Picks
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 sm:px-4 py-3 rounded-lg mb-4 sm:mb-6 text-sm sm:text-base">
                {error}
              </div>
            )}
            
            {matchups && matchups.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {matchups.map((matchup) => {
                  const userPick = getPickForMatchup(matchup.id)
                  const isThursdayGame = new Date(matchup.game_time).getDay() === 4
                  
                  return (
                    <div
                      key={matchup.id}
                      className="bg-white/5 border border-white/20 rounded-lg p-3 sm:p-4"
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
                            <span className="text-xs sm:text-sm text-blue-200">
                              {formatGameTime(matchup.game_time)}
                            </span>
                            <span className="text-sm sm:text-base font-medium text-white">
                              {matchup.away_team} @ {matchup.home_team}
                            </span>
                            {isThursdayGame && (
                              <span className="text-xs text-orange-300 bg-orange-500/20 px-2 py-1 rounded self-start">
                                TNF
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {/* Away Team */}
                        <div className="relative">
                          {userPick?.team_picked === matchup.away_team && userPick.picks_count > 0 ? (
                            <div 
                              className="w-full p-3 sm:p-4 rounded-lg text-white relative font-bold shadow-lg"
                              style={{
                                background: `linear-gradient(135deg, ${getTeamColors(matchup.away_team).primary} 0%, ${getTeamColors(matchup.away_team).primary} 70%, ${getTeamColors(matchup.away_team).secondary} 100%)`,
                                color: 'white',
                                border: '2px solid white'
                              }}
                            >
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-2 mb-1">
                                  {(showControls || (!picksSaved && userPicks.length > 0)) && (
                                    <button
                                      onClick={() => removePickFromTeam(matchup.id, matchup.away_team)}
                                      disabled={checkDeadlinePassed()}
                                      className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 disabled:opacity-50"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                  )}
                                  <div className="text-sm sm:text-lg font-bold">{matchup.away_team}</div>
                                  {(showControls || (!picksSaved && userPicks.length > 0)) && (
                                    <button
                                      onClick={() => addPickToTeam(matchup.id, matchup.away_team)}
                                      disabled={checkDeadlinePassed() || picksRemaining <= 0}
                                      className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-green-600 disabled:opacity-50"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <div className="text-sm sm:text-lg font-bold">
                                  {userPick.picks_count > 0 ? `${userPick.picks_count} loser pick${userPick.picks_count !== 1 ? 's' : ''}` : ''}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => addPickToTeam(matchup.id, matchup.away_team)}
                              disabled={checkDeadlinePassed() || picksRemaining <= 0}
                              className="w-full p-3 sm:p-4 rounded-lg transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg"
                              style={{
                                background: `linear-gradient(135deg, ${getTeamColors(matchup.away_team).primary} 0%, ${getTeamColors(matchup.away_team).primary} 70%, ${getTeamColors(matchup.away_team).secondary} 100%)`,
                                color: 'white'
                              }}
                            >
                              <div className="text-center">
                                <div className="font-semibold mb-1">{matchup.away_team}</div>
                                <div className="text-sm font-medium opacity-90">
                                  {/* Empty space to maintain height */}
                                </div>
                              </div>
                            </button>
                          )}
                        </div>

                        {/* Home Team */}
                        <div className="relative">
                          {userPick?.team_picked === matchup.home_team && userPick.picks_count > 0 ? (
                            <div 
                              className="w-full p-3 sm:p-4 rounded-lg text-white relative font-bold shadow-lg"
                              style={{
                                background: `linear-gradient(135deg, ${getTeamColors(matchup.home_team).primary} 0%, ${getTeamColors(matchup.home_team).primary} 70%, ${getTeamColors(matchup.home_team).secondary} 100%)`,
                                color: 'white',
                                border: '2px solid white'
                              }}
                            >
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-2 mb-1">
                                  {(showControls || (!picksSaved && userPicks.length > 0)) && (
                                    <button
                                      onClick={() => removePickFromTeam(matchup.id, matchup.home_team)}
                                      disabled={checkDeadlinePassed()}
                                      className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 disabled:opacity-50"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                  )}
                                  <div className="text-sm sm:text-lg font-bold">{matchup.home_team}</div>
                                  {(showControls || (!picksSaved && userPicks.length > 0)) && (
                                    <button
                                      onClick={() => addPickToTeam(matchup.id, matchup.home_team)}
                                      disabled={checkDeadlinePassed() || picksRemaining <= 0}
                                      className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-green-600 disabled:opacity-50"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <div className="text-sm sm:text-lg font-bold">
                                  {userPick.picks_count > 0 ? `${userPick.picks_count} loser pick${userPick.picks_count !== 1 ? 's' : ''}` : ''}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => addPickToTeam(matchup.id, matchup.home_team)}
                              disabled={checkDeadlinePassed() || picksRemaining <= 0}
                              className="w-full p-3 sm:p-4 rounded-lg transition-all hover:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg"
                              style={{
                                background: `linear-gradient(135deg, ${getTeamColors(matchup.home_team).primary} 0%, ${getTeamColors(matchup.home_team).primary} 70%, ${getTeamColors(matchup.home_team).secondary} 100%)`,
                                color: 'white'
                              }}
                            >
                              <div className="text-center">
                                <div className="font-semibold mb-1">{matchup.home_team}</div>
                                <div className="text-sm font-medium opacity-90">
                                  {/* Empty space to maintain height */}
                                </div>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-blue-200 text-center py-8">No games scheduled for this week</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 