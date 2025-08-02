import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowLeft, Users, Mail, Phone, Calendar } from 'lucide-react'

export default async function AdminUsersPage() {
  await requireAdmin()
  const supabase = await createServerSupabaseClient()

  // Get all users with their stats (including admins who may not have purchases)
  const { data: users } = await supabase
    .from('users')
    .select(`
      *,
      purchases(
        picks_count,
        status
      )
    `)

  // Get picks data for each user
  const { data: picks } = await supabase
    .from('picks')
    .select('user_id, status, picks_count')

  // Calculate stats for each user
  const usersWithStats = users?.map(user => {
    const userPurchases = user.purchases || []
    const userPicks = picks?.filter(p => p.user_id === user.id) || []
    
    const totalPurchased = userPurchases
      .filter((p: { status: string }) => p.status === 'completed')
      .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
    
    const activePicks = userPicks
      .filter((p: { status: string }) => p.status === 'active')
      .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
    
    const eliminatedPicks = userPicks
      .filter((p: { status: string }) => p.status === 'eliminated')
      .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)

    return {
      ...user,
      totalPurchased,
      activePicks,
      eliminatedPicks,
      isEliminated: activePicks === 0 && totalPurchased > 0
    }
  }) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="flex items-center text-blue-100 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Manage Users</h1>
                <p className="text-blue-100">View and manage user accounts</p>
              </div>
            </div>
          </div>
        </div>
      </header>

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
                <p className="text-2xl font-bold text-white">{usersWithStats.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-green-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Active Users</p>
                <p className="text-2xl font-bold text-white">
                  {usersWithStats.filter(u => !u.isEliminated).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Users className="w-6 h-6 text-red-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-100">Eliminated</p>
                <p className="text-2xl font-bold text-white">
                  {usersWithStats.filter(u => u.isEliminated).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Mail className="w-6 h-6 text-purple-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">With Purchases</p>
                <p className="text-2xl font-bold text-white">
                  {usersWithStats.filter(u => u.totalPurchased > 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">All Users</h2>
            <p className="text-blue-100">Complete user list with stats</p>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Picks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/5 divide-y divide-white/20">
                {usersWithStats.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {user.username || 'No username'}
                            {user.is_admin && (
                              <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-200">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-blue-200">
                            {user.first_name} {user.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{user.email}</div>
                      <div className="text-sm text-blue-200">{user.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        <span className="text-green-300">{user.activePicks} active</span>
                        {user.eliminatedPicks > 0 && (
                          <span className="text-red-300 ml-2">, {user.eliminatedPicks} eliminated</span>
                        )}
                      </div>
                      <div className="text-sm text-blue-200">
                        {user.totalPurchased} purchased
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isEliminated
                          ? 'bg-red-500/20 text-red-200'
                          : user.totalPurchased > 0
                          ? 'bg-green-500/20 text-green-200'
                          : user.is_admin
                          ? 'bg-yellow-500/20 text-yellow-200'
                          : 'bg-gray-500/20 text-gray-200'
                      }`}>
                        {user.isEliminated ? 'Eliminated' : user.totalPurchased > 0 ? 'Active' : user.is_admin ? 'Admin' : 'No Picks'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 