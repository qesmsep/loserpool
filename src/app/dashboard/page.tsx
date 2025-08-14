'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Trophy, Calendar, Save, Tag, ShoppingCart } from 'lucide-react'
import Header from '@/components/header'
import { formatDeadlineForUser, getTimeRemaining, formatGameTime, calculatePicksDeadline, getDetailedTimeRemaining, groupMatchupsByDay, getDayDisplayOrder, sortMatchupsChronologically } from '@/lib/timezone'
import { DateTime } from 'luxon'
import { useAuth } from '@/components/auth-provider'

import { getCurrentWeekDisplay, isPreseason } from '@/lib/week-utils'
import MatchupBox from '@/components/matchup-box'
import StyledTeamName from '@/components/styled-team-name'
import PickSelectionPopup from '@/components/pick-selection-popup'

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
  picks_count: number
  status: 'pending' | 'active' | 'lost' | 'safe'
  pick_name?: string
  // Week columns will be added dynamically
  [key: string]: any
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
  const [countdown, setCountdown] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isExpired: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false })
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [nextWeekMatchups, setNextWeekMatchups] = useState<Matchup[]>([])
  const [userPicks, setUserPicks] = useState<Pick[]>([])
  const [picksRemaining, setPicksRemaining] = useState(0)
  const [dbPicksRemaining, setDbPicksRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
  const [picksSaved, setPicksSaved] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
 
  const [showPickPopup, setShowPickPopup] = useState(false)
  const [selectedMatchup, setSelectedMatchup] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [preseasonNote, setPreseasonNote] = useState<string>('')


  const router = useRouter()

  // Check if the season has started
  const hasSeasonStarted = currentWeek > 0 && !isPreseason()

  // Countdown timer effect
  useEffect(() => {
    if (!deadline) return

    const updateCountdown = () => {
      const detailedTime = getDetailedTimeRemaining(deadline)
      setCountdown(detailedTime)
    }

    // Update immediately
    updateCountdown()

    // Update every second
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [deadline])

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


      // Get current week display from API
      let week = 1 // Default fallback
      try {
        const weekDisplayResponse = await fetch('/api/current-week-display')
        const weekDisplayResult = await weekDisplayResponse.json()
        
        if (weekDisplayResult.success) {
          week = weekDisplayResult.current_week
          setCurrentWeek(week)
          setCurrentWeekDisplay(weekDisplayResult.week_display)
          
          // Calculate next week display
          const nextWeek = weekDisplayResult.current_week + 1
          let nextWeekDisplay: string
          
          if (nextWeek <= 3) {
            nextWeekDisplay = `Preseason Week ${nextWeek}`
          } else if (nextWeek <= 21) {
            nextWeekDisplay = `Week ${nextWeek - 3}`
          } else {
            nextWeekDisplay = `Postseason Week ${nextWeek - 21}`
          }
          
          setNextWeekDisplay(nextWeekDisplay)
          
          // If we're in preseason, show a note about game availability
          if (weekDisplayResult.is_preseason) {
            setPreseasonNote('Preseason games are not yet available from the data provider. Regular season games will be shown below.')
          }
        } else {
          // Fallback to database settings
          const { data: settings } = await supabase
            .from('global_settings')
            .select('key, value')
            .in('key', ['current_week'])

          const weekSetting = settings?.find(s => s.key === 'current_week')
          week = weekSetting ? parseInt(weekSetting.value) : 1
          setCurrentWeek(week)
          
          // Get current week display
          const weekDisplay = getCurrentWeekDisplay()
          setCurrentWeekDisplay(weekDisplay)
          setNextWeekDisplay('Loading...')
        }
      } catch (error) {
        console.error('Error fetching week display:', error)
        // Fallback to database settings
        const { data: settings } = await supabase
          .from('global_settings')
          .select('key, value')
          .in('key', ['current_week'])

        const weekSetting = settings?.find(s => s.key === 'current_week')
        week = weekSetting ? parseInt(weekSetting.value) : 1
        setCurrentWeek(week)
        
        // Get current week display
        const weekDisplay = getCurrentWeekDisplay()
        setCurrentWeekDisplay(weekDisplay)
        setNextWeekDisplay('Loading...')
      }

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
  
  // Get user's picks for current week - simplified approach
      const { data: picksData } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)
        .eq('week', week)

      // Calculate picks remaining - simplified approach
      const { data: allUserPicks } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)

      const dbPicksRemaining = allUserPicks?.reduce((sum, pick) => sum + pick.picks_count, 0) || 0

      // Calculate deadline based on current week's matchups
      const calculatedDeadline = calculatePicksDeadline(matchupsData || [])
      setDeadline(calculatedDeadline)

      setMatchups(matchupsData || [])
      setNextWeekMatchups(nextWeekMatchupsData || [])
      setUserPicks(picksData || [])
      setDbPicksRemaining(dbPicksRemaining)
      setPicksSaved((picksData || []).length > 0) // Set saved state based on existing picks
      setIsEditing(false) // Reset edit state when data is loaded
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

  // Set picks remaining directly from database
  useEffect(() => {
    setPicksRemaining(dbPicksRemaining)
  }, [dbPicksRemaining])

  const getPicksForMatchup = (matchupId: string) => {
    // Simplified approach - just return picks for the current week
    return userPicks.filter(pick => pick.matchup_id === matchupId)
  }

  const getPickForMatchup = (matchupId: string) => {
    const picks = getPicksForMatchup(matchupId)
    if (picks.length > 0) {
      const pick = picks[0]
      return {
        team_picked: pick.team_picked || pick.away_team || pick.home_team || '',
        picks_count: pick.picks_count || 0
      }
    }
    return undefined
  }

  const handleTeamClick = (matchupId: string, teamName: string) => {
    if (checkDeadlinePassed()) return
    
    setSelectedMatchup(matchupId)
    setSelectedTeam(teamName)
    setShowPickPopup(true)
  }

  const handlePicksAllocated = (newPicks: any[]) => {
    console.log('Picks allocated:', newPicks)
    console.log('Selected matchup:', selectedMatchup)
    console.log('Selected team:', selectedTeam)
    
    // Refresh data to show the updated picks
    loadData()
    setPicksSaved(false) // Reset saved state when picks change - user needs to save
    setIsEditing(true) // Enter edit mode when picks are allocated
    setShowPickPopup(false)
  }

  const addPickToTeam = (matchupId: string, teamName: string) => {
    // This function is kept for backward compatibility but now triggers the popup
    handleTeamClick(matchupId, teamName)
  }

  const removePickFromTeam = async (matchupId: string, teamName: string) => {
    // This function needs to be updated to work with the new schema
    // For now, just refresh the data
    await loadData()
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

      // Update all pending picks to active status
      const { data: pendingPicks } = await supabase
        .from('picks')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')

      if (pendingPicks && pendingPicks.length > 0) {
        console.log('Updating pending picks to active:', pendingPicks.length)
        
        const { error: updateError } = await supabase
          .from('picks')
          .update({
            status: 'active'
          })
          .eq('user_id', user.id)
          .eq('status', 'pending')

        if (updateError) {
          console.error('Error updating pending picks to active:', updateError)
          throw updateError
        }
      }

      // Refresh data and set saved state
      await loadData()
      setPicksSaved(true)
      setIsEditing(false) // Exit edit mode after saving
      setSaving(false)
      
    } catch (error) {
      console.error('Error saving picks:', error)
      setError('Failed to save picks')
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setError('')
    // Reload data to reset any pending changes
    loadData()
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

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Picks Deadline */}
        {deadline && (
          <div className={`border rounded-lg p-3 sm:p-6 mb-4 sm:mb-8 ${
            countdown.isExpired 
              ? 'bg-red-500/20 border-red-500/30' 
              : countdown.days === 0 && countdown.hours === 0 && countdown.minutes < 60
              ? 'bg-red-500/20 border-red-500/30'
              : 'bg-yellow-500/20 border-yellow-500/30'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex items-center">
                <Calendar className={`w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3 ${
                  countdown.isExpired 
                    ? 'text-red-200' 
                    : countdown.days === 0 && countdown.hours === 0 && countdown.minutes < 60
                    ? 'text-red-200'
                    : 'text-yellow-200'
                }`} />
                <div>
                  <h3 className="text-sm sm:text-lg font-semibold text-white">Picks Deadline</h3>
                  <p className={`text-xs sm:text-base ${
                    countdown.isExpired 
                      ? 'text-red-200' 
                      : countdown.days === 0 && countdown.hours === 0 && countdown.minutes < 60
                      ? 'text-red-200'
                      : 'text-yellow-200'
                  }`}>
                    Deadline: {formatDeadlineForUser(deadline)} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <p className={`text-xs sm:text-sm mb-1 ${
                  countdown.isExpired 
                    ? 'text-red-200' 
                    : countdown.days === 0 && countdown.hours === 0 && countdown.minutes < 60
                    ? 'text-red-200'
                    : 'text-yellow-200'
                }`}>Time Remaining</p>
                {countdown.isExpired ? (
                  <p className="text-lg sm:text-2xl font-bold text-red-400">EXPIRED</p>
                ) : (
                  <div className="text-lg sm:text-2xl font-bold text-white">
                    {countdown.days > 0 && (
                      <>
                        <span className="inline-block mr-2">
                          <span className={`text-sm sm:text-base ${
                            countdown.days === 0 && countdown.hours === 0 && countdown.minutes < 60
                              ? 'text-red-200'
                              : 'text-yellow-200'
                          }`}>Days</span>
                          <div>{countdown.days}</div>
                        </span>
                        <span className="text-white text-lg sm:text-2xl font-bold mr-2">:</span>
                      </>
                    )}
                    <span className="inline-block mr-2">
                      <span className={`text-sm sm:text-base ${
                        countdown.days === 0 && countdown.hours === 0 && countdown.minutes < 60
                          ? 'text-red-200'
                          : 'text-yellow-200'
                      }`}>Hours</span>
                      <div>{countdown.hours.toString().padStart(2, '0')}</div>
                    </span>
                    <span className="text-white text-lg sm:text-2xl font-bold mr-2">:</span>
                    <span className="inline-block mr-2">
                      <span className={`text-sm sm:text-base ${
                        countdown.days === 0 && countdown.hours === 0 && countdown.minutes < 60
                          ? 'text-red-200'
                          : 'text-yellow-200'
                      }`}>Min</span>
                      <div>{countdown.minutes.toString().padStart(2, '0')}</div>
                    </span>
                    <span className="text-white text-lg sm:text-2xl font-bold mr-2">:</span>
                    <span className="inline-block">
                      <span className={`text-sm sm:text-base ${
                        countdown.days === 0 && countdown.hours === 0 && countdown.minutes < 60
                          ? 'text-red-200'
                          : 'text-yellow-200'
                      }`}>Sec</span>
                      <div>{countdown.seconds.toString().padStart(2, '0')}</div>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile-Optimized 2x2 Grid for Top Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-6 mb-4 sm:mb-8">
          {hasSeasonStarted ? (
            <Link
              href="/leaderboard"
              className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3 sm:p-6 hover:bg-white/20 transition-all"
            >
              <h3 className="text-sm sm:text-lg font-semibold text-white mb-1 sm:mb-2">Leaderboard</h3>
              <p className="text-xs sm:text-base text-blue-100">See who&apos;s still in the running</p>
            </Link>
          ) : (
            <Link
              href="/purchase"
              className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3 sm:p-6 hover:bg-white/20 transition-all"
            >
              <div className="flex items-center mb-1 sm:mb-2">
                <ShoppingCart className="w-3 h-3 sm:w-5 sm:h-5 text-green-300 mr-1 sm:mr-2" />
                <h3 className="text-sm sm:text-lg font-semibold text-white">Buy Picks</h3>
              </div>
              <p className="text-xs sm:text-base text-blue-100">Purchase picks before the season starts</p>
            </Link>
          )}

          <Link
            href="/results"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3 sm:p-6 hover:bg-white/20 transition-all"
          >
            <h3 className="text-sm sm:text-lg font-semibold text-white mb-1 sm:mb-2">Results</h3>
            <p className="text-xs sm:text-base text-blue-100">Check last week&apos;s results</p>
          </Link>

          <Link
            href="/pick-names"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3 sm:p-6 hover:bg-white/20 transition-all"
          >
            <div className="flex items-center mb-1 sm:mb-2">
              <Tag className="w-3 h-3 sm:w-5 sm:h-5 text-purple-300 mr-1 sm:mr-2" />
              <h3 className="text-sm sm:text-lg font-semibold text-white">Pick Names</h3>
            </div>
            <p className="text-xs sm:text-base text-blue-100">Manage your named picks</p>
          </Link>

          <Link
            href="/weekly-stats"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3 sm:p-6 hover:bg-white/20 transition-all"
          >
            <h3 className="text-sm sm:text-lg font-semibold text-white mb-1 sm:mb-2">This Week&apos;s Stats</h3>
            <p className="text-xs sm:text-base text-blue-100">See total picks for each team</p>
          </Link>
        </div>

        {/* How to Pick and Rules - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-3 sm:mb-6">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm sm:text-lg font-semibold text-white mb-2">How to Pick:</h3>
            <div className="text-xs sm:text-base text-blue-200 space-y-1">
              <p>• Click on the team you think will <strong>LOSE</strong> the game</p>
              <p>• Each click adds 1 pick to that team</p>
              <p>• Use the + and - buttons to adjust your pick allocation</p>
              <p>• If your pick wins, you&apos;re eliminated</p>
              <p>• If your pick loses, you survive to next week</p>
              <p>• Last person standing wins!</p>
            </div>
          </div>
          
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm sm:text-lg font-semibold text-white mb-2">Pool Rules:</h3>
            <div className="text-xs sm:text-base text-purple-200 space-y-1">
              <p>• Pick the team you think will <strong>LOSE</strong></p>
              <p>• Ties are eliminations</p>
              <p>• Picks cost $21 each</p>
              <p>• Picks lock at Thursday kickoff</p>
              <p>• Winner takes all prize pool</p>
              <Link 
                href="/rules" 
                className="inline-block mt-2 text-purple-300 hover:text-purple-100 underline font-medium text-xs sm:text-sm"
              >
                View Full Rules →
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6 mb-4 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-2 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="p-1 sm:p-2 bg-green-500/20 rounded-lg self-center sm:self-auto mb-1 sm:mb-0">
                <Trophy className="w-3 h-3 sm:w-6 sm:h-6 text-green-200" />
              </div>
              <div className="text-center sm:text-left sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-green-100">Loser Picks</p>
                <p className="text-sm sm:text-2xl font-bold text-white">{picksRemaining}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-2 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="p-1 sm:p-2 bg-orange-500/20 rounded-lg self-center sm:self-auto mb-1 sm:mb-0">
                <Calendar className="w-3 h-3 sm:w-6 sm:h-6 text-orange-200" />
              </div>
              <div className="text-center sm:text-left sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-orange-100">Current Week</p>
                <p className="text-sm sm:text-2xl font-bold text-white">{currentWeekDisplay}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-2 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="p-1 sm:p-2 bg-red-500/20 rounded-lg self-center sm:self-auto mb-1 sm:mb-0">
                <Trophy className="w-3 h-3 sm:w-6 sm:h-6 text-red-200" />
              </div>
              <div className="text-center sm:text-left sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-red-100">Wrong Picks</p>
                <p className="text-sm sm:text-2xl font-bold text-white">{userPicks.filter(pick => pick.status === 'lost').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Week Matchups with Picking */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-white/20">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
              <div>
                <h2 className="text-base sm:text-xl font-semibold text-white">Current Week Games</h2>
                <p className="text-xs sm:text-base text-blue-100">{currentWeekDisplay} - {matchups?.length || 0} games scheduled</p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                {!isEditing ? (
                  // Show Save button only when not editing and picks haven't been saved
                  !picksSaved && (
                    <button
                      onClick={handleSave}
                      disabled={saving || checkDeadlinePassed() || userPicks.length === 0}
                      className="flex items-center justify-center bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs sm:text-sm"
                    >
                      <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      {saving ? 'Saving...' : checkDeadlinePassed() ? 'Locked' : 'Save'}
                    </button>
                  )
                ) : (
                  // Show Save and Cancel buttons when editing
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving || checkDeadlinePassed()}
                      className="flex items-center justify-center bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs sm:text-sm"
                    >
                      <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center justify-center bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-xs sm:text-sm"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {picksSaved && !isEditing && !checkDeadlinePassed() && (
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={saving}
                    className="flex items-center justify-center bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm"
                  >
                    Edit Picks
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 sm:px-4 py-3 rounded-lg mb-3 sm:mb-6 text-xs sm:text-base">
                {error}
              </div>
            )}

            {preseasonNote && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 px-3 sm:px-4 py-3 rounded-lg mb-3 sm:mb-6 text-xs sm:text-base">
                {preseasonNote}
              </div>
            )}

            {matchups && matchups.length > 0 ? (
              <div className="space-y-6">
                {(() => {
                  // Sort matchups chronologically first
                  const sortedMatchups = sortMatchupsChronologically(matchups)
                  const groupedMatchups = groupMatchupsByDay(sortedMatchups)
                  
                  // Get chronological day order based on actual game times
                  const chronologicalDayOrder = Object.keys(groupedMatchups).sort((dayA, dayB) => {
                    const gamesA = groupedMatchups[dayA]
                    const gamesB = groupedMatchups[dayB]
                    
                    if (gamesA.length === 0 || gamesB.length === 0) return 0
                    
                    // Compare the earliest game time of each day
                    const earliestA = DateTime.fromISO(gamesA[0].game_time.replace(/[+-]\d{2}:\d{2}$/, ''), { zone: 'America/New_York' })
                    const earliestB = DateTime.fromISO(gamesB[0].game_time.replace(/[+-]\d{2}:\d{2}$/, ''), { zone: 'America/New_York' })
                    
                    return earliestA.toMillis() - earliestB.toMillis()
                  })
                  
                  return chronologicalDayOrder
                    .filter(day => groupedMatchups[day] && groupedMatchups[day].length > 0)
                    .map(day => (
                      <div key={day} className="space-y-3">
                        <div className="border-b border-white/20 pb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {day} ({groupedMatchups[day].length} game{groupedMatchups[day].length !== 1 ? 's' : ''})
                          </h3>
                        </div>
                        <div className="space-y-2 sm:space-y-4">
                          {groupedMatchups[day].map((matchup) => {
                            const userPick = getPickForMatchup(matchup.id)
                            
                            return (
                              <MatchupBox
                                key={matchup.id}
                                matchup={matchup}
                                userPick={userPick}
                                showControls={false}
                                picksSaved={picksSaved}
                                userPicks={userPicks}
                                picksRemaining={picksRemaining}
                                checkDeadlinePassed={checkDeadlinePassed}
                                addPickToTeam={addPickToTeam}
                                removePickFromTeam={removePickFromTeam}
                                formatGameTime={formatGameTime}
                                getPicksForMatchup={getPicksForMatchup}
                              />
                            )
                          })}
                        </div>
                      </div>
                    ))
                })()}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <p className="text-red-200 mb-2 text-sm sm:text-base">⚠️ Unable to load schedule data</p>
                <p className="text-blue-200 text-xs sm:text-sm">Please try again later or contact support</p>
              </div>
            )}
          </div>
        </div>

        {/* Next Week Matchups (Read Only) */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 mt-4 sm:mt-6">
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-white/20">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
              <div>
                <h2 className="text-base sm:text-xl font-semibold text-white">Next Week&apos;s Games</h2>
                <p className="text-xs sm:text-base text-blue-100">Week {currentWeek + 1} - {nextWeekMatchups?.length || 0} games scheduled</p>
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-6">
            {nextWeekMatchups && nextWeekMatchups.length > 0 ? (
              <div className="space-y-6">
                {(() => {
                  // Sort matchups chronologically first
                  const sortedMatchups = sortMatchupsChronologically(nextWeekMatchups)
                  const groupedMatchups = groupMatchupsByDay(sortedMatchups)
                  
                  // Get chronological day order based on actual game times
                  const chronologicalDayOrder = Object.keys(groupedMatchups).sort((dayA, dayB) => {
                    const gamesA = groupedMatchups[dayA]
                    const gamesB = groupedMatchups[dayB]
                    
                    if (gamesA.length === 0 || gamesB.length === 0) return 0
                    
                    // Compare the earliest game time of each day
                    const earliestA = DateTime.fromISO(gamesA[0].game_time.replace(/[+-]\d{2}:\d{2}$/, ''), { zone: 'America/New_York' })
                    const earliestB = DateTime.fromISO(gamesB[0].game_time.replace(/[+-]\d{2}:\d{2}$/, ''), { zone: 'America/New_York' })
                    
                    return earliestA.toMillis() - earliestB.toMillis()
                  })
                  
                  return chronologicalDayOrder
                    .filter(day => groupedMatchups[day] && groupedMatchups[day].length > 0)
                    .map(day => (
                      <div key={day} className="space-y-3">
                        <div className="border-b border-white/20 pb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {day} ({groupedMatchups[day].length} game{groupedMatchups[day].length !== 1 ? 's' : ''})
                          </h3>
                        </div>
                        <div className="space-y-2 sm:space-y-4">
                          {groupedMatchups[day].map((matchup) => (
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
                              getPicksForMatchup={() => []}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                })()}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <p className="text-red-200 mb-2 text-sm sm:text-base">⚠️ Unable to load next week&apos;s schedule</p>
                <p className="text-blue-200 text-xs sm:text-sm">Please try again later or contact support</p>
              </div>
            )}
          </div>
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