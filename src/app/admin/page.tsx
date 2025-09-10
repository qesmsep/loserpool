'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings, Users, Calendar, Trophy, Target } from 'lucide-react'
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
        
        console.log('🔍 Admin page: Session check:', {
          hasSession: !!session,
          hasAccessToken: !!accessToken,
          userEmail: session?.user?.email
        })
        
        // Prepare headers with authorization
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`
          console.log('🔍 Admin page: Setting Authorization header with bearer token')
        } else {
          console.log('🔍 Admin page: No access token available')
        }

        // Fetch all the data we need
        const [usersResponse, purchasesResponse, picksResponse, defaultPickResponse] = await Promise.all([
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
          })
        ])

        console.log('🔍 Admin page: API responses:', {
          users: usersResponse.status,
          purchases: purchasesResponse.status,
          picks: picksResponse.status
        })

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
        } catch (e) {
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
  const getWeekColumnFromWeek = (week?: number | null): string | null => {
    if (!week || week < 1) return null
    if (week <= 3) return `pre${week}_team_matchup_id`
    if (week <= 20) return `reg${week - 3}_team_matchup_id`
    const postIdx = week - 20
    if (postIdx >= 1 && postIdx <= 4) return `post${postIdx}_team_matchup_id`
    return null
  }

  // Strict: use only the mapped current week column; if unknown, treat as error (null)
  const currentWeekColumnName = getWeekColumnFromWeek(defaultPickData?.currentWeek)
  const currentWeekActiveCount = currentWeekColumnName === null
    ? null
    : picks.reduce((sum, p) => sum + ((p as unknown as Record<string, unknown>)[currentWeekColumnName] ? 1 : 0), 0)

  // Manual conversion removed

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
        

        {/* Current Week Default Pick */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-orange-200" />
            {defaultPickData ? `Week ${defaultPickData.currentWeek} Default Pick` : 'Current Week Default Pick'}
          </h2>
          
          {loading ? (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-blue-200">Loading default pick information...</p>
            </div>
          ) : defaultPickData && defaultPickData.defaultPick ? (
            <div className="space-y-2">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {defaultPickData.defaultPick.away_team} @ {defaultPickData.defaultPick.home_team}
                    </h3>
                    <p className="text-xs text-blue-200">
                      {new Date(defaultPickData.defaultPick.game_time).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-orange-300">
                      {defaultPickData.defaultPick.favored_team}
                    </div>
                    <div className="text-xs text-orange-200">
                      Favored by {defaultPickData.defaultPick.spread_magnitude}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : defaultPickData ? (
            <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
              <p className="text-gray-200">
                No default pick available for Week {defaultPickData.currentWeek}. 
                This could mean no games are scheduled or no spreads are available.
              </p>
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-200">
                Unable to load default pick information. Please check the console for errors.
              </p>
            </div>
          )}
        </div>

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
            <h3 className="text-lg font-semibold text-white mb-2">Default Pick</h3>
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
                        {defaultPickData.defaultPick.favored_team}
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

        {/* Recent Purchases */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Recent Purchases</h2>
          </div>
          <div className="p-6">
            {purchases && purchases.length > 0 ? (
              <div className="space-y-4">
                {purchases.slice(0, 5).map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between p-3 border border-white/20 rounded">
                    <div>
                      <p className="font-medium text-white">
                        {purchase.picks_count} pick{purchase.picks_count > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-blue-200">
                        ${(purchase.amount_paid / 100).toFixed(2)} - {purchase.created_at}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      purchase.status === 'completed' ? 'bg-green-500/20 text-green-200' :
                      purchase.status === 'pending' ? 'bg-yellow-500/20 text-yellow-200' :
                      'bg-red-500/20 text-red-200'
                    }`}>
                      {purchase.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-blue-200 text-center py-4">No purchases found</p>
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
      />
    </div>
  )
} 