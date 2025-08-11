import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Trophy, TrendingUp } from 'lucide-react'

export default async function AdminResultsPage() {
  await requireAdmin()
  const supabase = await createServerSupabaseClient()

  // Get all matchups with picks data
  const { data: matchups } = await supabase
    .from('matchups')
    .select(`
      *,
      picks!inner(
        picks_count,
        status,
        team_picked
      )
    `)
    .order('week', { ascending: false })
    .order('game_time', { ascending: true })

  // Calculate stats for each matchup
  const matchupsWithStats = matchups?.map(matchup => {
    const matchupPicks = matchup.picks || []
    const totalPicks = matchupPicks.reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
    const activePicks = matchupPicks
      .filter((p: { status: string }) => p.status === 'active')
      .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)
    const eliminatedPicks = matchupPicks
      .filter((p: { status: string }) => p.status === 'eliminated')
      .reduce((sum: number, p: { picks_count: number }) => sum + p.picks_count, 0)

    // Determine winner
    let winner = null
    if (matchup.away_score !== null && matchup.home_score !== null) {
      if (matchup.away_score > matchup.home_score) {
        winner = 'away'
      } else if (matchup.home_score > matchup.away_score) {
        winner = 'home'
      } else {
        winner = 'tie'
      }
    }

    return {
      ...matchup,
      totalPicks,
      activePicks,
      eliminatedPicks,
      winner
    }
  }) || []

  // Group by week
  const matchupsByWeek = matchupsWithStats.reduce((acc, matchup) => {
    if (!acc[matchup.week]) {
      acc[matchup.week] = []
    }
    acc[matchup.week].push(matchup)
    return acc
  }, {} as Record<number, typeof matchupsWithStats>)

  const totalMatchups = matchupsWithStats.length
  const completedMatchups = matchupsWithStats.filter(m => m.status === 'final').length
  const pendingMatchups = matchupsWithStats.filter(m => m.status === 'scheduled').length
  const liveMatchups = matchupsWithStats.filter(m => m.status === 'live').length

  return (
    <div className="min-h-screen app-bg">
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
                <h1 className="text-3xl font-bold text-white">Update Results</h1>
                <p className="text-blue-100">Update game scores and results</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => window.location.href = '/api/admin/assign-default-picks'}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Assign Default Picks
            </button>
            <Link
              href="/api/admin/assign-default-picks"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Preview Default Picks
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Total Games</p>
                <p className="text-2xl font-bold text-white">{totalMatchups}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Trophy className="w-6 h-6 text-green-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Completed</p>
                <p className="text-2xl font-bold text-white">{completedMatchups}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-100">Live</p>
                <p className="text-2xl font-bold text-white">{liveMatchups}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Pending</p>
                <p className="text-2xl font-bold text-white">{pendingMatchups}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Matchups by Week */}
        <div className="space-y-8">
          {Object.entries(matchupsByWeek).map(([week, weekMatchups]) => {
            type MatchupType = {
              id: number | string;
              away_team: string;
              home_team: string;
              status: string;
              game_time: string;
              away_score: number | null;
              home_score: number | null;
              totalPicks: number;
              activePicks: number;
              eliminatedPicks: number;
              winner: string | null;
            };
            const weekMatchupsArr = weekMatchups as MatchupType[];
            return (
              <div key={week} className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <div className="px-6 py-4 border-b border-white/20">
                  <h2 className="text-xl font-semibold text-white">Week {week}</h2>
                  <p className="text-blue-100">{weekMatchupsArr.length} games</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {weekMatchupsArr.map((matchup) => (
                      <div key={matchup.id} className="flex items-center justify-between p-4 border border-white/20 rounded-lg bg-white/5">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="text-lg font-semibold text-white">
                              {matchup.away_team} @ {matchup.home_team}
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              matchup.status === 'final' ? 'bg-green-500/20 text-green-200' :
                              matchup.status === 'live' ? 'bg-yellow-500/20 text-yellow-200' :
                              'bg-gray-500/20 text-gray-200'
                            }`}>
                              {matchup.status}
                            </span>
                          </div>
                          <div className="text-sm text-blue-200 mt-1">
                            {new Date(matchup.game_time).toLocaleString()}
                            {matchup.away_score !== null && matchup.home_score !== null && (
                              <span className="ml-4">
                                Score: {matchup.away_score} - {matchup.home_score}
                                {matchup.winner && (
                                  <span className="ml-2 text-green-300">
                                    ({matchup.winner === 'away' ? matchup.away_team : 
                                      matchup.winner === 'home' ? matchup.home_team : 'Tie'})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <div className="text-sm text-blue-200">Total Picks</div>
                            <div className="text-lg font-semibold text-white">{matchup.totalPicks}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-green-200">Active</div>
                            <div className="text-lg font-semibold text-green-300">{matchup.activePicks}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-red-200">Eliminated</div>
                            <div className="text-lg font-semibold text-red-300">{matchup.eliminatedPicks}</div>
                          </div>
                          <div className="flex space-x-2">
                            <Link
                              href={`/admin/results/${matchup.id}/update`}
                              className="text-blue-200 hover:text-white transition-colors"
                            >
                              Update
                            </Link>
                            <Link
                              href={`/admin/results/${matchup.id}/picks`}
                              className="text-green-200 hover:text-white transition-colors"
                            >
                              Picks
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )})}
        </div>

        {matchupsWithStats.length === 0 && (
          <div className="text-center py-12">
            <div className="text-blue-200 text-lg">No matchups found</div>
            <p className="text-blue-100 mt-2">Add matchups to start updating results</p>
            <Link
              href="/admin/matchups"
              className="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Manage Matchups
            </Link>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/results/bulk-update"
              className="bg-blue-600/20 text-blue-200 px-4 py-3 rounded-lg hover:bg-blue-600/30 transition-colors"
            >
              <div className="font-medium">Bulk Update</div>
              <div className="text-sm opacity-75">Update multiple games at once</div>
            </Link>
            
            <Link
              href="/admin/results/auto-update"
              className="bg-green-600/20 text-green-200 px-4 py-3 rounded-lg hover:bg-green-600/30 transition-colors"
            >
              <div className="font-medium">Auto Update</div>
              <div className="text-sm opacity-75">Fetch scores from API</div>
            </Link>
            
            <Link
              href="/admin/results/process"
              className="bg-purple-600/20 text-purple-200 px-4 py-3 rounded-lg hover:bg-purple-600/30 transition-colors"
            >
              <div className="font-medium">Process Results</div>
              <div className="text-sm opacity-75">Update pick statuses</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 