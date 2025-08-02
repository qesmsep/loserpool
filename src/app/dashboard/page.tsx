import { requireAuth } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { format } from 'date-fns'
import Link from 'next/link'
import { LogOut, ShoppingCart, Trophy, Users, Calendar } from 'lucide-react'

export default async function DashboardPage() {
  const user = await requireAuth()
  const supabase = await createServerSupabaseClient()

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get user's total picks purchased
  const { data: purchases } = await supabase
    .from('purchases')
    .select('picks_count')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  const totalPicksPurchased = purchases?.reduce((sum, purchase) => sum + purchase.picks_count, 0) || 0

  // Get current week matchups
  const { data: matchups } = await supabase
    .from('matchups')
    .select('*')
    .eq('week', 1) // TODO: Get current week dynamically
    .order('game_time')

  // Get user's picks for current week
  const { data: userPicks } = await supabase
    .from('picks')
    .select('*')
    .eq('user_id', user.id)
    .in('matchup_id', matchups?.map(m => m.id) || [])

  const picksUsed = userPicks?.reduce((sum, pick) => sum + pick.picks_count, 0) || 0
  const picksRemaining = totalPicksPurchased - picksUsed

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {profile?.username || user.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="text-gray-600 hover:text-gray-900"
              >
                Admin
              </Link>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Picks Purchased</p>
                <p className="text-2xl font-bold text-gray-900">{totalPicksPurchased}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Picks Remaining</p>
                <p className="text-2xl font-bold text-gray-900">{picksRemaining}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Picks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userPicks?.filter(p => p.status === 'active').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Current Week</p>
                <p className="text-2xl font-bold text-gray-900">1</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/picks"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Make Picks</h3>
            <p className="text-gray-600">Allocate your picks for this week&apos;s games</p>
          </Link>

          <Link
            href="/purchase"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Buy Picks</h3>
            <p className="text-gray-600">Purchase more picks for $10 each</p>
          </Link>

          <Link
            href="/leaderboard"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Leaderboard</h3>
            <p className="text-gray-600">See who&apos;s still in the running</p>
          </Link>

          <Link
            href="/results"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Results</h3>
            <p className="text-gray-600">Check last week&apos;s results</p>
          </Link>
        </div>

        {/* Current Week Matchups */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">This Week&apos;s Games</h2>
            <p className="text-gray-600">Picks lock at Thursday Night Football kickoff</p>
          </div>
          <div className="p-6">
            {matchups && matchups.length > 0 ? (
              <div className="space-y-4">
                {matchups.map((matchup) => {
                  const userPick = userPicks?.find(p => p.matchup_id === matchup.id)
                  return (
                    <div
                      key={matchup.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500">
                            {format(new Date(matchup.game_time), 'MMM d, h:mm a')}
                          </span>
                          <span className="font-medium">
                            {matchup.away_team} @ {matchup.home_team}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {userPick ? (
                          <span className="text-sm text-gray-600">
                            {userPick.picks_count} picks on {userPick.team_picked}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">No picks made</span>
                        )}
                        <Link
                          href={`/picks/${matchup.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          {userPick ? 'Edit' : 'Pick'}
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No games scheduled for this week</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 