'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings, Users, Calendar, Trophy } from 'lucide-react'
import AdminHeader from '@/components/admin-header'
import AdminStatsModal from '@/components/admin-stats-modal'
import TeamPicksBreakdownModal from '@/components/team-picks-breakdown-modal'
import { useAuth } from '@/components/auth-provider'

interface Pick {
  id: string
  user_id: string
  pick_name: string
  status: string
  picks_count: number
  created_at: string
  updated_at: string
  reg1_team_matchup_id?: string
  reg2_team_matchup_id?: string
  reg3_team_matchup_id?: string
  reg4_team_matchup_id?: string
  reg5_team_matchup_id?: string
  reg6_team_matchup_id?: string
  reg7_team_matchup_id?: string
  reg8_team_matchup_id?: string
  reg9_team_matchup_id?: string
  reg10_team_matchup_id?: string
  reg11_team_matchup_id?: string
  reg12_team_matchup_id?: string
  reg13_team_matchup_id?: string
  reg14_team_matchup_id?: string
  reg15_team_matchup_id?: string
  reg16_team_matchup_id?: string
  reg17_team_matchup_id?: string
  reg18_team_matchup_id?: string
  pre1_team_matchup_id?: string
  pre2_team_matchup_id?: string
  pre3_team_matchup_id?: string
  post1_team_matchup_id?: string
  post2_team_matchup_id?: string
  post3_team_matchup_id?: string
  post4_team_matchup_id?: string
}

interface User {
  id: string
  email: string
  username: string | null
  first_name: string | null
  last_name: string | null
}

interface Purchase {
  id: string
  user_id: string
  amount_paid: number
  picks_count: number
  status: string
  created_at: string
}

interface DefaultPickData {
  currentWeek: number
  defaultPick: {
    matchup_id: string
    away_team: string
    home_team: string
    favored_team: string
    spread_magnitude: number
    game_time: string
  } | null
  usersNeedingPicks: Array<{
    id: string
    email: string
    username: string
    name: string
    picksAvailable: number
  }>
  userCount: number
  totalPicksToAssign: number
}

interface WeeklyStats {
  week: number
  weekName: string
  activePicks: number
  eliminatedPicks: number
  remainingPicks: number
}

interface TeamPickBreakdown {
  week: number
  weekName: string
  teamPicks: Array<{
    team: string
    pickCount: number
    teamData?: {
      name: string
      abbreviation: string
      primary_color: string
      secondary_color: string
    }
    gameResult: 'won' | 'lost' | 'tie' | 'pending'
  }>
}

// Helper function to get team colors from team data
const getTeamColors = (teamData?: { primary_color: string; secondary_color: string }) => {
  if (!teamData) {
    return { primary: '#6B7280', secondary: '#9CA3AF' }
  }
  
  return {
    primary: teamData.primary_color || '#6B7280',
    secondary: teamData.secondary_color || '#9CA3AF'
  }
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [totalUsers, setTotalUsers] = useState(0)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showTeamBreakdownModal, setShowTeamBreakdownModal] = useState(false)
  const [defaultPickData, setDefaultPickData] = useState<DefaultPickData | null>(null)
  // Removed weekCompletionStatus UI/state to simplify and avoid unused state/types
  const [currentWeekActive, setCurrentWeekActive] = useState<{ count: number; col: string } | null>(null)
  const [currentWeekActiveError, setCurrentWeekActiveError] = useState(false)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [teamPickBreakdown, setTeamPickBreakdown] = useState<TeamPickBreakdown[]>([])
  const [currentTeamBreakdownWeek, setCurrentTeamBreakdownWeek] = useState<number | null>(null)
  const [loadingTeamBreakdown, setLoadingTeamBreakdown] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  useEffect(() => {
    // Check if user is authenticated and is admin
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      
      // Check if user is admin
      const checkAdminStatus = async () => {
        try {
          const response = await fetch('/api/check-admin-users', {
            credentials: 'include' // Include cookies for authentication
          })
          if (!response.ok) {
            router.push('/dashboard')
            return
          }
        } catch (error) {
          console.error('Error checking admin status:', error)
          router.push('/dashboard')
          return
        }
      }
      
      checkAdminStatus()
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (authLoading || !user) return

    const loadData = async () => {
      try {
        // Get the current session token using the supabase client directly
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token
        
        // Prepare headers with authorization
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`
        }

        // Fetch all the data we need
        const [usersResponse, purchasesResponse, picksResponse, defaultPickResponse, weeklyStatsResponse, teamPickBreakdownResponse] = await Promise.all([
          fetch('/api/admin/users', { 
            credentials: 'include',
            headers
          }),
          fetch('/api/admin/purchases', { 
            credentials: 'include',
            headers
          }),
          fetch('/api/admin/picks', { 
            credentials: 'include',
            headers
          }),
          fetch('/api/admin/current-week-default-pick', { 
            credentials: 'include',
            headers
          }),
          fetch('/api/admin/weekly-stats', { 
            credentials: 'include',
            headers
          }),
          fetch('/api/admin/team-pick-breakdown', { 
            credentials: 'include',
            headers
          })
        ])


        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData.users || [])
          setTotalUsers(usersData.users?.length || 0)
        }

        if (purchasesResponse.ok) {
          const purchasesData = await purchasesResponse.json()
          setPurchases(purchasesData.purchases || [])
        }

        if (picksResponse.ok) {
          const picksData = await picksResponse.json()
          setPicks(picksData.picks || [])
        }

        if (defaultPickResponse.ok) {
          const defaultPickData = await defaultPickResponse.json()
          setDefaultPickData(defaultPickData)
        } else {
          console.error('Default pick API error:', defaultPickResponse.status)
        }

        if (weeklyStatsResponse.ok) {
          const weeklyStatsData = await weeklyStatsResponse.json()
          setWeeklyStats(weeklyStatsData.weeklyStats || [])
        } else {
          console.error('Weekly stats API error:', weeklyStatsResponse.status)
        }

        if (teamPickBreakdownResponse.ok) {
          const teamPickBreakdownData = await teamPickBreakdownResponse.json()
          console.log('🔍 Admin page: Team pick breakdown data:', teamPickBreakdownData)
          console.log('🔍 Admin page: First week details:', teamPickBreakdownData.teamPickBreakdown?.[0])
          console.log('🔍 Admin page: First team pick details:', teamPickBreakdownData.teamPickBreakdown?.[0]?.teamPicks?.[0])
          console.log('🔍 Admin page: Team picks array length:', teamPickBreakdownData.teamPickBreakdown?.[0]?.teamPicks?.length)
          setTeamPickBreakdown(teamPickBreakdownData.teamPickBreakdown || [])
          // Set the current week for team breakdown
          if (teamPickBreakdownData.teamPickBreakdown && teamPickBreakdownData.teamPickBreakdown.length > 0) {
            setCurrentTeamBreakdownWeek(teamPickBreakdownData.teamPickBreakdown[0].week)
          }
        } else {
          console.error('Team pick breakdown API error:', teamPickBreakdownResponse.status)
          const errorText = await teamPickBreakdownResponse.text()
          console.error('Team pick breakdown API error details:', errorText)
        }

        // Use canonical server endpoint to get exact column name and DB count
        try {
          const res = await fetch('/api/admin/current-week-active-picks', {
            credentials: 'include',
            headers
          })
          if (!res.ok) {
            setCurrentWeekActiveError(true)
          } else {
            const data = await res.json()
            setCurrentWeekActive({ count: data.currentWeekActivePicksCount, col: data.weekColumnName })
            setCurrentWeekActiveError(false)
          }
        } catch {
          setCurrentWeekActiveError(true)
        }

        // Note: week status card removed to simplify admin view.
      } catch (error) {
        console.error('Error loading admin data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, authLoading])

  // Function to debug Week 1 eliminations
  const debugWeek1Eliminations = async () => {
    try {
      // Get the current session token
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch('/api/admin/weekly-stats?debug-week1=true', {
        credentials: 'include',
        headers
      })

      if (response.ok) {
        const data = await response.json()
        if (data.debugResults) {
          console.log('🔍 Week 1 Debug Results:', data.debugResults)
          console.log('🔍 Eliminated Picks:', data.debugResults.eliminatedPicks)
          console.log('🔍 Correct Picks:', data.debugResults.correctPicks)
          console.log('🔍 Summary:', data.debugResults.summary)
          alert(`Week 1 Debug Complete! Check console for details.\n\nEliminated: ${data.debugResults.summary.totalEliminated} users (${data.debugResults.summary.totalEliminatedPickCount} picks)\nCorrect: ${data.debugResults.summary.totalCorrect} users (${data.debugResults.summary.totalCorrectPickCount} picks)`)
        } else {
          alert('No debug results found')
        }
      } else {
        console.error('Error loading Week 1 debug:', response.status)
        alert(`Error: ${response.status}`)
      }
    } catch (error) {
      console.error('Error loading Week 1 debug:', error)
      alert(`Error: ${error}`)
    }
  }

  // Function to load team breakdown for a specific week
  const loadTeamBreakdownForWeek = async (week: number) => {
    if (loadingTeamBreakdown) return
    
    setLoadingTeamBreakdown(true)
    try {
      // Get the current session token
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch(`/api/admin/team-pick-breakdown?week=${week}`, {
        credentials: 'include',
        headers
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`🔍 Admin page: Loaded team breakdown for week ${week}:`, data)
        console.log(`🔍 Admin page: First team pick game result:`, data.teamPickBreakdown?.[0]?.teamPicks?.[0]?.gameResult)
        setTeamPickBreakdown(data.teamPickBreakdown || [])
        setCurrentTeamBreakdownWeek(week)
      } else {
        console.error('Error loading team breakdown for week:', week)
      }
    } catch (error) {
      console.error('Error loading team breakdown:', error)
    } finally {
      setLoadingTeamBreakdown(false)
    }
  }

  const totalRevenue = purchases?.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount_paid, 0) || 0
  const totalPicksPurchased = purchases?.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.picks_count, 0) || 0
  const activePicks = picks?.filter(p => p.status === 'active') || []
  const eliminatedPicks = picks?.filter(p => p.status === 'eliminated') || []
  const safePicks = picks?.filter(p => p.status === 'safe') || []
  const pendingPicks = picks?.filter(p => p.status === 'pending') || []

  // Compute total of all non-null week-column values across all picks (adds every value that isn't null)
  const weekColumns = [
    'pre1_team_matchup_id','pre2_team_matchup_id','pre3_team_matchup_id',
    'reg1_team_matchup_id','reg2_team_matchup_id','reg3_team_matchup_id','reg4_team_matchup_id','reg5_team_matchup_id','reg6_team_matchup_id','reg7_team_matchup_id','reg8_team_matchup_id','reg9_team_matchup_id','reg10_team_matchup_id','reg11_team_matchup_id','reg12_team_matchup_id','reg13_team_matchup_id','reg14_team_matchup_id','reg15_team_matchup_id','reg16_team_matchup_id','reg17_team_matchup_id','reg18_team_matchup_id',
    'post1_team_matchup_id','post2_team_matchup_id','post3_team_matchup_id','post4_team_matchup_id'
  ] as const

  const totalActivePicksComputed = picks.reduce((sum, p) => {
    let count = 0
    for (const key of weekColumns) {
      if ((p as unknown as Record<string, unknown>)[key]) count += 1
    }
    return sum + count
  }, 0)

  const weekNames: Record<string, string> = {
    pre1_team_matchup_id: 'Pre Season Week 1',
    pre2_team_matchup_id: 'Pre Season Week 2',
    pre3_team_matchup_id: 'Pre Season Week 3',
    reg1_team_matchup_id: 'Regular Season Week 1',
    reg2_team_matchup_id: 'Regular Season Week 2',
    reg3_team_matchup_id: 'Regular Season Week 3',
    reg4_team_matchup_id: 'Regular Season Week 4',
    reg5_team_matchup_id: 'Regular Season Week 5',
    reg6_team_matchup_id: 'Regular Season Week 6',
    reg7_team_matchup_id: 'Regular Season Week 7',
    reg8_team_matchup_id: 'Regular Season Week 8',
    reg9_team_matchup_id: 'Regular Season Week 9',
    reg10_team_matchup_id: 'Regular Season Week 10',
    reg11_team_matchup_id: 'Regular Season Week 11',
    reg12_team_matchup_id: 'Regular Season Week 12',
    reg13_team_matchup_id: 'Regular Season Week 13',
    reg14_team_matchup_id: 'Regular Season Week 14',
    reg15_team_matchup_id: 'Regular Season Week 15',
    reg16_team_matchup_id: 'Regular Season Week 16',
    reg17_team_matchup_id: 'Regular Season Week 17',
    reg18_team_matchup_id: 'Regular Season Week 18',
    post1_team_matchup_id: 'Post Season Week 1',
    post2_team_matchup_id: 'Post Season Week 2',
    post3_team_matchup_id: 'Post Season Week 3',
    post4_team_matchup_id: 'Post Season Week 4'
  }

  const activePicksCount = {
    totalActivePicks: totalActivePicksComputed,
    breakdown: weekColumns.map((col) => ({
      week_column: col,
      week_name: weekNames[col],
      pick_count: picks.reduce((sum, p) => sum + ((p as unknown as Record<string, unknown>)[col] ? 1 : 0), 0)
    })).filter(item => item.pick_count > 0)
  }

  // Current week's non-null cells only
  // const getWeekColumnFromWeek = (week?: number | null): string | null => {
  //   if (!week || week < 1) return null
  //   if (week <= 3) return `pre${week}_team_matchup_id`
  //   if (week <= 20) return `reg${week - 3}_team_matchup_id`
  //   const postIdx = week - 20
  //   if (postIdx >= 1 && postIdx <= 4) return `post${postIdx}_team_matchup_id`
  //   return null
  // }

  // Strict: use only the mapped current week column; if unknown, treat as error (null)
  // const currentWeekColumnName = getWeekColumnFromWeek(defaultPickData?.currentWeek)

  // Manual conversion removed

  // Select the likely winner (favorite) for the default pick card
  const favoriteTeamThisWeek = defaultPickData?.defaultPick
    ? (defaultPickData.defaultPick.favored_team === defaultPickData.defaultPick.away_team
      ? defaultPickData.defaultPick.home_team
      : defaultPickData.defaultPick.away_team)
    : null

  if (authLoading || loading) {
    return (
      <div className="app-bg min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading admin data...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="app-bg">
      <AdminHeader 
        title="Admin Panel"
        subtitle="Manage The Loser Pool"
        showBackButton={true}
        backHref="/dashboard"
        backText="Back to Dashboard"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Total Users</p>
                <p className="text-2xl font-bold text-white">{totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Trophy className="w-6 h-6 text-green-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Total Revenue</p>
                <p className="text-2xl font-bold text-white">${(totalRevenue / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">Picks Purchased</p>
                <p className="text-2xl font-bold text-white">{totalPicksPurchased}</p>
              </div>
            </div>
          </div>

          <div
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Settings className="w-6 h-6 text-orange-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Active Picks</p>
                <p className="text-2xl font-bold text-white">{currentWeekActiveError ? 'ERR' : (currentWeekActive?.count ?? 0)}</p>
                <div className="text-xs text-orange-200 mt-1 space-y-1">
                  {pendingPicks.length > 0 && (
                    <p className="text-blue-300">({pendingPicks.length} pending)</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Automatic Conversion Status */}
        

        {/* Current Week Default Pick - removed (condensed version exists below) */}

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/users"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 hover:bg-white/15 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Manage Users</h3>
            <p className="text-blue-200">View and manage user accounts</p>
          </Link>

          <Link
            href="/admin/purchases"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 hover:bg-white/15 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Purchase History</h3>
            <p className="text-blue-200">View all purchase transactions</p>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 hover:bg-white/15 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Pool Settings</h3>
            <p className="text-blue-200">Configure pool rules and dates</p>
          </Link>

          <button
            onClick={() => setShowTeamBreakdownModal(true)}
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 hover:bg-white/15 transition-colors cursor-pointer text-left"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Team Picks Breakdown</h3>
            <p className="text-blue-200">View teams picked to lose and pick counts</p>
          </button>

          {/* Replace Manual Conversion with condensed Default Pick card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              Week {defaultPickData?.currentWeek ?? ''} Default Pick
            </h3>
            {defaultPickData && defaultPickData.defaultPick ? (
              <div className="space-y-2">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-white">
                        {defaultPickData.defaultPick.away_team} @ {defaultPickData.defaultPick.home_team}
                      </h4>
                      <p className="text-xs text-blue-200">
                        {new Date(defaultPickData.defaultPick.game_time).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-orange-300">
                        {favoriteTeamThisWeek}
                      </div>
                      <div className="text-xs text-orange-200">
                        Favored by {defaultPickData.defaultPick.spread_magnitude}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-blue-200">No default pick available.</p>
            )}
          </div>
        </div>

        {/* Weekly Pick Statistics */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 mb-8">
          <div className="px-3 sm:px-6 py-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Weekly Pick Statistics</h2>
              <button
                onClick={debugWeek1Eliminations}
                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded text-sm transition-colors"
              >
                Debug Week 1
              </button>
            </div>
          </div>
          <div className="p-3 sm:p-6">
            {weeklyStats && weeklyStats.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-4 font-semibold text-white">Week</th>
                        <th className="text-right py-3 px-4 font-semibold text-white">Active Picks</th>
                        <th className="text-right py-3 px-4 font-semibold text-white">Picks Eliminated</th>
                        <th className="text-right py-3 px-4 font-semibold text-white">Remaining Picks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyStats.map((stat) => (
                        <tr key={stat.week} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-3 px-4 text-white">
                            <div>
                              <div className="font-medium">{stat.weekName}</div>
                              <div className="text-xs text-blue-200">Week {stat.week}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-blue-200 font-medium">
                            {stat.activePicks}
                          </td>
                          <td className="py-3 px-4 text-right text-red-200 font-medium">
                            {stat.eliminatedPicks}
                          </td>
                          <td className="py-3 px-4 text-right text-green-200 font-medium">
                            {stat.remainingPicks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {[...weeklyStats].reverse().map((stat) => (
                    <div key={stat.week} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-white">{stat.weekName}</div>
                          <div className="text-xs text-blue-200">Week {stat.week}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="text-xs text-blue-200 mb-1">Active</div>
                          <div className="text-lg font-bold text-blue-200">{stat.activePicks}</div>
                        </div>
                        <div>
                          <div className="text-xs text-red-200 mb-1">Eliminated</div>
                          <div className="text-lg font-bold text-red-200">{stat.eliminatedPicks}</div>
                        </div>
                    <div>
                          <div className="text-xs text-green-200 mb-1">Remaining</div>
                          <div className="text-lg font-bold text-green-200">{stat.remainingPicks}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-blue-200 text-center py-4">No weekly statistics available</p>
            )}
          </div>
        </div>

        {/* Week over Week Team Picks Breakdown */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 mb-8">
          <div className="px-3 sm:px-6 py-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Team Picks Breakdown</h2>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={() => currentTeamBreakdownWeek && loadTeamBreakdownForWeek(currentTeamBreakdownWeek - 1)}
                  disabled={loadingTeamBreakdown || !currentTeamBreakdownWeek || currentTeamBreakdownWeek <= 1}
                  className="px-2 sm:px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs sm:text-sm transition-colors"
                >
                  <span className="hidden sm:inline">← Previous Week</span>
                  <span className="sm:hidden">←</span>
                </button>
                <span className="text-white text-xs sm:text-sm px-1 sm:px-2">
                  {currentTeamBreakdownWeek ? `Week ${currentTeamBreakdownWeek}` : 'Loading...'}
                </span>
                <button
                  onClick={() => currentTeamBreakdownWeek && loadTeamBreakdownForWeek(currentTeamBreakdownWeek + 1)}
                  disabled={loadingTeamBreakdown || !currentTeamBreakdownWeek}
                  className="px-2 sm:px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs sm:text-sm transition-colors"
                >
                  <span className="hidden sm:inline">Next Week →</span>
                  <span className="sm:hidden">→</span>
                </button>
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-6">
            {loadingTeamBreakdown ? (
              <p className="text-blue-200 text-center py-4">Loading team breakdown...</p>
            ) : teamPickBreakdown && teamPickBreakdown.length > 0 ? (
              <div className="space-y-6">
                {teamPickBreakdown.map((weekData) => (
                  <div key={weekData.week} className="border border-white/20 rounded-lg p-3 sm:p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      {weekData.weekName}
                    </h3>
                    
                    {/* Desktop Layout - 3 columns */}
                    {!isMobile && (
                      <div className="grid grid-cols-3 gap-4">
                        {[0, 1, 2].map((colIndex) => {
                          // Calculate teams for this column - distribute all teams across 3 columns
                          const totalTeams = weekData.teamPicks.length
                          const teamsPerColumn = Math.ceil(totalTeams / 3)
                          const startIndex = colIndex * teamsPerColumn
                          const endIndex = Math.min(startIndex + teamsPerColumn, totalTeams)
                          const columnTeams = weekData.teamPicks.slice(startIndex, endIndex)
                          
                          return (
                            <div key={colIndex} className="space-y-2">
                              {columnTeams.map((teamPick) => {
                                const teamColors = getTeamColors(teamPick.teamData)
                                const displayName = teamPick.teamData?.name || teamPick.team
                                
                                // Determine pick count color based on game result
                                let pickCountBgColor = '#6B7280' // Default gray for pending
                                let pickCountTextColor = 'white'
                                
                                if (teamPick.gameResult === 'won') {
                                  // Team won - picks are incorrect (RED)
                                  pickCountBgColor = '#DC2626' // red-600
                                  pickCountTextColor = 'white'
                                } else if (teamPick.gameResult === 'lost') {
                                  // Team lost - picks are correct (GREEN)
                                  pickCountBgColor = '#16A34A' // green-600
                                  pickCountTextColor = 'white'
                                } else if (teamPick.gameResult === 'tie') {
                                  // Tie - picks are incorrect (RED)
                                  pickCountBgColor = '#DC2626' // red-600
                                  pickCountTextColor = 'white'
                                }
                                
                                return (
                                  <div 
                                    key={teamPick.team} 
                                    className="flex items-center justify-between p-2 rounded border border-white/10 hover:bg-white/5 transition-colors"
                                    style={{ 
                                      borderLeftColor: teamColors.primary,
                                      borderLeftWidth: '4px'
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-white text-sm font-medium">
                                        {displayName}
                                      </span>
                                      {teamPick.teamData?.abbreviation && (
                                        <span className="text-xs text-blue-200">
                                          {teamPick.teamData.abbreviation}
                                        </span>
                                      )}
                                    </div>
                                    <span 
                                      className="text-lg font-bold px-3 py-2 rounded-lg"
                                      style={{ 
                                        backgroundColor: pickCountBgColor,
                                        color: pickCountTextColor
                                      }}
                                    >
                                      {teamPick.pickCount}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Mobile/Tablet Layout - Single column */}
                    {isMobile && (
                      <div className="space-y-2">
                      {weekData.teamPicks.map((teamPick) => {
                        const teamColors = getTeamColors(teamPick.teamData)
                        const displayName = teamPick.teamData?.name || teamPick.team
                        
                        // Determine pick count color based on game result
                        let pickCountBgColor = '#6B7280' // Default gray for pending
                        let pickCountTextColor = 'white'
                        
                        if (teamPick.gameResult === 'won') {
                          // Team won - picks are incorrect (RED)
                          pickCountBgColor = '#DC2626' // red-600
                          pickCountTextColor = 'white'
                        } else if (teamPick.gameResult === 'lost') {
                          // Team lost - picks are correct (GREEN)
                          pickCountBgColor = '#16A34A' // green-600
                          pickCountTextColor = 'white'
                        } else if (teamPick.gameResult === 'tie') {
                          // Tie - picks are incorrect (RED)
                          pickCountBgColor = '#DC2626' // red-600
                          pickCountTextColor = 'white'
                        }
                        
                        return (
                          <div 
                            key={teamPick.team} 
                            className="flex items-center justify-between p-2 rounded border border-white/10 hover:bg-white/5 transition-colors"
                            style={{ 
                              borderLeftColor: teamColors.primary,
                              borderLeftWidth: '3px'
                            }}
                          >
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-white text-sm font-medium truncate">
                                {displayName}
                              </span>
                              {teamPick.teamData?.abbreviation && (
                                <span className="text-xs text-blue-200">
                                  {teamPick.teamData.abbreviation}
                                </span>
                              )}
                            </div>
                            <span 
                              className="text-base font-bold px-2 py-1 rounded-lg ml-2 flex-shrink-0"
                              style={{ 
                                backgroundColor: pickCountBgColor,
                                color: pickCountTextColor
                              }}
                            >
                              {teamPick.pickCount}
                    </span>
                          </div>
                        )
                      })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-blue-200 text-center py-4">No team pick breakdown available</p>
            )}
          </div>
        </div>

      </div>

      {/* Stats Modal */}
              <AdminStatsModal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          activePicks={activePicks}
          eliminatedPicks={eliminatedPicks}
          safePicks={safePicks}
          pendingPicks={pendingPicks}
          activePicksCount={activePicksCount}
          users={users}
          totalRevenue={totalRevenue}
        />

      {/* Team Breakdown Modal */}
      <TeamPicksBreakdownModal
        isOpen={showTeamBreakdownModal}
        onClose={() => setShowTeamBreakdownModal(false)}
        picks={picks}
        currentWeekColumn={currentWeekActive?.col || 'reg1_team_matchup_id'}
      />
    </div>
  )
} 