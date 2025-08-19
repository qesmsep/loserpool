'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Trophy, Calendar, Save, Tag, ShoppingCart, Edit, X } from 'lucide-react'
import Header from '@/components/header'
import { formatDeadlineForUser, formatGameTime, calculatePicksDeadline, getDetailedTimeRemaining, groupMatchupsByDay, sortMatchupsChronologically } from '@/lib/timezone'
import { DateTime } from 'luxon'
import { useAuth } from '@/components/auth-provider'

import { getCurrentWeekDisplay, isPreseason } from '@/lib/week-utils'
import MatchupBox from '@/components/matchup-box'
import PickSelectionPopup from '@/components/pick-selection-popup'
import OnboardingPopup from '@/components/onboarding-popup'
import { getTeamColors } from '@/lib/team-logos'

// Team abbreviation to full name mapping
const TEAM_ABBREVIATIONS: Record<string, string> = {
  'GB': 'Green Bay Packers',
  'CHI': 'Chicago Bears',
  'DAL': 'Dallas Cowboys',
  'NYG': 'New York Giants',
  'PHI': 'Philadelphia Eagles',
  'WAS': 'Washington Commanders',
  'DET': 'Detroit Lions',
  'KC': 'Kansas City Chiefs',
  'CAR': 'Carolina Panthers',
  'ATL': 'Atlanta Falcons',
  'HOU': 'Houston Texans',
  'BAL': 'Baltimore Ravens',
  'CIN': 'Cincinnati Bengals',
  'CLE': 'Cleveland Browns',
  'JAX': 'Jacksonville Jaguars',
  'IND': 'Indianapolis Colts',
  'TB': 'Tampa Bay Buccaneers',
  'MIN': 'Minnesota Vikings',
  'TEN': 'Tennessee Titans',
  'NO': 'New Orleans Saints',
  'SF': 'San Francisco 49ers',
  'PIT': 'Pittsburgh Steelers',
  'ARI': 'Arizona Cardinals',
  'LV': 'Las Vegas Raiders',
  'DEN': 'Denver Broncos',
  'MIA': 'Miami Dolphins',
  'LAC': 'Los Angeles Chargers',
  'LAR': 'Los Angeles Rams',
  'SEA': 'Seattle Seahawks',
  'BUF': 'Buffalo Bills',
  'NYJ': 'New York Jets',
  'NE': 'New England Patriots'
}

// Function to get full team name
function getFullTeamName(teamName: string): string {
  // If it's already a full name, return as-is
  if (teamName.includes(' ')) {
    return teamName
  }
  
  // Convert abbreviation to full name
  return TEAM_ABBREVIATIONS[teamName] || teamName
}

// Helper function to get the team that caused elimination for eliminated picks
function getEliminatedTeamName(pick: Pick): string | null {
  const weekColumns = [
    'pre1_team_matchup_id', 'pre2_team_matchup_id', 'pre3_team_matchup_id',
    'reg1_team_matchup_id', 'reg2_team_matchup_id', 'reg3_team_matchup_id', 'reg4_team_matchup_id',
    'reg5_team_matchup_id', 'reg6_team_matchup_id', 'reg7_team_matchup_id', 'reg8_team_matchup_id',
    'reg9_team_matchup_id', 'reg10_team_matchup_id', 'reg11_team_matchup_id', 'reg12_team_matchup_id',
    'reg13_team_matchup_id', 'reg14_team_matchup_id', 'reg15_team_matchup_id', 'reg16_team_matchup_id',
    'reg17_team_matchup_id', 'reg18_team_matchup_id',
    'post1_team_matchup_id', 'post2_team_matchup_id', 'post3_team_matchup_id', 'post4_team_matchup_id'
  ]
  
  for (const column of weekColumns) {
    const value = (pick as any)[column]
    if (value) {
      const parts = value.split('_')
      if (parts.length >= 2) {
        return parts.slice(1).join('_')
      }
    }
  }
  return null
}

// Function to calculate dynamic pick status based on game results
function calculatePickStatus(pick: Pick, matchups: Matchup[]): {
  status: string
  statusText: string
  statusColor: string
} {
  // If pick is eliminated, show as eliminated regardless of allocation
  if (pick.status === 'eliminated') {
    return {
      status: 'eliminated',
      statusText: 'Eliminated',
      statusColor: 'text-red-300'
    }
  }
  
  // If no team picked yet, return pending
  if (!pick.team_picked || !pick.matchup_id) {
    return {
      status: 'pending',
      statusText: 'PENDING',
      statusColor: 'text-gray-300'
    }
  }

  // Find the corresponding matchup
  const matchup = matchups.find(m => m.id === pick.matchup_id)
  if (!matchup) {
    return {
      status: 'pending',
      statusText: 'Pending',
      statusColor: 'text-yellow-300'
    }
  }

  // Game hasn't finished yet
  if (matchup.status !== 'final') {
    if (matchup.status === 'live') {
      return {
        status: 'live',
        statusText: 'Live',
        statusColor: 'text-blue-300'
      }
    }
    return {
      status: 'pending',
      statusText: 'Pending',
      statusColor: 'text-yellow-300'
    }
  }

  // Game is final - determine if pick was correct or incorrect
  const awayScore = matchup.away_score || 0
  const homeScore = matchup.home_score || 0
  
  // Determine winner
  let winner: 'away' | 'home' | 'tie'
  if (awayScore > homeScore) {
    winner = 'away'
  } else if (homeScore > awayScore) {
    winner = 'home'
  } else {
    winner = 'tie'
  }

  // Determine if user's pick was correct
  // User picks the team they think will LOSE
  // So if their picked team lost, they were CORRECT
  // If their picked team won or tied, they were INCORRECT (eliminated)
  
  const userPickedTeam = pick.team_picked
  const userPickedAway = userPickedTeam === matchup.away_team
  const userPickedHome = userPickedTeam === matchup.home_team
  
  if (winner === 'tie') {
    // Ties eliminate everyone
    return {
      status: 'incorrect',
      statusText: 'Incorrect',
      statusColor: 'text-red-300'
    }
  } else if (
    (userPickedAway && winner === 'home') || // User picked away team, home team won
    (userPickedHome && winner === 'away')    // User picked home team, away team won
  ) {
    // User's pick lost - they were CORRECT (they survive)
    return {
      status: 'correct',
      statusText: 'Correct',
      statusColor: 'text-green-300'
    }
  } else {
    // User's pick won or tied - they were INCORRECT (eliminated)
    return {
      status: 'incorrect',
      statusText: 'Incorrect',
      statusColor: 'text-red-300'
    }
  }
}

interface Matchup {
  id: string
  week: number
  away_team: string
  home_team: string
  game_time: string
  away_score: number | null
  home_score: number | null
  status: 'scheduled' | 'live' | 'final'
  venue?: string
  weather_forecast?: string
  temperature?: number
  wind_speed?: number
  away_spread?: number
  home_spread?: number
  over_under?: number
  quarter_info?: string
  broadcast_info?: string
  winner?: string
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
  venue?: string
  weather_forecast?: string
  temperature?: number
  wind_speed?: number
  away_spread?: number
  home_spread?: number
  over_under?: number
  quarter_info?: string
  broadcast_info?: string
  winner?: string
}

interface Pick {
  id: string
  user_id: string
  picks_count: number
  status: 'pending' | 'active' | 'lost' | 'safe' | 'eliminated'
  pick_name?: string
  matchup_id?: string
  team_picked?: string
  // Week columns will be added dynamically
  [key: string]: unknown
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
  const [deadline, setDeadline] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isExpired: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false })
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [userPicks, setUserPicks] = useState<Pick[]>([])
  const [picksRemaining, setPicksRemaining] = useState(0)
  const [dbPicksRemaining, setDbPicksRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [picksSaved, setPicksSaved] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
 
  const [showPickPopup, setShowPickPopup] = useState(false)
  const [selectedMatchup, setSelectedMatchup] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [preseasonNote, setPreseasonNote] = useState<string>('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [editingPickId, setEditingPickId] = useState<string | null>(null)
  const [editingPickName, setEditingPickName] = useState('')


  const router = useRouter()

  // Check if the season has started
  const hasSeasonStarted = currentWeek > 0 && !isPreseason()
  
  // Check if user should see onboarding (first login, less than 10 picks, or before regular season)
  const shouldShowOnboarding = picksRemaining < 10 || !hasSeasonStarted

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
          

          
          // Note: Preseason warning removed since games are available
          // If we're in preseason, show a note about game availability
          // if (weekDisplayResult.is_preseason) {
          //   setPreseasonNote('Preseason games are not yet available from the data provider. Regular season games will be shown below.')
          // }
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
      }

  // Get current week matchups from database via API
  let matchupsData: Matchup[] = []
  
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
        status: matchup.status as 'scheduled' | 'live' | 'final',
        venue: matchup.venue,
        weather_forecast: matchup.weather_forecast,
        temperature: matchup.temperature,
        wind_speed: matchup.wind_speed,
        away_spread: matchup.away_spread,
        home_spread: matchup.home_spread,
        over_under: matchup.over_under,
        quarter_info: matchup.quarter_info,
        broadcast_info: matchup.broadcast_info,
        winner: matchup.winner
      }))
    } else {
      // Fallback if API fails
      console.error('Failed to get current week matchups:', currentWeekResult.error)
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
      
    matchupsData = dbMatchupsData || []
  }
  
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
      
      // Load user's picks for current week
      console.log('Debug: Loading picks for user:', user.id)
      console.log('Debug: Current week:', week)
      
      const { data: allUserPicksForWeek, error: picksError } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)
      
      console.log('Debug: All picks query result:', { allUserPicksForWeek, picksError })
      
      // Transform picks to work with the new table structure - show ALL picks with proper status
      const userPicksData: Pick[] = allUserPicksForWeek?.map(pick => {
        // Get the current week column name
        let currentWeekColumn = ''
        if (week <= 3) {
          currentWeekColumn = `pre${week}_team_matchup_id`
        } else if (week <= 21) {
          currentWeekColumn = `reg${week - 3}_team_matchup_id`
        } else {
          currentWeekColumn = `post${week - 21}_team_matchup_id`
        }
        
        // Check if this pick is allocated to the current week
        const currentWeekValue = pick[currentWeekColumn as keyof typeof pick]
        
        let teamName = null
        let matchupId = null
        
        if (currentWeekValue) {
          // Parse the team_matchup_id format: "matchupId_teamName"
          const parts = currentWeekValue.split('_')
          if (parts.length >= 2) {
            matchupId = parts[0]
            teamName = parts.slice(1).join('_') // In case team name has underscores
          }
        }
        
        // Return ALL picks - the status will determine how they're displayed
        return {
          id: pick.id,
          user_id: pick.user_id,
          picks_count: pick.picks_count,
          status: pick.status,
          pick_name: pick.pick_name,
          matchup_id: matchupId,
          team_picked: teamName,
          created_at: pick.created_at,
          updated_at: pick.updated_at
        } as Pick
      }) || []
      
      console.log('Debug: Transformed picks for current week:', userPicksData)
      
      setUserPicks(userPicksData || [])
      setDbPicksRemaining(dbPicksRemaining)
      setPicksSaved((userPicksData || []).length > 0) // Set saved state based on existing picks
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
        team_picked: (pick as any).team_picked || (pick as any).away_team || (pick as any).home_team || '',
        picks_count: pick.picks_count || 0
      }
    }
    return undefined
  }

  const startEditingPick = (pick: Pick) => {
    setEditingPickId(pick.id)
    setEditingPickName(pick.pick_name || '')
  }

  const savePickName = async () => {
    if (!editingPickName.trim()) {
      setError('Pick name is required')
      return
    }

    setError('')
    try {
      const { error } = await supabase
        .from('picks')
        .update({ pick_name: editingPickName.trim() })
        .eq('id', editingPickId!)

      if (error) throw error

      setEditingPickId(null)
      setEditingPickName('')
      setSuccess('Pick name updated successfully')
      loadData() // Refresh the data
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error updating pick name:', error)
      setError('Failed to update pick name')
    }
  }

  const cancelEditPick = () => {
    setEditingPickId(null)
    setEditingPickName('')
    setError('')
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

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8" style={{
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden'
      }}>
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

        {/* Buy Picks Banner - Full Width */}
        {shouldShowOnboarding && (
          <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-green-300" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Ready to Join the Loser Pool?</h2>
                  <p className="text-sm sm:text-base text-green-100">
                    {picksRemaining < 10 
                      ? `You have ${picksRemaining} picks. Get more to increase your chances!` 
                      : 'Get started with the most exciting NFL survivor pool around!'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOnboarding(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Buy Picks & Learn More</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile-Optimized Grid for Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 mb-4 sm:mb-8">
          {hasSeasonStarted && (
            <Link
              href="/leaderboard"
              className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3 sm:p-6 hover:bg-white/20 transition-all"
            >
              <h3 className="text-sm sm:text-lg font-semibold text-white mb-1 sm:mb-2">Leaderboard</h3>
              <p className="text-xs sm:text-base text-blue-100">See who&apos;s still in the running</p>
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



        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-500/20 border border-green-500/30 text-green-200 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Current Week's Picks Table */}
        {userPicks.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 mb-4 sm:mb-6">
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-white/20">
              <h2 className="text-base sm:text-xl font-semibold text-white">Your Current Week Picks</h2>
              <p className="text-xs sm:text-base text-blue-100">{currentWeekDisplay} - {userPicks.length} pick{userPicks.length !== 1 ? 's' : ''} allocated</p>
            </div>
            <div className="p-3 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(() => {
                  // Sort all picks alphabetically by pick_name, with proper number handling
                  const sortedPicks = userPicks.sort((a, b) => {
                    const nameA = (a.pick_name || 'TBD').toLowerCase()
                    const nameB = (b.pick_name || 'TBD').toLowerCase()
                    
                    // Use localeCompare with numeric option for proper number sorting
                    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' })
                  })
                  
                  // Split picks into two columns
                  const midPoint = Math.ceil(sortedPicks.length / 2)
                  const leftColumn = sortedPicks.slice(0, midPoint)
                  const rightColumn = sortedPicks.slice(midPoint)
                  
                  return (
                    <>
                      {/* Left Column */}
                      <div className="space-y-3">
                        {leftColumn.map((pick) => {
                          const teamName = (pick as any).team_picked || null
                          
                          // Calculate dynamic status based on game results
                          const pickStatus = calculatePickStatus(pick, matchups)
                          
                          // Get team colors if team is selected
                          const teamColors = teamName ? getTeamColors(teamName) : null
                          
                          // Format team display name
                          let teamDisplayName = 'NOT PICKED YET'
                          
                          if (pick.status === 'eliminated') {
                            // For eliminated picks, show the team that caused elimination
                            const eliminatedTeam = getEliminatedTeamName(pick)
                            if (eliminatedTeam) {
                              teamDisplayName = `${getFullTeamName(eliminatedTeam)} (ELIMINATED)`
                            }
                          } else if (teamName) {
                            teamDisplayName = `${getFullTeamName(teamName)} to LOSE`
                          }
                          
                          return (
                            <div 
                              key={pick.id} 
                              className="group border border-white/10 rounded-lg p-2 hover:opacity-90 transition-all relative overflow-hidden"
                              style={{
                                background: teamColors 
                                  ? `linear-gradient(135deg, ${teamColors.primary}20, ${teamColors.secondary}20)`
                                  : 'rgba(255, 255, 255, 0.05)',
                                borderColor: teamColors ? `${teamColors.primary}40` : 'rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              {/* Team color accent line */}
                              {teamColors && (
                                <div 
                                  className="absolute top-0 left-0 right-0 h-1"
                                  style={{ backgroundColor: teamColors.primary }}
                                />
                              )}
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center w-full">
                                  {/* Pick name section - fixed width */}
                                  <div className="w-24 flex-shrink-0 flex items-center space-x-2">
                                    {editingPickId === pick.id ? (
                                      <input
                                        type="text"
                                        value={editingPickName}
                                        onChange={(e) => setEditingPickName(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-400"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') savePickName()
                                          if (e.key === 'Escape') cancelEditPick()
                                        }}
                                        autoFocus
                                      />
                                    ) : (
                                      <div className="text-sm font-medium text-white truncate">
                                        {pick.pick_name || 'TBD'}
                                      </div>
                                    )}
                                    {editingPickId === pick.id ? (
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={savePickName}
                                          className="p-1 text-green-300 hover:text-green-200 transition-colors"
                                          title="Save"
                                        >
                                          <Save className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={cancelEditPick}
                                          className="p-1 text-gray-300 hover:text-gray-200 transition-colors"
                                          title="Cancel"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => startEditingPick(pick)}
                                        className="p-1 text-blue-300 hover:text-blue-200 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Edit pick name"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* Team name section - centered in remaining space */}
                                  <div className="flex-1 flex items-center justify-center px-2">
                                    <div 
                                      className="text-sm font-medium truncate text-center"
                                      style={{ 
                                        color: teamColors ? teamColors.text : '#93c5fd' // blue-200 fallback
                                      }}
                                    >
                                      {teamDisplayName}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Status badge - compact width */}
                                <div className="w-16 flex-shrink-0 flex justify-end">
                                  <span className={`text-xs px-2 py-1 rounded-full ${pickStatus.statusColor} bg-white/10`}>
                                    {pickStatus.statusText}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Right Column */}
                      <div className="space-y-3">
                        {rightColumn.map((pick) => {
                          const teamName = (pick as any).team_picked || null
                          
                          // Calculate dynamic status based on game results
                          const pickStatus = calculatePickStatus(pick, matchups)
                          
                          // Get team colors if team is selected
                          const teamColors = teamName ? getTeamColors(teamName) : null
                          
                          // Format team display name
                          let teamDisplayName = 'NOT PICKED YET'
                          
                          if (pick.status === 'eliminated') {
                            // For eliminated picks, show the team that caused elimination
                            const eliminatedTeam = getEliminatedTeamName(pick)
                            if (eliminatedTeam) {
                              teamDisplayName = `${getFullTeamName(eliminatedTeam)} (ELIMINATED)`
                            }
                          } else if (teamName) {
                            teamDisplayName = `${getFullTeamName(teamName)} to LOSE`
                          }
                          
                          return (
                            <div 
                              key={pick.id} 
                              className="group border border-white/10 rounded-lg p-2 hover:opacity-90 transition-all relative overflow-hidden"
                              style={{
                                background: teamColors 
                                  ? `linear-gradient(135deg, ${teamColors.primary}20, ${teamColors.secondary}20)`
                                  : 'rgba(255, 255, 255, 0.05)',
                                borderColor: teamColors ? `${teamColors.primary}40` : 'rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              {/* Team color accent line */}
                              {teamColors && (
                                <div 
                                  className="absolute top-0 left-0 right-0 h-1"
                                  style={{ backgroundColor: teamColors.primary }}
                                />
                              )}
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center w-full">
                                  {/* Pick name section - fixed width */}
                                  <div className="w-24 flex-shrink-0 flex items-center space-x-2">
                                    {editingPickId === pick.id ? (
                                      <input
                                        type="text"
                                        value={editingPickName}
                                        onChange={(e) => setEditingPickName(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-400"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') savePickName()
                                          if (e.key === 'Escape') cancelEditPick()
                                        }}
                                        autoFocus
                                      />
                                    ) : (
                                      <div className="text-sm font-medium text-white truncate">
                                        {pick.pick_name || 'TBD'}
                                      </div>
                                    )}
                                    {editingPickId === pick.id ? (
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={savePickName}
                                          className="p-1 text-green-300 hover:text-green-200 transition-colors"
                                          title="Save"
                                        >
                                          <Save className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={cancelEditPick}
                                          className="p-1 text-gray-300 hover:text-gray-200 transition-colors"
                                          title="Cancel"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => startEditingPick(pick)}
                                        className="p-1 text-blue-300 hover:text-blue-200 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Edit pick name"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* Team name section - centered in remaining space */}
                                  <div className="flex-1 flex items-center justify-center px-2">
                                    <div 
                                      className="text-sm font-medium truncate text-center"
                                      style={{ 
                                        color: teamColors ? teamColors.text : '#93c5fd' // blue-200 fallback
                                      }}
                                    >
                                      {teamDisplayName}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Status badge - compact width */}
                                <div className="w-16 flex-shrink-0 flex justify-end">
                                  <span className={`text-xs px-2 py-1 rounded-full ${pickStatus.statusColor} bg-white/10`}>
                                    {pickStatus.statusText}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Current Week Matchups with Picking */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-white/20">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
              <div>
                <h2 className="text-base sm:text-xl font-semibold text-white">{currentWeekDisplay}</h2>
                <p className="text-xs sm:text-base text-blue-100">{matchups?.length || 0} games scheduled</p>
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
              <div className="space-y-6" style={{
                WebkitTransform: 'translateZ(0)',
                transform: 'translateZ(0)',
                WebkitBackfaceVisibility: 'hidden',
                backfaceVisibility: 'hidden'
              }}>
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
                          <h3 className="text-lg font-semibold text-white text-center">
                            {day}
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

      {/* Onboarding Popup */}
      <OnboardingPopup
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  )
} 