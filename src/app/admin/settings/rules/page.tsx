import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import AdminHeader from '@/components/admin-header'

export default async function AdminRulesPage() {
  await requireAdmin()
  const supabase = await createServerSupabaseClient()

  // Get current rules from global settings
  const { data: settings } = await supabase
    .from('global_settings')
    .select('key, value')
    .in('key', ['pool_rules', 'game_rules', 'tie_rules'])

  const poolRules = settings?.find(s => s.key === 'pool_rules')?.value || ''
  const gameRules = settings?.find(s => s.key === 'game_rules')?.value || ''
  const tieRules = settings?.find(s => s.key === 'tie_rules')?.value || ''

  return (
    <div className="min-h-screen app-bg">
      <AdminHeader 
        title="Edit Rules"
        subtitle="Configure pool rules and game settings"
        showBackButton={true}
        backHref="/admin/settings"
        backText="Back to Settings"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Pool Rules</h2>
            <p className="text-blue-100">Configure the rules and settings for The Loser Pool</p>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Basic Rules */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Basic Rules</h3>
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-200">Pick the team you think will LOSE each week</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-200">If your pick wins, you&apos;re eliminated</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-200">If your pick loses, you survive to next week</p>
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
                  <p className="text-red-200">Ties are eliminations - your pick is eliminated</p>
                </div>
              </div>
            </div>

            {/* Pick Rules */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Pick Rules</h3>
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-green-200">Picks cost $21 each</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-green-200">You can use multiple picks on the same game</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-green-200">Picks lock at Thursday kickoff</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-green-200">No changes after deadline</p>
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
              </div>
            </div>

            {/* Prize Rules */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Prize Rules</h3>
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-purple-200">Winner takes all prize pool</p>
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
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                <strong>Note:</strong> These rules are currently read-only. To modify rules, 
                contact the pool administrator or update the database directly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 