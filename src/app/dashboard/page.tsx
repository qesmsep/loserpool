import { requireAuth } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { format } from 'date-fns'
import Link from 'next/link'
import { LogOut, ShoppingCart, Trophy, Users, Calendar } from 'lucide-react'

export default async function DashboardPage() {
  const user = await requireAuth()
  const supabase = await createServerSupabaseClient()

  // Get user profile
  let { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // If profile doesn't exist, create it via API route
  if (!profile) {
    console.log('Creating user profile for:', user.id)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/users/create-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.profile) {
          profile = result.profile
        }
      } else {
        console.error('Failed to create profile via API')
      }
    } catch (error) {
      console.error('Error creating profile:', error)
    }

    // If API creation failed, use minimal profile
    if (!profile) {
      profile = {
        id: user.id,
        email: user.email!,
        username: null,
        is_admin: false,
      }
    }
  }

  // Get user's total picks purchased
  const { data: purchases } = await supabase
    .from('purchases')
    .select('picks_count')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  const totalPicksPurchased = purchases?.reduce((sum, purchase) => sum + purchase.picks_count, 0) || 0

  // Get current week and deadline from global settings
  const { data: settings } = await supabase
    .from('global_settings')
    .select('key, value')
    .in('key', ['current_week', 'week1_picks_deadline'])

  const weekSetting = settings?.find(s => s.key === 'current_week')
  const deadlineSetting = settings?.find(s => s.key === 'week1_picks_deadline')
  
  const currentWeek = weekSetting ? parseInt(weekSetting.value) : 1
  const deadline = deadlineSetting?.value || null

  // Get current week matchups
  const { data: matchups } = await supabase
    .from('matchups')
    .select('*')
    .eq('week', currentWeek)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-blue-100">Welcome back, {profile?.username || user.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="text-blue-100 hover:text-white transition-colors"
              >
                Admin
              </Link>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex items-center text-blue-100 hover:text-white transition-colors"
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
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Picks Purchased</p>
                <p className="text-2xl font-bold text-white">{totalPicksPurchased}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Trophy className="w-6 h-6 text-green-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Picks Remaining</p>
                <p className="text-2xl font-bold text-white">{picksRemaining}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-6 h-6 text-purple-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">Active Picks</p>
                <p className="text-2xl font-bold text-white">
                  {userPicks?.filter(p => p.status === 'active').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Current Week</p>
                <p className="text-2xl font-bold text-white">{currentWeek}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/picks"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 hover:bg-white/20 transition-all"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Make Picks</h3>
            <p className="text-blue-100">Allocate your picks for this week&apos;s games</p>
          </Link>

                      <Link
              href="/purchase"
              className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 hover:bg-white/20 transition-all"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Buy Picks</h3>
              <p className="text-blue-100">Purchase more picks for $21 each</p>
            </Link>

          <Link
            href="/leaderboard"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 hover:bg-white/20 transition-all"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Leaderboard</h3>
            <p className="text-blue-100">See who&apos;s still in the running</p>
          </Link>

          <Link
            href="/results"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 hover:bg-white/20 transition-all"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Results</h3>
            <p className="text-blue-100">Check last week&apos;s results</p>
          </Link>
        </div>

        {/* Deadline Countdown */}
        {deadline && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="w-6 h-6 text-yellow-200 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Picks Deadline</h3>
                  <p className="text-yellow-200">
                    Deadline: {format(new Date(deadline), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-yellow-200">Time Remaining</p>
                <p className="text-2xl font-bold text-white">
                  {(() => {
                    const now = new Date()
                    const deadlineDate = new Date(deadline)
                    const diff = deadlineDate.getTime() - now.getTime()
                    
                    if (diff <= 0) {
                      return 'EXPIRED'
                    }
                    
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                    
                    if (days > 0) {
                      return `${days}d ${hours}h`
                    } else if (hours > 0) {
                      return `${hours}h ${minutes}m`
                    } else {
                      return `${minutes}m`
                    }
                  })()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Week Matchups */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">This Week&apos;s Games</h2>
            <p className="text-blue-100">Week {currentWeek} - {matchups?.length || 0} games scheduled</p>
          </div>
          <div className="p-6">
            {matchups && matchups.length > 0 ? (
              <div className="space-y-4">
                {matchups.map((matchup) => {
                  const userPick = userPicks?.find(p => p.matchup_id === matchup.id)
                  return (
                    <div
                      key={matchup.id}
                      className="flex items-center justify-between p-4 border border-white/20 rounded-lg bg-white/5"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-blue-200">
                            {format(new Date(matchup.game_time), 'MMM d, h:mm a')}
                          </span>
                          <span className="font-medium text-white">
                            {matchup.away_team} @ {matchup.home_team}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {userPick ? (
                          <span className="text-sm text-blue-100">
                            {userPick.picks_count} picks on {userPick.team_picked}
                          </span>
                        ) : (
                          <span className="text-sm text-blue-200">No picks made</span>
                        )}
                        <Link
                          href={`/picks/${matchup.id}`}
                          className="text-blue-200 hover:text-white text-sm font-medium transition-colors"
                        >
                          {userPick ? 'Edit' : 'Pick'}
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-blue-200 text-center py-8">No games scheduled for this week</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 