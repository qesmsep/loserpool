'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminHeader from '@/components/admin-header'

interface RulesData {
  pickType: 'loser' | 'winner'
  tieHandling: 'elimination' | 'carry_forward' | 'win'
  pickPrice: number
  lockTime: string
  maxPicksPerUser: number
  maxTotalPicks: number
  prizeDistribution: 'winner_takes_all' | 'top_3' | 'top_5' | 'even_split'
  eliminationType: 'immediate' | 'end_of_week'
  allowMultiplePicksPerGame: boolean
  allowPickChanges: boolean
  pickChangeDeadline: string
  autoRandomPicks: boolean
  randomPickStrategy: 'best_odds_winning' | 'best_odds_losing'
}

export default function AdminRulesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  const [rules, setRules] = useState<RulesData>({
    pickType: 'loser',
    tieHandling: 'elimination',
    pickPrice: 21,
    lockTime: 'Thursday',
    maxPicksPerUser: 10,
    maxTotalPicks: 2100,
    prizeDistribution: 'winner_takes_all',
    eliminationType: 'immediate',
    allowMultiplePicksPerGame: true,
    allowPickChanges: true,
    pickChangeDeadline: 'Thursday',
    autoRandomPicks: false,
    randomPickStrategy: 'best_odds_losing'
  })

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      
      // First, check if user is authenticated and is admin
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        setError('Authentication error: ' + authError.message)
        return
      }
      
      if (!user) {
        setError('No authenticated user found')
        return
      }
      
      console.log('Current user:', user.id, user.email)
      
      // Check if user is admin
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        console.error('Profile error:', profileError)
        setError('Error checking admin status: ' + profileError.message)
        return
      }
      
      console.log('User admin status:', userProfile?.is_admin)
      
      if (!userProfile?.is_admin) {
        setError('Access denied: Admin privileges required')
        return
      }
      
      // Get current rules from global settings
      const { data: settings, error: settingsError } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', [
          'pick_type', 'tie_handling', 'pick_price', 'lock_time', 
          'max_picks_per_user', 'max_total_picks', 'prize_distribution',
          'elimination_type', 'allow_multiple_picks_per_game', 
          'allow_pick_changes', 'pick_change_deadline', 'auto_random_picks',
          'random_pick_strategy'
        ])
      
      if (settingsError) {
        console.error('Settings error:', settingsError)
        setError('Error loading settings: ' + settingsError.message)
        return
      }
      
      console.log('Loaded settings:', settings)

      if (settings) {
        const settingsMap = settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value
          return acc
        }, {} as Record<string, string>)

        setRules({
          pickType: (settingsMap.pick_type as 'loser' | 'winner') || 'loser',
          tieHandling: (settingsMap.tie_handling as 'elimination' | 'carry_forward' | 'win') || 'elimination',
          pickPrice: parseInt(settingsMap.pick_price) || 21,
          lockTime: settingsMap.lock_time || 'Thursday',
          maxPicksPerUser: parseInt(settingsMap.max_picks_per_user) || 10,
          maxTotalPicks: parseInt(settingsMap.max_total_picks) || 2100,
          prizeDistribution: (settingsMap.prize_distribution as 'winner_takes_all' | 'top_3' | 'top_5') || 'winner_takes_all',
          eliminationType: (settingsMap.elimination_type as 'immediate' | 'end_of_week') || 'immediate',
          allowMultiplePicksPerGame: settingsMap.allow_multiple_picks_per_game === 'true',
          allowPickChanges: settingsMap.allow_pick_changes === 'true',
          pickChangeDeadline: settingsMap.pick_change_deadline || 'Thursday',
          autoRandomPicks: settingsMap.auto_random_picks === 'true',
          randomPickStrategy: (settingsMap.random_pick_strategy as 'best_odds_winning' | 'best_odds_losing') || 'best_odds_losing'
        })
      }
    } catch (error) {
      console.error('Error loading rules:', error)
      setError('Failed to load current rules')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // First, check if user is authenticated and is admin
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        setError('Authentication error: ' + authError.message)
        return
      }
      
      if (!user) {
        setError('No authenticated user found')
        return
      }
      
      console.log('Current user:', user.id, user.email)
      
      // Check if user is admin
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        console.error('Profile error:', profileError)
        setError('Error checking admin status: ' + profileError.message)
        return
      }
      
      console.log('User admin status:', userProfile?.is_admin)
      
      if (!userProfile?.is_admin) {
        setError('Access denied: Admin privileges required')
        return
      }

      console.log('Saving rules:', rules)

      // Update global settings
      const updates = [
        { key: 'pick_type', value: rules.pickType },
        { key: 'tie_handling', value: rules.tieHandling },
        { key: 'pick_price', value: rules.pickPrice.toString() },
        { key: 'lock_time', value: rules.lockTime },
        { key: 'max_picks_per_user', value: rules.maxPicksPerUser.toString() },
        { key: 'max_total_picks', value: rules.maxTotalPicks.toString() },
        { key: 'prize_distribution', value: rules.prizeDistribution },
        { key: 'elimination_type', value: rules.eliminationType },
        { key: 'allow_multiple_picks_per_game', value: rules.allowMultiplePicksPerGame.toString() },
        { key: 'allow_pick_changes', value: rules.allowPickChanges.toString() },
        { key: 'pick_change_deadline', value: rules.pickChangeDeadline },
        { key: 'auto_random_picks', value: rules.autoRandomPicks.toString() },
        { key: 'random_pick_strategy', value: rules.randomPickStrategy }
      ]

      console.log('Updates to perform:', updates)

      for (const update of updates) {
        console.log('Updating:', update.key, '=', update.value)
        
        // First try to update existing record
        const { data: updateData, error: updateError } = await supabase
          .from('global_settings')
          .update({ value: update.value })
          .eq('key', update.key)
          .select()

        if (updateError) {
          console.error('Update error for', update.key, ':', updateError)
          
          // If update fails, try to insert (in case the key doesn't exist)
          const { data: insertData, error: insertError } = await supabase
            .from('global_settings')
            .insert({ key: update.key, value: update.value })
            .select()

          if (insertError) {
            console.error('Insert error for', update.key, ':', insertError)
            throw insertError
          }
          
          console.log('Insert result for', update.key, ':', { data: insertData, error: insertError })
        } else {
          console.log('Update result for', update.key, ':', { data: updateData, error: updateError })
        }
      }

      setSuccess('Rules updated successfully!')
    } catch (error) {
      console.error('Error saving rules:', error)
      
      // More detailed error handling
      let errorMessage = 'Failed to save rules'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase error objects
        const supabaseError = error as { message?: string; error?: string; details?: string }
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        } else if (supabaseError.error) {
          errorMessage = supabaseError.error
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details
        } else {
          errorMessage = JSON.stringify(error)
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
          <p className="mt-4 text-blue-200">Loading...</p>
        </div>
      </div>
    )
  }

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
        {/* Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500/30 text-green-200 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Pool Rules Configuration</h2>
            <p className="text-blue-100">Configure the rules and settings for The Loser Pool</p>
          </div>
          <div className="p-6 space-y-8">
            
            {/* Pick Type */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Pick Type</h3>
              <div className="bg-white/5 rounded-lg p-4">
                <label className="block text-sm font-medium text-white mb-3">
                  What type of pick do players make?
                </label>
                <select
                  value={rules.pickType}
                  onChange={(e) => setRules({...rules, pickType: e.target.value as 'loser' | 'winner'})}
                  className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                >
                  <option value="loser">Pick the LOSER (team that loses)</option>
                  <option value="winner">Pick the WINNER (team that wins)</option>
                </select>
                <p className="text-sm text-blue-200 mt-2">
                  {rules.pickType === 'loser' 
                    ? 'Players pick teams they think will lose. If their pick wins, they are eliminated.'
                    : 'Players pick teams they think will win. If their pick loses, they are eliminated.'
                  }
                </p>
              </div>
            </div>

            {/* Tie Handling */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Tie Handling</h3>
              <div className="bg-white/5 rounded-lg p-4">
                <label className="block text-sm font-medium text-white mb-3">
                  What happens when a game ends in a tie?
                </label>
                <select
                  value={rules.tieHandling}
                  onChange={(e) => setRules({...rules, tieHandling: e.target.value as 'elimination' | 'carry_forward' | 'win'})}
                  className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                >
                  <option value="elimination">Ties are eliminations</option>
                  <option value="carry_forward">Ties are carried forward to next week</option>
                  <option value="win">Ties are wins (player survives)</option>
                </select>
                <p className="text-sm text-blue-200 mt-2">
                  {rules.tieHandling === 'elimination' && 'Players are eliminated if their game ends in a tie.'}
                  {rules.tieHandling === 'carry_forward' && 'Players survive the tie but must pick again next week.'}
                  {rules.tieHandling === 'win' && 'Players survive and advance to the next week.'}
                </p>
              </div>
            </div>

            {/* Pick Price */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Pick Pricing</h3>
              <div className="bg-white/5 rounded-lg p-4">
                <label className="block text-sm font-medium text-white mb-2">
                  Pick Price (USD)
                </label>
                <input
                  type="number"
                  value={rules.pickPrice}
                  onChange={(e) => setRules({...rules, pickPrice: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                  min="1"
                  step="0.01"
                />
                <p className="text-sm text-blue-200 mt-2">
                  Cost per pick in dollars. This affects the Stripe payment processing.
                </p>
              </div>
            </div>

            {/* Pick Limits */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Pick Limits</h3>
              <div className="bg-white/5 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Maximum Picks Per User
                  </label>
                  <input
                    type="number"
                    value={rules.maxPicksPerUser}
                    onChange={(e) => setRules({...rules, maxPicksPerUser: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Maximum Total Picks (Pool-wide)
                  </label>
                  <input
                    type="number"
                    value={rules.maxTotalPicks}
                    onChange={(e) => setRules({...rules, maxTotalPicks: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Pick Behavior */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Pick Behavior</h3>
              <div className="bg-white/5 rounded-lg p-4 space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowMultiplePicksPerGame"
                    checked={rules.allowMultiplePicksPerGame}
                    onChange={(e) => setRules({...rules, allowMultiplePicksPerGame: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="allowMultiplePicksPerGame" className="ml-2 text-sm text-white">
                    Allow multiple picks on the same game
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowPickChanges"
                    checked={rules.allowPickChanges}
                    onChange={(e) => setRules({...rules, allowPickChanges: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="allowPickChanges" className="ml-2 text-sm text-white">
                    Allow pick changes after initial save
                  </label>
                </div>
              </div>
            </div>

            {/* Deadlines */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Deadlines</h3>
              <div className="bg-white/5 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Pick Lock Time
                  </label>
                  <select
                    value={rules.lockTime}
                    onChange={(e) => setRules({...rules, lockTime: e.target.value})}
                    className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                  >
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                  </select>
                </div>
                {rules.allowPickChanges && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Pick Change Deadline
                    </label>
                    <select
                      value={rules.pickChangeDeadline}
                      onChange={(e) => setRules({...rules, pickChangeDeadline: e.target.value})}
                      className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                    >
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                      <option value="Monday">Monday</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Elimination Type */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Elimination Type</h3>
              <div className="bg-white/5 rounded-lg p-4">
                <label className="block text-sm font-medium text-white mb-3">
                  When are players eliminated?
                </label>
                <select
                  value={rules.eliminationType}
                  onChange={(e) => setRules({...rules, eliminationType: e.target.value as 'immediate' | 'end_of_week'})}
                  className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                >
                  <option value="immediate">Immediately when their game ends</option>
                  <option value="end_of_week">At the end of the week</option>
                </select>
                <p className="text-sm text-blue-200 mt-2">
                  {rules.eliminationType === 'immediate' 
                    ? 'Players are eliminated as soon as their picked game finishes.'
                    : 'Players are eliminated after all games for the week are complete.'
                  }
                </p>
              </div>
            </div>

            {/* Prize Distribution */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Prize Distribution</h3>
              <div className="bg-white/5 rounded-lg p-4">
                <label className="block text-sm font-medium text-white mb-3">
                  How are prizes distributed?
                </label>
                                 <select
                   value={rules.prizeDistribution}
                   onChange={(e) => setRules({...rules, prizeDistribution: e.target.value as 'winner_takes_all' | 'top_3' | 'top_5' | 'even_split'})}
                   className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                 >
                   <option value="winner_takes_all">Winner takes all</option>
                   <option value="top_3">Top 3 players</option>
                   <option value="top_5">Top 5 players</option>
                   <option value="even_split">Even split by remaining picks</option>
                 </select>
                 <p className="text-sm text-blue-200 mt-2">
                   {rules.prizeDistribution === 'winner_takes_all' && 'The last player standing wins the entire prize pool.'}
                   {rules.prizeDistribution === 'top_3' && 'The last 3 players split the prize pool (50%, 30%, 20%).'}
                   {rules.prizeDistribution === 'top_5' && 'The last 5 players split the prize pool (40%, 25%, 20%, 10%, 5%).'}
                   {rules.prizeDistribution === 'even_split' && 'Prize pool is evenly split among all remaining picks at season end. Multiple winners possible.'}
                 </p>
              </div>
            </div>

            {/* Auto Random Picks */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Auto Random Picks</h3>
              <div className="bg-white/5 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Enable Auto Random Picks
                    </label>
                    <div className="text-sm text-blue-200">
                      Automatically assign random picks if users don&apos;t make selections
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rules.autoRandomPicks}
                      onChange={(e) => setRules({...rules, autoRandomPicks: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                {rules.autoRandomPicks && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Random Pick Strategy
                    </label>
                    <select
                      value={rules.randomPickStrategy}
                      onChange={(e) => setRules({...rules, randomPickStrategy: e.target.value as 'best_odds_winning' | 'best_odds_losing'})}
                      className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                    >
                      <option value="best_odds_losing">Best odds of losing (recommended for loser pool)</option>
                      <option value="best_odds_winning">Best odds of winning (for winner pool)</option>
                    </select>
                    <p className="text-sm text-blue-200 mt-2">
                      {rules.randomPickStrategy === 'best_odds_losing' 
                        ? 'Random picks will favor teams with the best odds of losing, which is ideal for a loser pool.'
                        : 'Random picks will favor teams with the best odds of winning, which is ideal for a winner pool.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Rules'}
              </button>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                <strong>Important:</strong> Changing these rules will affect how the pool operates. 
                Make sure to communicate any rule changes to your players before they take effect.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 