'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RefreshCw, Clock, Database, CheckCircle, XCircle, Play, Pause, Settings } from 'lucide-react'
import AdminHeader from '@/components/admin-header'

interface UpdateLog {
  id: string
  timestamp: string
  status: 'success' | 'error' | 'running'
  message: string
  games_found: number
  games_updated: number
  execution_time_ms: number
}

interface AutomatedSettings {
  enabled: boolean
  last_run: string | null
  next_run: string | null
  schedule: string
}

export default function DataManagementPage() {
  const [profile, setProfile] = useState<{ id: string; is_admin: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [logs, setLogs] = useState<UpdateLog[]>([])
  const [settings, setSettings] = useState<AutomatedSettings>({
    enabled: true,
    last_run: null,
    next_run: null,
    schedule: '0 6,18 * * *' // 6 AM and 6 PM CST
  })
  const [currentStatus, setCurrentStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const router = useRouter()

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get user profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData?.is_admin) {
        router.push('/dashboard')
        return
      }

      setProfile(profileData)
      await loadLogs()
      await loadSettings()
      setLoading(false)
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    checkAuthAndLoadData()
  }, [checkAuthAndLoadData])

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('automated_update_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', ['automated_updates_enabled', 'automated_updates_last_run', 'automated_updates_next_run'])

      if (error) throw error

      const settingsMap = new Map(data?.map(item => [item.key, item.value]) || [])
      setSettings({
        enabled: settingsMap.get('automated_updates_enabled') === 'true',
        last_run: settingsMap.get('automated_updates_last_run') || null,
        next_run: settingsMap.get('automated_updates_next_run') || null,
        schedule: '0 6,18 * * *' // Default schedule
      })
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const triggerManualUpdate = async () => {
    setRefreshing(true)
    setCurrentStatus('running')
    setStatusMessage('Starting manual data update...')

    try {
      // Log the start of manual update
      const { error: logError } = await supabase
        .from('automated_update_logs')
        .insert({
          timestamp: new Date().toISOString(),
          status: 'running',
          message: 'Manual update triggered by admin',
          games_found: 0,
          games_updated: 0,
          execution_time_ms: 0
        })

      if (logError) console.error('Error logging start:', logError)

      // Trigger the update via API
      const response = await fetch('/api/admin/trigger-data-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manual: true,
          admin_id: profile?.id
        })
      })

      const result = await response.json()

      if (result.success) {
        setCurrentStatus('success')
        setStatusMessage(`Update completed successfully! Found ${result.games_found} games, updated ${result.games_updated} records.`)
        
        // Update last run time
        await supabase
          .from('global_settings')
          .upsert({
            key: 'automated_updates_last_run',
            value: new Date().toISOString()
          })
      } else {
        throw new Error(result.error || 'Update failed')
      }

      await loadLogs()
      await loadSettings()
    } catch (error) {
      console.error('Error triggering update:', error)
      setCurrentStatus('error')
      setStatusMessage(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setRefreshing(false)
    }
  }

  const toggleAutomatedUpdates = async () => {
    try {
      const newEnabled = !settings.enabled
      await supabase
        .from('global_settings')
        .upsert({
          key: 'automated_updates_enabled',
          value: newEnabled.toString()
        })

      setSettings(prev => ({ ...prev, enabled: newEnabled }))
    } catch (error) {
      console.error('Error toggling automated updates:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminHeader title="Data Management" subtitle="Manage NFL data updates and automation" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Database className="w-6 h-6 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Automated Updates</p>
                <p className="text-2xl font-bold text-white">
                  {settings.enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Last Run</p>
                <p className="text-lg font-semibold text-white">
                  {settings.last_run ? formatTimestamp(settings.last_run) : 'Never'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Settings className="w-6 h-6 text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Schedule</p>
                <p className="text-lg font-semibold text-white">6 AM & 6 PM CST</p>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Update Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Manual Data Update</h2>
              <p className="text-gray-300">Trigger an immediate update from NFL.com for both current and next week&apos;s games</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={toggleAutomatedUpdates}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  settings.enabled
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {settings.enabled ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                {settings.enabled ? 'Auto Updates ON' : 'Auto Updates OFF'}
              </button>
              <button
                onClick={triggerManualUpdate}
                disabled={refreshing}
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Updating...' : 'Update Now'}
              </button>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-4 rounded-lg mb-4 ${
              currentStatus === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-200' :
              currentStatus === 'error' ? 'bg-red-500/20 border border-red-500/30 text-red-200' :
              currentStatus === 'running' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-200' :
              'bg-gray-500/20 border border-gray-500/30 text-gray-200'
            }`}>
              <div className="flex items-center">
                {getStatusIcon(currentStatus)}
                <span className="ml-2">{statusMessage}</span>
              </div>
            </div>
          )}

          {/* Update Process Info */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-3">Update Process</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <p className="font-medium text-white mb-2">What happens during an update:</p>
                <ul className="space-y-1">
                  <li>• Scrapes NFL.com for current week games</li>
                  <li>• Scrapes NFL.com for next week games</li>
                  <li>• Compares with existing database records</li>
                  <li>• Updates only changed information</li>
                  <li>• Logs all activities and errors</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-white mb-2">Data sources:</p>
                <ul className="space-y-1">
                  <li>• Primary: Enhanced NFL.com scraper</li>
                  <li>• Fallback: ChatGPT NFL service</li>
                  <li>• Weather: WeatherStack API</li>
                  <li>• Odds: DraftKings sportsbook</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Update Logs */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Update Logs</h2>
              <button
                onClick={loadLogs}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Refresh Logs
              </button>
            </div>
          </div>
          <div className="p-6">
            {logs.length > 0 ? (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(log.status)}
                        <div>
                          <p className="text-white font-medium">{log.message}</p>
                          <p className="text-sm text-gray-400">
                            {formatTimestamp(log.timestamp)} • 
                            {log.games_found > 0 && ` Found: ${log.games_found} games`} • 
                            {log.games_updated > 0 && ` Updated: ${log.games_updated} records`} • 
                            {log.execution_time_ms > 0 && ` Duration: ${formatExecutionTime(log.execution_time_ms)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Database className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No update logs found</p>
                <p className="text-sm text-gray-500">Logs will appear here after running updates</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
