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
          const response = await fetch('/api/check-admin-users')
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
        // Fetch all the data we need
        const [usersResponse, purchasesResponse, picksResponse] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/purchases'),
          fetch('/api/admin/picks')
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

          <button
            onClick={() => setShowStatsModal(true)}
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 hover:bg-white/15 transition-colors cursor-pointer"
          >
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Settings className="w-6 h-6 text-orange-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Active Picks</p>
                <p className="text-2xl font-bold text-white">{activePicks.length}</p>
                {eliminatedPicks.length > 0 && (
                  <p className="text-sm text-red-300">({eliminatedPicks.length} eliminated)</p>
                )}
                <p className="text-xs text-orange-200 mt-1">Click to view details</p>
              </div>
            </div>
          </button>
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
        users={users}
        totalPicksPurchased={totalPicksPurchased}
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