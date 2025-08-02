import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Trophy } from 'lucide-react'

export default async function AdminMatchupsPage() {
  await requireAdmin()
  const supabase = await createServerSupabaseClient()

  // Get all matchups with picks data
  const { data: matchups } = await supabase
    .from('matchups')
    .select(`
      *,
      picks!inner(
        picks_count,
        status
      )
    `)
    .order('week', { ascending: false })
    .order('game_time', { ascending: true })

  // Calculate stats for each matchup
  const matchupsWithStats = matchups?.map(matchup => {
    const matchupPicks = matchup.picks || []
    const totalPicks = matchupPicks.reduce((sum, p) => sum + p.picks_count, 0)
    const activePicks = matchupPicks
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.picks_count, 0)
    const eliminatedPicks = matchupPicks
      .filter(p => p.status === 'eliminated')
      .reduce((sum, p) => sum + p.picks_count, 0)

    return {
      ...matchup,
      totalPicks,
      activePicks,
      eliminatedPicks
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
                <h1 className="text-3xl font-bold text-white">Manage Matchups</h1>
                <p className="text-blue-100">Add and edit weekly matchups</p>
              </div>
            </div>
            <div>
              <Link
                href="/admin/matchups/add"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Matchup
              </Link>
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
                <Calendar className="w-6 h-6 text-blue-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Total Matchups</p>
                <p className="text-2xl font-bold text-white">{matchupsWithStats.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Trophy className="w-6 h-6 text-green-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Weeks</p>
                <p className="text-2xl font-bold text-white">
                  {Object.keys(matchupsByWeek).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-purple-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">Scheduled</p>
                <p className="text-2xl font-bold text-white">
                  {matchupsWithStats.filter(m => m.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Trophy className="w-6 h-6 text-orange-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Final</p>
                <p className="text-2xl font-bold text-white">
                  {matchupsWithStats.filter(m => m.status === 'final').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Matchups by Week */}
        <div className="space-y-8">
          {Object.entries(matchupsByWeek).map(([week, weekMatchups]) => (
            <div key={week} className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <div className="px-6 py-4 border-b border-white/20">
                <h2 className="text-xl font-semibold text-white">Week {week}</h2>
                <p className="text-blue-100">{weekMatchups.length} games</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {weekMatchups.map((matchup) => (
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
                            href={`/admin/matchups/${matchup.id}/edit`}
                            className="text-blue-200 hover:text-white transition-colors"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/admin/matchups/${matchup.id}/results`}
                            className="text-green-200 hover:text-white transition-colors"
                          >
                            Results
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {matchupsWithStats.length === 0 && (
          <div className="text-center py-12">
            <div className="text-blue-200 text-lg">No matchups found</div>
            <p className="text-blue-100 mt-2">Add your first matchup to get started</p>
            <Link
              href="/admin/matchups/add"
              className="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add First Matchup
            </Link>
          </div>
        )}
      </div>
    </div>
  )
} 