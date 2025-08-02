import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowLeft, DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react'

export default async function AdminPurchasesPage() {
  await requireAdmin()
  const supabase = await createServerSupabaseClient()

  // Get all purchases with user data
  const { data: purchases } = await supabase
    .from('purchases')
    .select(`
      *,
      users!inner(
        username,
        email,
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false })

  // Calculate stats
  const totalRevenue = purchases?.reduce((sum, p) => sum + p.amount_paid, 0) || 0
  const totalPicks = purchases?.reduce((sum, p) => sum + p.picks_count, 0) || 0
  const completedPurchases = purchases?.filter(p => p.status === 'completed').length || 0
  const pendingPurchases = purchases?.filter(p => p.status === 'pending').length || 0

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
                <h1 className="text-3xl font-bold text-white">Purchase History</h1>
                <p className="text-blue-100">View all purchase transactions</p>
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
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Total Revenue</p>
                <p className="text-2xl font-bold text-white">${(totalRevenue / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Total Picks</p>
                <p className="text-2xl font-bold text-white">{totalPicks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">Completed</p>
                <p className="text-2xl font-bold text-white">{completedPurchases}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Users className="w-6 h-6 text-orange-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Pending</p>
                <p className="text-2xl font-bold text-white">{pendingPurchases}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Purchases Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">All Purchases</h2>
            <p className="text-blue-100">Complete transaction history</p>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/5 divide-y divide-white/20">
                {purchases?.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {purchase.users?.username?.[0]?.toUpperCase() || 
                               purchase.users?.email?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {purchase.users?.username || 'No username'}
                          </div>
                          <div className="text-sm text-blue-200">
                            {purchase.users?.first_name} {purchase.users?.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {purchase.picks_count} pick{purchase.picks_count > 1 ? 's' : ''}
                      </div>
                      <div className="text-sm text-blue-200">
                        {purchase.stripe_session_id.slice(-8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-white">
                        ${(purchase.amount_paid / 100).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        purchase.status === 'completed' ? 'bg-green-500/20 text-green-200' :
                        purchase.status === 'pending' ? 'bg-yellow-500/20 text-yellow-200' :
                        'bg-red-500/20 text-red-200'
                      }`}>
                        {purchase.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                      {new Date(purchase.created_at).toLocaleDateString()}
                      <br />
                      <span className="text-xs">
                        {new Date(purchase.created_at).toLocaleTimeString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {purchases?.length === 0 && (
          <div className="text-center py-12">
            <div className="text-blue-200 text-lg">No purchases found</div>
            <p className="text-blue-100 mt-2">Purchase history will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
} 