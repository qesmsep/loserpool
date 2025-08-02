import { requireAuth } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowLeft, Trophy, Users, TrendingUp } from 'lucide-react'

export default async function LeaderboardPage() {
  await requireAuth()
  const supabase = await createServerSupabaseClient()

  // Get all users with their active picks count
  const { data: users } = await supabase
    .from('users')
    .select(`
      id,
      username,
      email,
      picks!inner(
        status,
        picks_count
      )
    `)
    .eq('picks.status', 'active')

  // Get total picks purchased for each user
  const { data: purchases } = await supabase
    .from('purchases')
    .select('user_id, picks_count')
    .eq('status', 'completed')

  // Calculate leaderboard data
  const leaderboardData = users?.map(user => {
    const userPurchases = purchases?.filter(p => p.user_id === user.id) || []
    const totalPurchased = userPurchases.reduce((sum, p) => sum + p.picks_count, 0)
    const activePicks = user.picks.reduce((sum, p) => sum + p.picks_count, 0)
    
    return {
      id: user.id,
      username: user.username || user.email?.split('@')[0] || 'Anonymous',
      email: user.email,
      totalPurchased,
      activePicks,
      eliminated: activePicks === 0 && totalPurchased > 0
    }
  }) || []

  // Sort by active picks (descending), then by total purchased (descending)
  const sortedLeaderboard = leaderboardData
    .sort((a, b) => {
      if (a.activePicks !== b.activePicks) {
        return b.activePicks - a.activePicks
      }
      return b.totalPurchased - a.totalPurchased
    })
    .filter(user => user.totalPurchased > 0) // Only show users who purchased picks

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-blue-100 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
                <p className="text-blue-100">Current standings in The Loser Pool</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-100">Total Players</p>
                <p className="text-2xl font-bold text-white">{sortedLeaderboard.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Users className="w-6 h-6 text-green-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Still Alive</p>
                <p className="text-2xl font-bold text-white">
                  {sortedLeaderboard.filter(u => !u.eliminated).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-red-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-100">Eliminated</p>
                <p className="text-2xl font-bold text-white">
                  {sortedLeaderboard.filter(u => u.eliminated).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Current Standings</h2>
            <p className="text-blue-100">Ranked by active picks remaining</p>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Active Picks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Total Purchased
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/5 divide-y divide-white/20">
                {sortedLeaderboard.map((user, index) => (
                  <tr key={user.id} className={user.id === user.id ? 'bg-white/10' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index === 0 && (
                          <Trophy className="w-5 h-5 text-yellow-300 mr-2" />
                        )}
                        <span className="text-sm font-medium text-white">
                          #{index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {user.username}
                      </div>
                      <div className="text-sm text-blue-200">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        user.activePicks > 0 ? 'text-green-300' : 'text-red-300'
                      }`}>
                        {user.activePicks}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                      {user.totalPurchased}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.eliminated
                          ? 'bg-red-500/20 text-red-200'
                          : 'bg-green-500/20 text-green-200'
                      }`}>
                        {user.eliminated ? 'Eliminated' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rules Reminder */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">How the Pool Works:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-100">
            <div>
              <h4 className="font-medium mb-2 text-white">Elimination Rules:</h4>
              <ul className="space-y-1">
                <li>• Pick the team that will LOSE</li>
                <li>• If your pick wins, you&apos;re eliminated</li>
                <li>• If your pick loses, you survive</li>
                <li>• Ties are safe - pick carries over</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-white">Winning:</h4>
              <ul className="space-y-1">
                <li>• Last person with active picks wins</li>
                <li>• Multiple winners split the pot</li>
                <li>• More picks = more chances to survive</li>
                <li>• Strategy: spread your picks wisely</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 