'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Calendar, Save, ShoppingCart, Edit, X, BarChart3 } from 'lucide-react'
import Header from '@/components/header'
import { formatDeadlineForUser, formatGameTime, calculatePicksDeadline, getDetailedTimeRemaining, groupMatchupsByDay, sortMatchupsChronologically, getWeekDateRange } from '@/lib/timezone'
import { DateTime } from 'luxon'
import { useAuth } from '@/components/auth-provider'


import { isUserTester } from '@/lib/user-types-client'
import { getWeekColumnName } from '@/lib/week-utils'
import MatchupBox from '@/components/matchup-box'
import PickSelectionPopup from '@/components/pick-selection-popup'
import OnboardingPopup from '@/components/onboarding-popup'
import TeamPicksBreakdownModal from '@/components/team-picks-breakdown-modal'
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
  // For eliminated picks, we should show the team that was picked (which caused the elimination)
  // The team_picked field should contain the team name that was selected
  if (pick.team_picked) {
    return pick.team_picked
  }
  
  // Fallback: try to extract from week columns if team_picked is not available
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
    const value = (pick as Record<string, unknown>)[column]
    if (value && typeof value === 'string') {
      const parts = value.split('_')
      if (parts.length >= 2) {
        return parts.slice(1).join('_')
      }
    }
  }
  return null
}

// Helper function to get the elimination week for eliminated picks
function getEliminationWeek(pick: Pick, matchups: Matchup[]): string | null {
  // If eliminationDetails already has the week, use it
  if (pick.eliminationDetails?.week) {
    return pick.eliminationDetails.week
  }
  
  // Try to find the matchup for this pick to determine the week
  if (pick.matchup_id) {
    const matchup = matchups.find(m => m.id === pick.matchup_id)
    if (matchup) {
      if (matchup.week <= 0) {
        return `Preseason Week ${Math.abs(matchup.week) + 1}`
      } else {
        return `Week ${matchup.week}`
      }
    }
  }
  
  // Fallback: try to determine from week columns
  const weekColumns = [
    { column: 'pre1_team_matchup_id', week: 'Preseason Week 1' },
    { column: 'pre2_team_matchup_id', week: 'Preseason Week 2' },
    { column: 'pre3_team_matchup_id', week: 'Preseason Week 3' },
    { column: 'reg1_team_matchup_id', week: 'Week 1' },
    { column: 'reg2_team_matchup_id', week: 'Week 2' },
    { column: 'reg3_team_matchup_id', week: 'Week 3' },
    { column: 'reg4_team_matchup_id', week: 'Week 4' },
    { column: 'reg5_team_matchup_id', week: 'Week 5' },
    { column: 'reg6_team_matchup_id', week: 'Week 6' },
    { column: 'reg7_team_matchup_id', week: 'Week 7' },
    { column: 'reg8_team_matchup_id', week: 'Week 8' },
    { column: 'reg9_team_matchup_id', week: 'Week 9' },
    { column: 'reg10_team_matchup_id', week: 'Week 10' },
    { column: 'reg11_team_matchup_id', week: 'Week 11' },
    { column: 'reg12_team_matchup_id', week: 'Week 12' },
    { column: 'reg13_team_matchup_id', week: 'Week 13' },
    { column: 'reg14_team_matchup_id', week: 'Week 14' },
    { column: 'reg15_team_matchup_id', week: 'Week 15' },
    { column: 'reg16_team_matchup_id', week: 'Week 16' },
    { column: 'reg17_team_matchup_id', week: 'Week 17' },
    { column: 'reg18_team_matchup_id', week: 'Week 18' },
    { column: 'post1_team_matchup_id', week: 'Wild Card' },
    { column: 'post2_team_matchup_id', week: 'Divisional' },
    { column: 'post3_team_matchup_id', week: 'Conference' },
    { column: 'post4_team_matchup_id', week: 'Super Bowl' }
  ]
  
  for (const { column, week } of weekColumns) {
    const value = (pick as Record<string, unknown>)[column]
    if (value && typeof value === 'string') {
      return week
    }
  }
  
  return null
}

// Helper function to get elimination details for eliminated picks
function getEliminationDetails(pick: Pick, matchups: Matchup[]): {
  week: string
  chosenTeam: string
  opponent: string
  score: string
  gameTime: string
} | null {
  if (pick.status !== 'eliminated' || !pick.matchup_id) {
    return null
  }
  
  // Find the matchup that caused the elimination
  const matchup = matchups.find(m => m.id === pick.matchup_id)
  if (!matchup) {
    return null
  }
  
  const chosenTeam = pick.team_picked || getEliminatedTeamName(pick) || 'Unknown'
  const opponent = chosenTeam === matchup.away_team ? matchup.home_team : matchup.away_team
  
  // Format score
  let score = 'TBD'
  if (matchup.away_score !== null && matchup.home_score !== null) {
    score = `${matchup.away_score} - ${matchup.home_score}`
  }
  
  // Format week
  const week = matchup.week <= 0 ? `Preseason Week ${Math.abs(matchup.week) + 1}` : `Week ${matchup.week}`
  
  // Format game time
  const gameTime = new Date(matchup.game_time).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
  
  return {
    week,
    chosenTeam,
    opponent,
    score,
    gameTime
  }
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
      status: 'active',
      statusText: 'Active',
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
  season?: string
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
  season?: string
}

interface Pick {
  id: string
  user_id: string
  picks_count: number
  status: 'pending' | 'active' | 'lost' | 'safe' | 'eliminated'
  pick_name?: string
  matchup_id?: string
  team_picked?: string
  eliminationDetails?: {
    week: string
    chosenTeam: string
    opponent: string
    score: string
    gameTime: string
  }
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

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [editingPickId, setEditingPickId] = useState<string | null>(null)
  const [editingPickName, setEditingPickName] = useState('')
  const [showTeamBreakdownModal, setShowTeamBreakdownModal] = useState(false)
  const [allPicksForBreakdown, setAllPicksForBreakdown] = useState<{
    id: string
    user_id: string
    pick_name: string
    status: string
    picks_count: number
    created_at: string
    updated_at: string
    [key: string]: unknown
  }[]>([])
  const [currentWeekColumn, setCurrentWeekColumn] = useState<string>('reg1_team_matchup_id')
  const [aggregatedTeamPicks, setAggregatedTeamPicks] = useState<Array<{ team: string; pickCount: number }>>([])
  const [apiSeasonFilter, setApiSeasonFilter] = useState<string>('REG1')
  const [apiCurrentWeek, setApiCurrentWeek] = useState<number>(1)

  const router = useRouter()

  // Check if the season has started (based on database current week)
  const hasSeasonStarted = currentWeek > 0
  
  // Check if user should see onboarding (first login, less than 10 picks, or before regular season)
  const shouldShowOnboarding = picksRemaining < 10 || !hasSeasonStarted

  // Check if we should show the team breakdown button
  const shouldShowTeamBreakdownButton = useCallback(() => {
    if (!deadline) return false
    
    const now = new Date()
    const deadlineDate = new Date(deadline)
    
    // Button appears after deadline passes
    if (now < deadlineDate) return false
    
    // Button disappears on Tuesday at 10am CST
    const tuesday10amCST = new Date(now)
    tuesday10amCST.setUTCHours(16, 0, 0, 0) // 10am CST = 4pm UTC (during standard time)
    
    // Find the next Tuesday at 10am CST
    const daysUntilTuesday = (2 - now.getDay() + 7) % 7 // Tuesday is day 2
    const nextTuesday = new Date(now)
    nextTuesday.setDate(now.getDate() + (daysUntilTuesday === 0 ? 7 : daysUntilTuesday))
    nextTuesday.setUTCHours(16, 0, 0, 0)
    
    // If it's already past Tuesday 10am this week, use next Tuesday
    if (now > nextTuesday) {
      nextTuesday.setDate(nextTuesday.getDate() + 7)
    }
    
    return now < nextTuesday
  }, [deadline])

  // Load all picks for team breakdown
  const loadAllPicksForBreakdown = useCallback(async () => {
    console.log('🔍 loadAllPicksForBreakdown called at:', new Date().toISOString())
    try {
      if (!user) return

      // Use the same detected week/season from the API used above
      const { isUserTester } = await import('@/lib/user-types-client')
      const isTester = await isUserTester(user.id)
      
      // Determine column from apiSeasonFilter/apiCurrentWeek
      let currentWeekColumn = 'reg1_team_matchup_id'
      if (apiSeasonFilter && apiSeasonFilter.startsWith('PRE')) {
        currentWeekColumn = isTester
          ? `pre${apiCurrentWeek}_team_matchup_id`
          : 'reg1_team_matchup_id'
      } else {
        currentWeekColumn = `reg${apiCurrentWeek}_team_matchup_id`
      }
      
      console.log('🔍 Team breakdown - current week column:', currentWeekColumn)
      setCurrentWeekColumn(currentWeekColumn)

      // Get all matchups for the current week to create a lookup set first
      const { data: currentWeekMatchups } = await supabase
        .from('matchups')
        .select('id')
        .eq('week', apiCurrentWeek)
        .eq('season', apiSeasonFilter)
      
      const currentWeekMatchupIds = new Set(currentWeekMatchups?.map(m => m.id) || [])
      console.log('🔍 Team breakdown - current week matchups:', currentWeekMatchupIds.size)

      // Get all picks for the current week (use pagination to ensure we get all picks)
      let allPicks: {
        id: string
        user_id: string
        pick_name: string
        status: string
        picks_count: number
        created_at: string
        updated_at: string
        [key: string]: unknown
      }[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: picksData, error } = await supabase
          .from('picks')
          .select('*')
          .not(currentWeekColumn, 'is', null) // Only picks that have a team selected for current week
          .range(from, from + pageSize - 1)

        if (error) {
          console.error('Error loading picks:', error)
          break
        }

        if (picksData && picksData.length > 0) {
          // Filter picks for current week during pagination to avoid memory issues
          const filteredPagePicks = picksData.filter(pick => {
            const matchupId = (pick as Record<string, unknown>)[currentWeekColumn] as string
            if (matchupId) {
              // Extract the matchup ID from the team_matchup_id format (e.g., "matchup_id_team_name")
              const parts = matchupId.split('_')
              const actualMatchupId = parts[0]
              
              // Check if this matchup is for the current week
              return currentWeekMatchupIds.has(actualMatchupId)
            }
            return false
          })
          
          allPicks = [...allPicks, ...filteredPagePicks]
          from += pageSize
          hasMore = picksData.length === pageSize
        } else {
          hasMore = false
        }
      }

      console.log('🔍 Team breakdown - picks loaded and filtered for current week:', allPicks?.length || 0)
      console.log('🔍 Team breakdown - sample picks:', allPicks?.slice(0, 3))
      console.log('🔍 Team breakdown - total picks_count sum:', allPicks?.reduce((sum, pick) => sum + (pick.picks_count || 0), 0) || 0)
      setAllPicksForBreakdown(allPicks || [])
    } catch (error) {
      console.error('Error loading picks for breakdown:', error)
    }
  }, [user, apiSeasonFilter, apiCurrentWeek])

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

  // Load picks for breakdown when button should be shown (use server aggregate API to avoid client paging)
  useEffect(() => {
    if (shouldShowTeamBreakdownButton()) {
      // Use season detection already fetched to compute expected column
      const detectColumn = async () => {
        try {
          console.log('🟢 [Dashboard] Team breakdown effect triggered. Fetching aggregated data...')
          // Fetch server aggregate
          const res = await fetch('/api/team-pick-breakdown', { credentials: 'include' })
          console.log('🟢 [Dashboard] /api/team-pick-breakdown status:', res.status)
          const data = await res.json()
          console.log('🟢 [Dashboard] Aggregation API payload keys:', Object.keys(data || {}))
          if (data && data.success) {
            console.log('🟢 [Dashboard] Aggregation success. teams:', (data.teamPicks || []).length, 'weekColumn:', data.weekColumn)
            setAggregatedTeamPicks(data.teamPicks || [])
            setCurrentWeekColumn(data.weekColumn || currentWeekColumn)
          } else {
            // Fallback to legacy client method if API fails
            console.warn('🟡 [Dashboard] Aggregation API returned non-success. Falling back to client aggregation.')
            loadAllPicksForBreakdown()
          }
        } catch (e) {
          console.error('🔴 [Dashboard] Aggregation API error. Falling back to client aggregation:', e)
          loadAllPicksForBreakdown()
        }
      }
      detectColumn()
    }
  }, [shouldShowTeamBreakdownButton, loadAllPicksForBreakdown])

  // Log when the modal opens and what data we have
  useEffect(() => {
    if (!showTeamBreakdownModal) return
    console.log('🟢 [Dashboard] Opening Team Breakdown Modal. aggregatedTeamPicks:', aggregatedTeamPicks.length, 'currentWeekColumn:', currentWeekColumn, 'fallback picks length:', allPicksForBreakdown.length)
    if (aggregatedTeamPicks.length === 0 && allPicksForBreakdown.length === 0) {
      console.warn('🟡 [Dashboard] Modal opened with no data yet. Waiting for fetch or fallback to complete...')
    }
  // Only re-log when counts/column change to avoid spam from countdown re-renders
  }, [showTeamBreakdownModal, aggregatedTeamPicks.length, currentWeekColumn, allPicksForBreakdown.length])

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

      // Get current week matchups and display info from API (single call)
      let week = 1 // Default fallback
      let matchupsData: Matchup[] = []
      let apiSeasonFilter = 'REG1'
      let apiCurrentWeek = 1
      
      try {
        const matchupsResponse = await fetch(`/api/matchups?userId=${user.id}`, {
          credentials: 'include'
        })
        const matchupsResult = await matchupsResponse.json()
        
        if (matchupsResult.success) {
          week = matchupsResult.current_week || parseInt((matchupsResult.seasonFilter || 'REG1').replace('REG', '').replace('PRE', '').replace('POST', '')) || 1
          setCurrentWeek(week)
          setCurrentWeekDisplay(matchupsResult.week_display)
          setApiSeasonFilter(matchupsResult.seasonFilter)
          setApiCurrentWeek(week)
          
          apiSeasonFilter = matchupsResult.seasonFilter
          apiCurrentWeek = week
          
          matchupsData = matchupsResult.matchups.map((matchup: ApiMatchup) => ({
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
            winner: matchup.winner,
            season: matchup.season
          }))
        } else {
          // Fallback to database settings
          const { data: settings } = await supabase
            .from('global_settings')
            .select('key, value')
            .in('key', ['current_week'])

          const weekSetting = settings?.find(s => s.key === 'current_week')
          week = weekSetting ? parseInt(weekSetting.value) : 1
          setCurrentWeek(week)
          
          // Format week display based on database value
          const weekDisplay = week <= 0 ? `Preseason Week ${Math.abs(week) + 1}` : `Week ${week}`
          setCurrentWeekDisplay(weekDisplay)
        }
      } catch (error) {
        console.error('Error fetching matchups:', error)
        // Fallback to database settings
        const { data: settings } = await supabase
          .from('global_settings')
          .select('key, value')
          .in('key', ['current_week'])

        const weekSetting = settings?.find(s => s.key === 'current_week')
        week = weekSetting ? parseInt(weekSetting.value) : 1
        setCurrentWeek(week)
        
        // Format week display based on database value
        const weekDisplay = week <= 0 ? `Preseason Week ${Math.abs(week) + 1}` : `Week ${week}`
        setCurrentWeekDisplay(weekDisplay)
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
      
      // Load user's picks for their default week
      console.log('Debug: Loading picks for user:', user.id)
      
      // Use the same detected week/season from the API used above
      const { isUserTester } = await import('@/lib/user-types-client')
      const isTester = await isUserTester(user.id)
      
      // Determine column from apiSeasonFilter/apiCurrentWeek (use local variables)
      let userDefaultWeekColumn = 'reg1_team_matchup_id'
      if (apiSeasonFilter && apiSeasonFilter.startsWith('PRE')) {
        userDefaultWeekColumn = isTester
          ? `pre${apiCurrentWeek}_team_matchup_id`
          : 'reg1_team_matchup_id'
      } else {
        userDefaultWeekColumn = `reg${apiCurrentWeek}_team_matchup_id`
      }
      
      console.log('Debug: Season detection info:', {
        apiSeasonFilter,
        apiCurrentWeek,
        isTester,
        userDefaultWeekColumn,
        userType: profileData?.user_type,
        isAdmin: profileData?.is_admin
      })
      
      const { data: allUserPicksForWeek, error: picksError } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)
      
      console.log('Debug: All picks query result:', { allUserPicksForWeek, picksError })
      console.log('Debug: Looking for picks in column:', userDefaultWeekColumn)
      
      // Get all matchups for the user's picks (for elimination details)
      const { data: allMatchups } = await supabase
        .from('matchups')
        .select('*')
        .eq('season', apiSeasonFilter)
        .order('week', { ascending: true })
        .order('game_time', { ascending: true })
      
      // Transform picks to work with the new table structure - show picks for user's default week
      const userPicksData: Pick[] = allUserPicksForWeek?.map(pick => {
        // Check if this pick is allocated to the user's default week
        const userDefaultWeekValue = pick[userDefaultWeekColumn as keyof typeof pick]
        
        console.log(`Debug: Processing pick ${pick.pick_name}:`, {
          userDefaultWeekColumn,
          userDefaultWeekValue,
          pick_id: pick.id,
          allColumns: Object.keys(pick).filter(key => key.includes('_team_matchup_id'))
        })
        
        let teamName = null
        let matchupId = null
        
        if (userDefaultWeekValue) {
          // Parse the team_matchup_id format: "matchupId_teamName"
          const parts = userDefaultWeekValue.split('_')
          if (parts.length >= 2) {
            matchupId = parts[0]
            teamName = parts.slice(1).join('_') // In case team name has underscores
          }
        }
        
        console.log(`Debug: Parsed values for pick ${pick.pick_name}:`, {
          teamName,
          matchupId
        })
        
        // Get elimination details if the pick is eliminated
        const eliminationDetails = pick.status === 'eliminated' && matchupId ? 
          getEliminationDetails({
            ...pick,
            matchup_id: matchupId,
            team_picked: teamName
          } as Pick, allMatchups || []) : undefined
        
        // Return ALL picks - the status will determine how they're displayed
        return {
          id: pick.id,
          user_id: pick.user_id,
          picks_count: pick.picks_count,
          status: pick.status,
          pick_name: pick.pick_name,
          matchup_id: matchupId,
          team_picked: teamName,
          eliminationDetails,
          created_at: pick.created_at,
          updated_at: pick.updated_at
        } as Pick
      }) || []
      
      console.log('Debug: Final transformed picks for current week:', userPicksData)
      
      setUserPicks(userPicksData || [])
      setDbPicksRemaining(dbPicksRemaining)
      setPicksSaved((userPicksData || []).length > 0) // Set saved state based on existing picks
      setIsEditing(false) // Reset edit state when data is loaded
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [user, router])

  useEffect(() => {
    if (user && !authLoading) {
      loadData()
    }
  }, [user, authLoading, loadData])

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
        team_picked: (pick as Record<string, unknown>).team_picked as string || (pick as Record<string, unknown>).away_team as string || (pick as Record<string, unknown>).home_team as string || '',
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

  const handlePicksAllocated = (newPicks: Array<Record<string, unknown>>) => {
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

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <div className="app-bg flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-10 bg-gray-200 rounded mb-6"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login')
    return null
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
        {/* Picks Deadline or Team Breakdown Button */}
        {deadline && (
          shouldShowTeamBreakdownButton() ? (
            // Show Team Breakdown Button
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 sm:p-6 mb-4 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div className="flex items-center">
                  <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-green-200" />
                  <div>
                    <h3 className="text-sm sm:text-lg font-semibold text-white">See This Week&apos;s Picks!</h3>
                    <p className="text-xs sm:text-base text-green-200">
                      View team breakdown for {currentWeekDisplay}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTeamBreakdownModal(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>View Team Breakdown</span>
                </button>
              </div>
            </div>
          ) : (
            // Show Countdown Timer
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
          )
        )}



        {/* Mobile-Optimized Grid for Navigation Cards - HIDDEN */}
        {/* 
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
        */}

        {/* How to Pick and Rules - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-3 sm:mb-6">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm sm:text-lg font-semibold text-white mb-2">How to Pick:</h3>
            <div className="text-xs sm:text-base text-blue-200 space-y-1">
              <p>• Click on a team matchup card to open the pick selection popup</p>
              <p>• Select which pick you want to allocate to that team</p>
              <p>• Click &quot;PICK TEAM TO LOSE&quot; to confirm your selection</p>
              <p>• To change your pick, click on the team and choose that pick to update</p>
              <p>• If your picked team wins, you&apos;re eliminated</p>
              <p>• If your picked team loses, your pick moves on to next week</p>
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
              <h2 className="text-base sm:text-xl font-semibold text-white">Your Current Picks</h2>
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
                          const teamName = (pick as Record<string, unknown>).team_picked as string || null
                          
                          // Calculate dynamic status based on game results
                          const pickStatus = calculatePickStatus(pick, matchups)
                          
                          // Get team colors if team is selected (gray out eliminated picks)
                          const teamColors = pick.status === 'eliminated' ? null : (teamName ? getTeamColors(teamName) : null)
                          
                          // Format team display name
                          let teamDisplayName = 'NOT PICKED YET'
                          
                          if (pick.status === 'eliminated') {
                            // For eliminated picks, show elimination details with week
                            if (pick.eliminationDetails) {
                              teamDisplayName = `${getFullTeamName(pick.eliminationDetails.chosenTeam)} vs ${getFullTeamName(pick.eliminationDetails.opponent)}`
                            } else {
                              const eliminatedTeam = getEliminatedTeamName(pick)
                              const eliminationWeek = getEliminationWeek(pick, matchups)
                              if (eliminatedTeam) {
                                const weekText = eliminationWeek ? ` (eliminated ${eliminationWeek})` : ' (ELIMINATED)'
                                teamDisplayName = `${getFullTeamName(eliminatedTeam)}${weekText}`
                              } else {
                                const weekText = eliminationWeek ? `ELIMINATED ${eliminationWeek}` : 'ELIMINATED'
                                teamDisplayName = weekText
                              }
                            }
                          } else if (teamName) {
                            teamDisplayName = `${getFullTeamName(teamName)} to LOSE`
                          }
                          
                          return (
                            <div 
                              key={pick.id} 
                              className={`group border rounded-lg p-2 transition-all relative overflow-hidden ${
                                pick.status === 'eliminated' 
                                  ? 'border-gray-500/30 bg-gray-600/20 opacity-60' 
                                  : 'border-white/10 hover:opacity-90'
                              }`}
                              style={{
                                background: pick.status === 'eliminated' 
                                  ? 'rgba(75, 85, 99, 0.2)' // gray-600/20
                                  : teamColors 
                                    ? `linear-gradient(135deg, ${teamColors.primary}20, ${teamColors.secondary}20)`
                                    : 'rgba(255, 255, 255, 0.05)',
                                borderColor: pick.status === 'eliminated' 
                                  ? 'rgba(107, 114, 128, 0.3)' // gray-500/30
                                  : teamColors ? `${teamColors.primary}40` : 'rgba(255, 255, 255, 0.1)'
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
                                        className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-[12px] sm:text-[16px] focus:outline-none focus:border-blue-400"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') savePickName()
                                          if (e.key === 'Escape') cancelEditPick()
                                        }}
                                        autoFocus
                                      />
                                    ) : (
                                      <div 
                                        className="text-[12px] sm:text-[16px] font-medium text-white truncate underline cursor-pointer hover:text-blue-200 transition-colors"
                                        onClick={() => startEditingPick(pick)}
                                        title="Click to edit pick name"
                                      >
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
                                  <div className="flex-1 flex items-center justify-center px-1 sm:px-2 min-w-0">
                                    <div 
                                      className="text-[12px] sm:text-[16px] font-medium text-center w-full absolute left-1/2 transform -translate-x-1/2"
                                      style={{ 
                                        color: teamColors ? teamColors.text : '#93c5fd', // blue-200 fallback
                                        textAlign: 'center',
                                        width: 'auto',
                                        maxWidth: '60%'
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
                          const teamName = (pick as Record<string, unknown>).team_picked as string || null
                          
                          // Calculate dynamic status based on game results
                          const pickStatus = calculatePickStatus(pick, matchups)
                          
                          // Get team colors if team is selected (gray out eliminated picks)
                          const teamColors = pick.status === 'eliminated' ? null : (teamName ? getTeamColors(teamName) : null)
                          
                          // Format team display name
                          let teamDisplayName = 'NOT PICKED YET'
                          
                          if (pick.status === 'eliminated') {
                            // For eliminated picks, show elimination details with week
                            if (pick.eliminationDetails) {
                              teamDisplayName = `${getFullTeamName(pick.eliminationDetails.chosenTeam)} vs ${getFullTeamName(pick.eliminationDetails.opponent)}`
                            } else {
                              const eliminatedTeam = getEliminatedTeamName(pick)
                              const eliminationWeek = getEliminationWeek(pick, matchups)
                              if (eliminatedTeam) {
                                const weekText = eliminationWeek ? ` (eliminated ${eliminationWeek})` : ' (ELIMINATED)'
                                teamDisplayName = `${getFullTeamName(eliminatedTeam)}${weekText}`
                              } else {
                                const weekText = eliminationWeek ? `ELIMINATED ${eliminationWeek}` : 'ELIMINATED'
                                teamDisplayName = weekText
                              }
                            }
                          } else if (teamName) {
                            teamDisplayName = `${getFullTeamName(teamName)} to LOSE`
                          }
                          
                          return (
                            <div 
                              key={pick.id} 
                              className={`group border rounded-lg p-2 transition-all relative overflow-hidden ${
                                pick.status === 'eliminated' 
                                  ? 'border-gray-500/30 bg-gray-600/20 opacity-60' 
                                  : 'border-white/10 hover:opacity-90'
                              }`}
                              style={{
                                background: pick.status === 'eliminated' 
                                  ? 'rgba(75, 85, 99, 0.2)' // gray-600/20
                                  : teamColors 
                                    ? `linear-gradient(135deg, ${teamColors.primary}20, ${teamColors.secondary}20)`
                                    : 'rgba(255, 255, 255, 0.05)',
                                borderColor: pick.status === 'eliminated' 
                                  ? 'rgba(107, 114, 128, 0.3)' // gray-500/30
                                  : teamColors ? `${teamColors.primary}40` : 'rgba(255, 255, 255, 0.1)'
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
                                        className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-[12px] sm:text-[16px] focus:outline-none focus:border-blue-400"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') savePickName()
                                          if (e.key === 'Escape') cancelEditPick()
                                        }}
                                        autoFocus
                                      />
                                    ) : (
                                      <div 
                                        className="text-[12px] sm:text-[16px] font-medium text-white truncate underline cursor-pointer hover:text-blue-200 transition-colors"
                                        onClick={() => startEditingPick(pick)}
                                        title="Click to edit pick name"
                                      >
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
                                  <div className="flex-1 flex items-center justify-center px-1 sm:px-2 min-w-0">
                                    <div 
                                      className="text-[12px] sm:text-[16px] font-medium text-center w-full absolute left-1/2 transform -translate-x-1/2"
                                      style={{ 
                                        color: teamColors ? teamColors.text : '#93c5fd', // blue-200 fallback
                                        textAlign: 'center',
                                        width: 'auto',
                                        maxWidth: '60%'
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
                {matchups && matchups.length > 0 && (() => {
                  const weekDateRange = getWeekDateRange(matchups)
                  return (
                    <p className="text-xs sm:text-base text-blue-100">
                      Week of {weekDateRange.weekStartFormatted} - {weekDateRange.weekEndFormatted} • {matchups.length} games scheduled
                    </p>
                  )
                })()}
                {(!matchups || matchups.length === 0) && (
                  <p className="text-xs sm:text-base text-blue-100">{matchups?.length || 0} games scheduled</p>
                )}
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

              </div>
            </div>
          </div>
          <div className="p-3 sm:p-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 sm:px-4 py-3 rounded-lg mb-3 sm:mb-6 text-xs sm:text-base">
                {error}
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
                                showControls={true}
                                picksSaved={picksSaved}
                                userPicks={userPicks}
                                picksRemaining={picksRemaining}
                                checkDeadlinePassed={checkDeadlinePassed}
                                addPickToTeam={addPickToTeam}
                                removePickFromTeam={removePickFromTeam}
                                formatGameTime={formatGameTime}
                                getPicksForMatchup={getPicksForMatchup}
                                isPickingAllowed={true}
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

      {/* Team Picks Breakdown Modal */}
      <TeamPicksBreakdownModal
        isOpen={showTeamBreakdownModal}
        onClose={() => setShowTeamBreakdownModal(false)}
        aggregatedTeamPicks={aggregatedTeamPicks}
        picks={allPicksForBreakdown}
        currentWeekColumn={currentWeekColumn}
      />
    </div>
  )
} 