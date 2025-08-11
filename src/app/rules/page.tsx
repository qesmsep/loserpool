import { requireAuth } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Header from '@/components/header'

export default async function RulesPage() {
  await requireAuth()
  const supabase = await createServerSupabaseClient()

  // Get current rules from global settings
  const { data: settings } = await supabase
    .from('global_settings')
    .select('key, value')
    .in('key', [
      'pick_type', 'tie_handling', 'pick_price', 'lock_time', 
      'max_picks_per_user', 'max_total_picks', 'prize_distribution',
      'elimination_type', 'allow_multiple_picks_per_game', 
      'allow_pick_changes', 'pick_change_deadline'
    ])

  const settingsMap = settings?.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>) || {}

  // Default values if settings don't exist
  const pickType = settingsMap.pick_type || 'loser'
  const tieHandling = settingsMap.tie_handling || 'elimination'
  const pickPrice = settingsMap.pick_price || '21'
  const lockTime = settingsMap.lock_time || 'Thursday'
  const maxPicksPerUser = settingsMap.max_picks_per_user || '10'
  const maxTotalPicks = settingsMap.max_total_picks || '2100'
  const prizeDistribution = settingsMap.prize_distribution || 'winner_takes_all'
  const eliminationType = settingsMap.elimination_type || 'immediate'
  const allowMultiplePicksPerGame = settingsMap.allow_multiple_picks_per_game === 'true'
  const allowPickChanges = settingsMap.allow_pick_changes === 'true'
  const pickChangeDeadline = settingsMap.pick_change_deadline || 'Thursday'

  const getPickTypeDescription = () => {
    return pickType === 'loser' 
      ? 'Pick the team you think will LOSE each week'
      : 'Pick the team you think will WIN each week'
  }

  const getTieHandlingDescription = () => {
    switch (tieHandling) {
      case 'elimination': return 'Ties are eliminations - your pick is eliminated'
      case 'carry_forward': return 'Ties are carried forward to next week'
      case 'win': return 'Ties are wins - you survive and advance'
      default: return 'Ties are eliminations - your pick is eliminated'
    }
  }

  const getPrizeDistributionDescription = () => {
    switch (prizeDistribution) {
      case 'winner_takes_all': return 'Winner takes all prize pool'
      case 'top_3': return 'Top 3 players split prize pool (50%, 30%, 20%)'
      case 'top_5': return 'Top 5 players split prize pool (40%, 25%, 20%, 10%, 5%)'
      case 'even_split': return 'Prize pool evenly split among all remaining picks at season end'
      default: return 'Winner takes all prize pool'
    }
  }

  const getEliminationTypeDescription = () => {
    return eliminationType === 'immediate' 
      ? 'Players are eliminated immediately when their game ends'
      : 'Players are eliminated at the end of the week'
  }

  return (
    <div className="min-h-screen app-bg">
      <Header 
        title="Pool Rules"
        subtitle="Official rules and guidelines for The Loser Pool"
        showBackButton={true}
        backHref="/dashboard"
        backText="Back to Dashboard"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Official Pool Rules</h2>
            <p className="text-blue-100">Current rules and settings for The Loser Pool</p>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Basic Rules */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Basic Rules</h3>
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-200">{getPickTypeDescription()}</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-200">If your pick {pickType === 'loser' ? 'wins' : 'loses'}, you&apos;re eliminated</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-200">If your pick {pickType === 'loser' ? 'loses' : 'wins'}, you survive to next week</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-200">Last person standing wins the pool</p>
                </div>
              </div>
            </div>

            {/* Tie Rules */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Tie Rules</h3>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-red-200">{getTieHandlingDescription()}</p>
                </div>
              </div>
            </div>

            {/* Pick Rules */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Pick Rules</h3>
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-green-200">Picks cost ${pickPrice} each</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-green-200">
                    {allowMultiplePicksPerGame 
                      ? 'You can use multiple picks on the same game'
                      : 'You can only use one pick per game'
                    }
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-green-200">Picks lock at {lockTime} kickoff</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-green-200">
                    {allowPickChanges 
                      ? `Pick changes allowed until ${pickChangeDeadline} kickoff`
                      : 'No changes after initial save'
                    }
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-green-200">Maximum {maxPicksPerUser} picks per user</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-green-200">Pool-wide limit: {maxTotalPicks} total picks</p>
                </div>
              </div>
            </div>

            {/* Game Rules */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Game Rules</h3>
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-yellow-200">All NFL games are eligible</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-yellow-200">Games must be completed to count</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-yellow-200">Overtime counts as part of the game</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-yellow-200">Final score determines winner/loser</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-yellow-200">{getEliminationTypeDescription()}</p>
                </div>
              </div>
            </div>

            {/* Prize Rules */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Prize Rules</h3>
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-purple-200">{getPrizeDistributionDescription()}</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-purple-200">Prize pool = total entry fees minus processing costs</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-purple-200">Payout occurs after season ends</p>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-200 text-sm">
                <strong>Note:</strong> These rules are set by the pool administrator and may be updated during the season. 
                Any rule changes will be communicated to all participants.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
