'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Settings, Users, Calendar, DollarSign } from 'lucide-react'

interface GlobalSetting {
  key: string
  value: string
}

interface Purchase {
  amount_paid: number
  picks_count: number
}

interface PoolStatus {
  isLocked: boolean
  lockDate?: string
  timeUntilLock?: number
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<GlobalSetting[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [poolStatus, setPoolStatus] = useState<PoolStatus>({ isLocked: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError('')
        
        // Get the current session token
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token
        
        if (!accessToken) {
          throw new Error('No session token available')
        }
        
        // Prepare headers with authorization
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
        
        // Load settings data
        const settingsResponse = await fetch('/api/admin/settings', {
          credentials: 'include',
          headers
        })
        
        if (!settingsResponse.ok) {
          const errorData = await settingsResponse.json()
          throw new Error(errorData.error || 'Failed to fetch settings')
        }
        
        const settingsData = await settingsResponse.json()
        setSettings(settingsData.settings || [])
        setPurchases(settingsData.purchases || [])
        setPoolStatus(settingsData.poolStatus || { isLocked: false })
        
      } catch (err) {
        console.error('Error loading settings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate stats
  const totalRevenue = purchases?.reduce((sum, p) => sum + p.amount_paid, 0) || 0
  const totalPicksPurchased = purchases?.reduce((sum, p) => sum + p.picks_count, 0) || 0

  // Create settings map
  const settingsMap = settings?.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>) || {}

  const maxTotalEntries = parseInt(settingsMap.max_total_entries || '2100')
  const entriesPerUser = parseInt(settingsMap.entries_per_user || '10')
  const entriesRemaining = maxTotalEntries - totalPicksPurchased
  const pickPrice = parseFloat(settingsMap.pick_price || '1.00')

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-white text-lg">Loading settings...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-red-400 text-lg">Error: {error}</div>
      </div>
    )
  }

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
                <p className="text-2xl font-bold text-white">{totalPicksPurchased}</p>
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
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-white">Entry Limits</h2>
                <p className="text-blue-100">Configure pool capacity and user limits</p>
              </div>
              <Link
                href="/admin/settings/limits"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors inline-flex items-center text-sm font-medium"
              >
                Edit Limits →
              </Link>
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
            </div>
          </div>

          {/* Pool Rules */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-white">Pool Rules</h2>
                <p className="text-blue-100">Configure game rules and settings</p>
              </div>
              <Link
                href="/admin/settings/rules"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors inline-flex items-center text-sm font-medium"
              >
                Edit Rules →
              </Link>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Pick Price</div>
                  <div className="text-sm text-blue-200">Cost per pick in dollars</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-white">${pickPrice.toFixed(2)}</div>
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
            </div>
          </div>

          {/* Pool Lock Controls */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-white">Pool Lock</h2>
                <p className="text-blue-100">Control pool registration and purchases</p>
              </div>
              <Link
                href="/admin/settings/pool-lock"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors inline-flex items-center text-sm font-medium"
              >
                Manage Pool Lock →
              </Link>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Current Status</div>
                  <div className="text-sm text-blue-200">Pool registration status</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-semibold ${poolStatus.isLocked ? 'text-red-400' : 'text-green-400'}`}>
                    {poolStatus.isLocked ? '🔒 Locked' : '🔓 Open'}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Lock Date</div>
                  <div className="text-sm text-blue-200">Automatic lock date</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-white">
                    {poolStatus.lockDate ? new Date(poolStatus.lockDate).toLocaleDateString() : 'Not set'}
                  </div>
                </div>
              </div>

              {poolStatus.timeUntilLock && poolStatus.timeUntilLock > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-white">Time Until Lock</div>
                    <div className="text-sm text-blue-200">Automatic lock countdown</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-yellow-400">
                      {Math.floor(poolStatus.timeUntilLock / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Season Settings */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-white">Season Settings</h2>
                <p className="text-blue-100">Configure season dates and schedule</p>
              </div>
              <Link
                href="/admin/settings/season"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors inline-flex items-center text-sm font-medium"
              >
                Edit Season →
              </Link>
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
            </div>
          </div>

          {/* Communications */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-white">Communications</h2>
                <p className="text-blue-100">Manage email templates and automated messages</p>
              </div>
              <Link
                href="/admin/settings/communications"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors inline-flex items-center text-sm font-medium"
              >
                Manage Communications →
              </Link>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Pick Reminders</div>
                  <div className="text-sm text-blue-200">Weekly reminder emails</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-200">
                    Active
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Welcome Messages</div>
                  <div className="text-sm text-blue-200">New user onboarding</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-200">
                    Active
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Elimination Notifications</div>
                  <div className="text-sm text-blue-200">When users are eliminated</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-500/20 text-gray-200">
                    Disabled
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Automated Updates */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-white">Automated Updates</h2>
                <p className="text-blue-100">Monitor matchup data collection and API integrations</p>
              </div>
              <Link
                href="/admin/data-management"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors inline-flex items-center text-sm font-medium"
              >
                Manage Data Updates →
              </Link>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Matchup Updates</div>
                  <div className="text-sm text-blue-200">NFL.com scraping (6 AM & 6 PM CST)</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-200">
                    Active
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Weather Data</div>
                  <div className="text-sm text-blue-200">WeatherStack integration</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-200">
                    Active
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Password Reset</div>
                  <div className="text-sm text-blue-200">Admin password reset tool</div>
                </div>
                <div className="text-right">
                  <Link
                    href="/admin/password-reset"
                    className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 transition-colors"
                  >
                    Access Tool
                  </Link>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-white">Odds Data</div>
                  <div className="text-sm text-blue-200">DraftKings Sportsbook integration</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-200">
                    Active
                  </span>
                </div>
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