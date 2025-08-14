'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Trophy, Calendar, Save, Tag } from 'lucide-react'
import Header from '@/components/header'
import { formatDeadlineForUser, getTimeRemaining, formatGameTime, calculatePicksDeadline } from '@/lib/timezone'
import { useAuth } from '@/components/auth-provider'

import { getCurrentWeekDisplay } from '@/lib/week-utils'
import MatchupBox from '@/components/matchup-box'
import StyledTeamName from '@/components/styled-team-name'

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

interface ApiMatchup {
  id: string
  week: number
  away_team: string
  home_team: string
  game_time: string
  away_score: number | null
  home_score: number | null
  status: string
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
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const [currentWeek, setCurrentWeek] = useState(1)
  const [currentWeekDisplay, setCurrentWeekDisplay] = useState('Week 1')
  const [nextWeekDisplay, setNextWeekDisplay] = useState('Week 2')
  const [deadline, setDeadline] = useState<string | null>(null)
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [nextWeekMatchups, setNextWeekMatchups] = useState<Matchup[]>([])
  const [userPicks, setUserPicks] = useState<Pick[]>([])
  const [picksRemaining, setPicksRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [picksSaved, setPicksSaved] = useState(false)
  const [showControls, setShowControls] = useState(false)

  const router = useRouter()

  const loadData = useCallback(async () => {
    try {
      // Check if user is authenticated
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
      
      // Get current week display
      const weekDisplay = getCurrentWeekDisplay()
      setCurrentWeekDisplay(weekDisplay)
      
      // Get next week display - will be updated from API response
      setNextWeekDisplay('Loading...')

  // Get current week matchups from database via API
  let matchupsData: Matchup[] = []
  let nextWeekMatchupsData: Matchup[] = []
  
  try {
    // Fetch current week matchups
    const currentWeekResponse = await fetch('/api/matchups')
    const currentWeekResult = await currentWeekResponse.json()
    
    if (currentWeekResult.success) {
      setCurrentWeekDisplay(currentWeekResult.week_display)
      
      matchupsData = currentWeekResult.matchups.map((matchup: ApiMatchup) => ({
        id: matchup.id,
        week: matchup.week,
        away_team: matchup.away_team,
        home_team: matchup.home_team,
        game_time: matchup.game_time,
        away_score: matchup.away_score,
        home_score: matchup.home_score,
        status: matchup.status as 'scheduled' | 'live' | 'final'
      }))
    } else {
      // Fallback if API fails
      console.error('Failed to get current week matchups:', currentWeekResult.error)
    }
    
    // Fetch next week matchups
    const nextWeekResponse = await fetch('/api/matchups?week=next')
    const nextWeekResult = await nextWeekResponse.json()
    
    if (nextWeekResult.success) {
      setNextWeekDisplay(nextWeekResult.week_display)
      
      nextWeekMatchupsData = nextWeekResult.matchups.map((matchup: ApiMatchup) => ({
        id: matchup.id,
        week: matchup.week,
        away_team: matchup.away_team,
        home_team: matchup.home_team,
        game_time: matchup.game_time,
        away_score: matchup.away_score,
        home_score: matchup.home_score,
        status: matchup.status as 'scheduled' | 'live' | 'final'
      }))
    } else {
      // Fallback if API fails
      console.error('Failed to get next week matchups:', nextWeekResult.error)
      setNextWeekDisplay('Next Week')
    }
  } catch (error) {
    console.error('Error loading matchup data:', error)
    // Fallback to database - get current week games only
    const { data: dbMatchupsData } = await supabase
      .from('matchups')
      .select('*')
      .eq('week', week)
      .order('get_season_order(season)', { ascending: true })
      .order('game_time', { ascending: true })

    // Get next week games for preview
    const { data: dbNextWeekMatchupsData } = await supabase
      .from('matchups')
      .select('*')
      .eq('week', week + 1)
      .order('get_season_order(season)', { ascending: true })
      .order('game_time', { ascending: true })
      
    matchupsData = dbMatchupsData || []
    nextWeekMatchupsData = dbNextWeekMatchupsData || []
  }
  
  // Get user's picks for current week
      const { data: picksData } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)
        .in('matchup_id', matchupsData?.map(m => m.id) || [])

      const picksUsed = picksData?.reduce((sum, pick: Pick) => sum + pick.picks_count, 0) || 0
      const remaining = totalPicks - picksUsed

      // Calculate deadline based on current week's matchups
      const calculatedDeadline = calculatePicksDeadline(matchupsData || [])
      setDeadline(calculatedDeadline)

      setMatchups(matchupsData || [])
      setNextWeekMatchups(nextWeekMatchupsData || [])
      setUserPicks(picksData || [])
      setPicksRemaining(remaining)
      setPicksSaved((picksData || []).length > 0) // Set saved state based on existing picks
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
      setLoading(false)
    }
  }, [user, router])

  useEffect(() => {
    if (!authLoading && user) {
      loadData()
    }
  }, [loadData, authLoading, user])

  const getPickForMatchup = (matchupId: string) => {
    return userPicks.find(pick => pick.matchup_id === matchupId)
  }

  const addPickToTeam = (matchupId: string, teamName: string) => {
    setUserPicks(prevPicks => {
      const existingPick = prevPicks.find(pick => pick.matchup_id === matchupId)
      
      if (existingPick) {
        if (existingPick.team_picked === teamName) {
          // Same team - add 1 pick
          return prevPicks.map(pick => 
            pick.id === existingPick.id 
              ? { ...pick, picks_count: pick.picks_count + 1 }
              : pick
          )
        } else {
          // Different team - transfer picks
          return prevPicks.map(pick => 
            pick.id === existingPick.id 
              ? { ...pick, team_picked: teamName }
              : pick
          )
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
        return [...prevPicks, newPick]
      }
    })
    
    setPicksRemaining(prev => prev - 1)
    setPicksSaved(false) // Reset saved state when picks change
  }

  const removePickFromTeam = (matchupId: string, teamName: string) => {
    setUserPicks(prevPicks => {
      const existingPick = prevPicks.find(pick => pick.matchup_id === matchupId)
      
      if (!existingPick || existingPick.team_picked !== teamName || existingPick.picks_count <= 0) {
        return prevPicks
      }
      
      if (existingPick.picks_count === 1) {
        // Remove pick entirely
        return prevPicks.filter(pick => pick.id !== existingPick.id)
      } else {
        // Decrease pick count
        return prevPicks.map(pick => 
          pick.id === existingPick.id 
            ? { ...pick, picks_count: pick.picks_count - 1 }
            : pick
        )
      }
    })
    
    setPicksRemaining(prev => prev + 1)
    setPicksSaved(false) // Reset saved state when picks change
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
            href="/pick-names"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 sm:p-6 hover:bg-white/20 transition-all"
          >
            <div className="flex items-center mb-1 sm:mb-2">
              <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300 mr-2" />
              <h3 className="text-base sm:text-lg font-semibold text-white">Pick Names</h3>
            </div>
            <p className="text-sm sm:text-base text-blue-100">Manage your named picks</p>
          </Link>

          <Link
            href="/weekly-stats"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 sm:p-6 hover:bg-white/20 transition-all"
          >
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">This Week&apos;s Stats</h3>
            <p className="text-sm sm:text-base text-blue-100">See total picks for each team</p>
          </Link>
        </div>

        {/* How to Pick and Rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 sm:p-4">
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
          
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 sm:p-4">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Pool Rules:</h3>
            <div className="text-sm sm:text-base text-purple-200 space-y-1">
              <p>• Pick the team you think will <strong>LOSE</strong></p>
              <p>• Ties are eliminations</p>
              <p>• Picks cost $21 each</p>
              <p>• Picks lock at Thursday kickoff</p>
              <p>• Winner takes all prize pool</p>
              <Link 
                href="/rules" 
                className="inline-block mt-2 text-purple-300 hover:text-purple-100 underline font-medium"
              >
                View Full Rules →
              </Link>
            </div>
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
                <p className="text-xl sm:text-2xl font-bold text-white">{currentWeekDisplay}</p>
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
                <h2 className="text-lg sm:text-xl font-semibold text-white">Current Week Games</h2>
                <p className="text-sm sm:text-base text-blue-100">Week {currentWeek} - {matchups?.length || 0} games scheduled</p>
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
                  
                  return (
                    <MatchupBox
                      key={matchup.id}
                      matchup={matchup}
                      userPick={userPick}
                      showControls={showControls}
                      picksSaved={picksSaved}
                      userPicks={userPicks}
                      picksRemaining={picksRemaining}
                      checkDeadlinePassed={checkDeadlinePassed}
                      addPickToTeam={addPickToTeam}
                      removePickFromTeam={removePickFromTeam}
                      formatGameTime={formatGameTime}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-red-200 mb-2">⚠️ Unable to load schedule data</p>
                <p className="text-blue-200 text-sm">Please try again later or contact support</p>
              </div>
            )}
          </div>
        </div>

        {/* Next Week Matchups (Read Only) */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 mt-6">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/20">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">Next Week&apos;s Games</h2>
                <p className="text-sm sm:text-base text-blue-100">Week {currentWeek + 1} - {nextWeekMatchups?.length || 0} games scheduled</p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {nextWeekMatchups && nextWeekMatchups.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {nextWeekMatchups.map((matchup) => (
                  <MatchupBox
                    key={matchup.id}
                    matchup={matchup}
                    userPick={undefined}
                    showControls={false}
                    picksSaved={true}
                    userPicks={[]}
                    picksRemaining={0}
                    checkDeadlinePassed={() => true}
                    addPickToTeam={() => {}}
                    removePickFromTeam={() => {}}
                    formatGameTime={formatGameTime}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-red-200 mb-2">⚠️ Unable to load next week&apos;s schedule</p>
                <p className="text-blue-200 text-sm">Please try again later or contact support</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 