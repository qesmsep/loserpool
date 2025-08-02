import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowLeft, Settings, Users, Calendar, Trophy } from 'lucide-react'

export default async function AdminPage() {
  const user = await requireAdmin()
  const supabase = await createServerSupabaseClient()

  // Get pool statistics
  const { data: users } = await supabase
    .from('users')
    .select('id, username, email, created_at')

  const { data: purchases } = await supabase
    .from('purchases')
    .select('*')
    .eq('status', 'completed')

  const { data: matchups } = await supabase
    .from('matchups')
    .select('*')
    .order('week', { ascending: false })
    .limit(5)

  const { data: picks } = await supabase
    .from('picks')
    .select('*')

  const totalRevenue = purchases?.reduce((sum, p) => sum + p.amount, 0) || 0
  const totalPicksPurchased = purchases?.reduce((sum, p) => sum + p.picks_count, 0) || 0
  const activePicks = picks?.filter(p => p.status === 'active').length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-gray-600">Manage The Loser Pool</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${totalRevenue}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Picks Purchased</p>
                <p className="text-2xl font-bold text-gray-900">{totalPicksPurchased}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Settings className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Picks</p>
                <p className="text-2xl font-bold text-gray-900">{activePicks}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/users"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Users</h3>
            <p className="text-gray-600">View and manage user accounts</p>
          </Link>

          <Link
            href="/admin/matchups"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Matchups</h3>
            <p className="text-gray-600">Add and edit weekly matchups</p>
          </Link>

          <Link
            href="/admin/results"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Update Results</h3>
            <p className="text-gray-600">Update game scores and results</p>
          </Link>

          <Link
            href="/admin/purchases"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Purchase History</h3>
            <p className="text-gray-600">View all purchase transactions</p>
          </Link>

          <Link
            href="/admin/invitations"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Invitations</h3>
            <p className="text-gray-600">Manage user invitations</p>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pool Settings</h3>
            <p className="text-gray-600">Configure pool rules and dates</p>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Matchups */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Matchups</h2>
            </div>
            <div className="p-6">
              {matchups && matchups.length > 0 ? (
                <div className="space-y-4">
                  {matchups.map((matchup) => (
                    <div key={matchup.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                      <div>
                        <p className="font-medium text-gray-900">
                          Week {matchup.week}: {matchup.away_team} @ {matchup.home_team}
                        </p>
                        <p className="text-sm text-gray-500">
                          {matchup.status} - {matchup.game_time}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        matchup.status === 'final' ? 'bg-green-100 text-green-800' :
                        matchup.status === 'live' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {matchup.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No matchups found</p>
              )}
            </div>
          </div>

          {/* Recent Purchases */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Purchases</h2>
            </div>
            <div className="p-6">
              {purchases && purchases.length > 0 ? (
                <div className="space-y-4">
                  {purchases.slice(0, 5).map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                      <div>
                        <p className="font-medium text-gray-900">
                          {purchase.picks_count} pick{purchase.picks_count > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-gray-500">
                          ${purchase.amount} - {purchase.created_at}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        purchase.status === 'completed' ? 'bg-green-100 text-green-800' :
                        purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {purchase.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No purchases found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 