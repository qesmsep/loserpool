import { requireAuth } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CheckCircle, XCircle, Minus } from 'lucide-react'
import Header from '@/components/header'
import { getTeamColors } from '@/lib/team-logos'
import { formatGameTime } from '@/lib/timezone'

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
    <div className="app-bg">
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
                    <div key={pick.id} className="bg-white/5 border border-white/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-blue-200">
                              {formatGameTime(matchup?.game_time || '')}
                            </span>
                            <span className="font-medium text-white">
                              {matchup?.away_team} @ {matchup?.home_team}
                            </span>
                            {matchup?.status === 'final' && (
                              <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded">
                                FINAL
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(status)}
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

                      <div className="grid grid-cols-2 gap-4">
                        {/* Away Team */}
                        <div className="relative">
                          <div 
                            className="w-full p-4 rounded-lg text-white relative font-bold shadow-lg"
                            style={{
                              background: `linear-gradient(135deg, ${getTeamColors(matchup?.away_team || '').primary} 0%, ${getTeamColors(matchup?.away_team || '').primary} 70%, ${getTeamColors(matchup?.away_team || '').secondary} 100%)`,
                              color: 'white',
                              border: pick.team_picked === matchup?.away_team ? '2px solid white' : 'none'
                            }}
                          >
                                                         <div className="text-center">
                               <div className={`mb-1 ${pick.team_picked === matchup?.away_team ? 'text-xl font-bold' : 'font-semibold'}`}>
                                 {matchup?.away_team}
                               </div>
                               <div className={`${pick.team_picked === matchup?.away_team ? 'text-lg font-bold' : 'text-sm font-medium opacity-90'}`}>
                                 {matchup?.status === 'final' ? matchup.away_score : ''}
                               </div>
                             </div>
                          </div>
                        </div>

                        {/* Home Team */}
                        <div className="relative">
                          <div 
                            className="w-full p-4 rounded-lg text-white relative font-bold shadow-lg"
                            style={{
                              background: `linear-gradient(135deg, ${getTeamColors(matchup?.home_team || '').primary} 0%, ${getTeamColors(matchup?.home_team || '').primary} 70%, ${getTeamColors(matchup?.home_team || '').secondary} 100%)`,
                              color: 'white',
                              border: pick.team_picked === matchup?.home_team ? '2px solid white' : 'none'
                            }}
                          >
                                                         <div className="text-center">
                               <div className={`mb-1 ${pick.team_picked === matchup?.home_team ? 'text-xl font-bold' : 'font-semibold'}`}>
                                 {matchup?.home_team}
                               </div>
                               <div className={`${pick.team_picked === matchup?.home_team ? 'text-lg font-bold' : 'text-sm font-medium opacity-90'}`}>
                                 {matchup?.status === 'final' ? matchup.home_score : ''}
                               </div>
                             </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-center">
                        <p className="text-lg font-bold text-white">
                          {pick.picks_count} loser pick{pick.picks_count > 1 ? 's' : ''} on {pick.team_picked}
                        </p>
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
                  <div key={result.id} className="flex items-center justify-between p-4 border border-white/20 rounded-lg bg-white/5">
                    <div>
                      <h3 className="font-medium text-white">{result.week === 0 ? 'Week Zero' : `Week ${result.week}`}</h3>
                      <p className="text-sm text-blue-200">
                        {result.total_picks} total loser picks
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <p className="text-sm text-blue-200">Active Loser Picks</p>
                          <p className="text-lg font-semibold text-green-400">{result.active_picks}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-blue-200">Eliminated Loser Picks</p>
                          <p className="text-lg font-semibold text-red-400">{result.eliminated_picks}</p>
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
        <div className="mt-8 bg-blue-500/20 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Result Legend:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Survived - Your pick lost (good!)</span>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span>Eliminated - Your pick won (bad!)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Minus className="w-4 h-4 text-yellow-400" />
              <span>Eliminated - Game ended in tie</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 