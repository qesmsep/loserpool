import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Settings, Users, Calendar, Trophy, RotateCcw } from 'lucide-react'
import AdminHeader from '@/components/admin-header'

export default async function AdminPage() {
  await requireAdmin()
  const supabase = await createServerSupabaseClient()
  const serviceClient = createServiceRoleClient()

  // Get pool statistics using service role client to bypass RLS
  const { count: totalUsers } = await serviceClient
    .from('users')
    .select('*', { count: 'exact', head: true })

  const { data: purchases } = await supabase
    .from('purchases')
    .select('*')
    .eq('status', 'completed')

  const { data: picks } = await supabase
    .from('picks')
    .select('*')

  const totalRevenue = purchases?.reduce((sum, p) => sum + p.amount_paid, 0) || 0
  const totalPicksPurchased = purchases?.reduce((sum, p) => sum + p.picks_count, 0) || 0
  const activePicks = picks?.filter(p => p.status === 'active').length || 0
  const eliminatedPicks = picks?.filter(p => p.status === 'eliminated').length || 0

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

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Settings className="w-6 h-6 text-orange-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Active Picks</p>
                <p className="text-2xl font-bold text-white">{activePicks}</p>
                {eliminatedPicks > 0 && (
                  <p className="text-sm text-red-300">({eliminatedPicks} eliminated)</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {eliminatedPicks > 0 && (
          <div className="mb-8 bg-yellow-500/20 backdrop-blur-sm rounded-lg border border-yellow-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-yellow-200 mb-2">Quick Reset</h3>
                <p className="text-yellow-100">Bring all eliminated picks back to life</p>
              </div>
              <Link
                href="/admin/settings/reset"
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Picks
              </Link>
            </div>
          </div>
        )}

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
    </div>
  )
} 