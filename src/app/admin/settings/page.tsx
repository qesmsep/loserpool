import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowLeft, Settings, Users, Calendar, DollarSign } from 'lucide-react'

export default async function AdminSettingsPage() {
  await requireAdmin()
  const supabase = await createServerSupabaseClient()

  // Get global settings
  const { data: settings } = await supabase
    .from('global_settings')
    .select('*')
    .order('key')

  // Get user stats
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .count()

  const { data: purchases } = await supabase
    .from('purchases')
    .select('amount')
    .eq('status', 'completed')

  const totalRevenue = purchases?.reduce((sum, p) => sum + p.amount, 0) || 0
  const currentEntries = users?.count || 0

  // Create settings map
  const settingsMap = settings?.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>) || {}

  const maxTotalEntries = parseInt(settingsMap.max_total_entries || '2100')
  const entriesPerUser = parseInt(settingsMap.entries_per_user || '10')
  const entriesRemaining = maxTotalEntries - currentEntries

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
                <h1 className="text-3xl font-bold text-white">Pool Settings</h1>
                <p className="text-blue-100">Configure pool rules and dates</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Current Entries</p>
                <p className="text-2xl font-bold text-white">{currentEntries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-green-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-100">Entries Remaining</p>
                <p className="text-2xl font-bold text-white">{entriesRemaining}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Settings className="w-6 h-6 text-purple-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">Per User Limit</p>
                <p className="text-2xl font-bold text-white">{entriesPerUser}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-orange-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Total Revenue</p>
                <p className="text-2xl font-bold text-white">${(totalRevenue / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Entry Limits */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/20">
              <h2 className="text-xl font-semibold text-white">Entry Limits</h2>
              <p className="text-blue-100">Configure pool capacity and user limits</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Max Total Entries</div>
                  <div className="text-sm text-blue-200">Maximum number of entries allowed</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-white">{maxTotalEntries}</div>
                  <div className="text-sm text-blue-200">
                    {entriesRemaining} remaining
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Entries Per User</div>
                  <div className="text-sm text-blue-200">Maximum entries per user account</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-white">{entriesPerUser}</div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/admin/settings/limits"
                  className="text-blue-200 hover:text-white transition-colors text-sm"
                >
                  Edit Limits →
                </Link>
              </div>
            </div>
          </div>

          {/* Pool Rules */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/20">
              <h2 className="text-xl font-semibold text-white">Pool Rules</h2>
              <p className="text-blue-100">Configure game rules and settings</p>
            </div>
            <div className="p-6 space-y-4">
                             <div className="flex justify-between items-center">
                 <div>
                   <div className="text-sm font-medium text-white">Pick Price</div>
                   <div className="text-sm text-blue-200">Cost per pick in dollars</div>
                 </div>
                 <div className="text-right">
                   <div className="text-lg font-semibold text-white">$21.00</div>
                 </div>
               </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Pick Lock Time</div>
                  <div className="text-sm text-blue-200">When picks lock each week</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-white">Thursday Night</div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/admin/settings/rules"
                  className="text-blue-200 hover:text-white transition-colors text-sm"
                >
                  Edit Rules →
                </Link>
              </div>
            </div>
          </div>

          {/* Season Settings */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/20">
              <h2 className="text-xl font-semibold text-white">Season Settings</h2>
              <p className="text-blue-100">Configure season dates and schedule</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Season Start</div>
                  <div className="text-sm text-blue-200">When the pool begins</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-white">Week 1</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Registration Deadline</div>
                  <div className="text-sm text-blue-200">Last day to join</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-white">Before Week 1</div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/admin/settings/season"
                  className="text-blue-200 hover:text-white transition-colors text-sm"
                >
                  Edit Season →
                </Link>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/20">
              <h2 className="text-xl font-semibold text-white">System Settings</h2>
              <p className="text-blue-100">Configure system behavior</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Auto Random Picks</div>
                  <div className="text-sm text-blue-200">Assign random picks if none made</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-200">
                    Enabled
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Email Notifications</div>
                  <div className="text-sm text-blue-200">Send email updates to users</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-200">
                    Enabled
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/admin/settings/system"
                  className="text-blue-200 hover:text-white transition-colors text-sm"
                >
                  Edit System →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/settings/backup"
              className="bg-blue-600/20 text-blue-200 px-4 py-3 rounded-lg hover:bg-blue-600/30 transition-colors"
            >
              <div className="font-medium">Backup Data</div>
              <div className="text-sm opacity-75">Export pool data</div>
            </Link>
            
            <Link
              href="/admin/settings/reset"
              className="bg-red-600/20 text-red-200 px-4 py-3 rounded-lg hover:bg-red-600/30 transition-colors"
            >
              <div className="font-medium">Reset Pool</div>
              <div className="text-sm opacity-75">Clear all data (dangerous)</div>
            </Link>
            
            <Link
              href="/admin/settings/maintenance"
              className="bg-yellow-600/20 text-yellow-200 px-4 py-3 rounded-lg hover:bg-yellow-600/30 transition-colors"
            >
              <div className="font-medium">Maintenance Mode</div>
              <div className="text-sm opacity-75">Enable maintenance mode</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 