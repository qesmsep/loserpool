import { requireAuth } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Trophy, Users, Calendar, CheckCircle, XCircle, Minus } from 'lucide-react'
import Header from '@/components/header'

interface Pick {
  id: string
  user_id: string
  matchup_id: string
  team_picked: string
  picks_count: number
  status: 'active' | 'eliminated' | 'safe'
  created_at: string
  matchups?: {
    away_team: string
    home_team: string
    away_score: number | null
    home_score: number | null
    status: string
    game_time: string
  }
}

export default async function ResultsPage() {
  const user = await requireAuth()
  const supabase = await createServerSupabaseClient()

  // Get user's picks for the current week
  const { data: userPicks } = await supabase
    .from('picks')
    .select(`
      *,
      matchups (
        away_team,
        home_team,
        away_score,
        home_score,
        status,
        game_time
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Get weekly results for the user
  const { data: weeklyResults } = await supabase
    .from('weekly_results')
    .select('*')
    .eq('user_id', user.id)
    .order('week', { ascending: false })

  const getPickStatus = (pick: Pick) => {
    const matchup = pick.matchups
    if (!matchup || matchup.status !== 'final') return 'pending'
    
    const pickedTeam = pick.team_picked
    const awayTeam = matchup.away_team
    const homeTeam = matchup.home_team
    const awayScore = matchup.away_score
    const homeScore = matchup.home_score
    
    if (awayScore === homeScore) return 'tie'
    
    if (awayScore === null || homeScore === null) return 'pending'
    
    const loser = awayScore > homeScore ? homeTeam : awayTeam
    
    return pickedTeam === loser ? 'correct' : 'incorrect'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'correct':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'incorrect':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'tie':
        return <Minus className="w-5 h-5 text-yellow-600" />
      default:
        return <Minus className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'correct':
        return 'Survived'
      case 'incorrect':
        return 'Eliminated'
      case 'tie':
        return 'Eliminated (Tie)'
      default:
        return 'Pending'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Header 
        title="Your Results"
        subtitle="Track your performance in The Loser Pool"
        showBackButton={true}
        backHref="/dashboard"
        backText="Back to Dashboard"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Week Results */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 mb-8">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">This Week&apos;s Picks</h2>
            <p className="text-blue-100">Your picks and their outcomes</p>
          </div>
          <div className="p-6">
            {userPicks && userPicks.length > 0 ? (
              <div className="space-y-4">
                {userPicks.map((pick) => {
                  const status = getPickStatus(pick)
                  const matchup = pick.matchups
                  
                  return (
                    <div key={pick.id} className="flex items-center justify-between p-4 border border-white/20 rounded-lg bg-white/5">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(status)}
                          <div>
                            <p className="font-medium text-white">
                              {matchup?.away_team} @ {matchup?.home_team}
                            </p>
                            <p className="text-sm text-blue-200">
                              {pick.picks_count} pick{pick.picks_count > 1 ? 's' : ''} on {pick.team_picked}
                            </p>
                            {matchup?.status === 'final' && (
                              <p className="text-sm text-blue-200">
                                Final: {matchup.away_team} {matchup.away_score} - {matchup.home_team} {matchup.home_score}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          status === 'correct' ? 'bg-green-500/20 text-green-200' :
                          status === 'incorrect' ? 'bg-red-500/20 text-red-200' :
                          status === 'tie' ? 'bg-yellow-500/20 text-yellow-200' :
                          'bg-gray-500/20 text-gray-200'
                        }`}>
                          {getStatusText(status)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-blue-200 text-center py-8">No picks found for this week</p>
            )}
          </div>
        </div>

        {/* Weekly Results History */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Weekly Results History</h2>
            <p className="text-blue-100">Your performance over time</p>
          </div>
          <div className="p-6">
            {weeklyResults && weeklyResults.length > 0 ? (
              <div className="space-y-4">
                {weeklyResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Week {result.week}</h3>
                      <p className="text-sm text-gray-500">
                        {result.total_picks} total picks
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Active</p>
                          <p className="text-lg font-semibold text-green-600">{result.active_picks}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Eliminated</p>
                          <p className="text-lg font-semibold text-red-600">{result.eliminated_picks}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No weekly results found</p>
            )}
          </div>
        </div>

        {/* Rules Reminder */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Result Legend:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Survived - Your pick lost (good!)</span>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span>Eliminated - Your pick won (bad!)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Minus className="w-4 h-4 text-yellow-600" />
                                  <span>Eliminated - Game ended in tie</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 