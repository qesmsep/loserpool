import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { MatchupDataService } from '@/lib/matchup-data-service'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export default async function AutomatedUpdatesPage() {
  await requireAdmin()
  const supabase = await createServerSupabaseClient()

  // Get global settings
  const { data: settings } = await supabase
    .from('global_settings')
    .select('key, value')
    .in('key', ['automated_updates_enabled', 'last_automated_update'])

  const settingsMap = settings?.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>) || {}

  // Get recent update logs
  const { data: updateLogs } = await supabase
    .from('automated_update_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  // Get current week display and matchups
  const matchupService = new MatchupDataService()
  const currentWeekDisplay = await matchupService.getCurrentWeekDisplay()
  const currentWeek = await matchupService.getCurrentWeek()
  

  
  // Get current week matchups with update info
  const { data: currentMatchups } = await supabase
    .from('matchups')
    .select('*')
    .eq('week', currentWeek)
            .order('get_season_order(season)', { ascending: true })
        .order('game_time', { ascending: true })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'partial':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      case 'partial':
        return 'text-yellow-500'
      default:
        return 'text-gray-500'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isEnabled = settingsMap.automated_updates_enabled === 'true'
  const lastUpdate = settingsMap.last_automated_update ? formatDate(settingsMap.last_automated_update) : 'Never'

  return (
    <div className="min-h-screen app-bg">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/settings"
                className="flex items-center text-blue-100 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Settings
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Automated Updates</h1>
                <p className="text-blue-100">Monitor and control automated matchup data collection</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <Link
                href="/api/cron/update-matchups"
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Manual Update
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${isEnabled ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {isEnabled ? (
                  <CheckCircle className="w-6 h-6 text-green-200" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-200" />
                )}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Status</p>
                <p className={`text-2xl font-bold ${isEnabled ? 'text-green-300' : 'text-red-300'}`}>
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-blue-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Last Update</p>
                <p className="text-lg font-semibold text-white">{lastUpdate}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <RefreshCw className="w-6 h-6 text-purple-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">Schedule</p>
                <p className="text-lg font-semibold text-white">6am & 6pm CST</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-200" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Current Week</p>
                <p className="text-2xl font-bold text-white">1</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Update Logs */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 mb-8">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Recent Update Logs</h2>
            <p className="text-blue-100">Last 10 automated update attempts</p>
          </div>
          <div className="p-6">
            {updateLogs && updateLogs.length > 0 ? (
              <div className="space-y-4">
                {updateLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border border-white/20 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(log.status)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`font-semibold ${getStatusColor(log.status)}`}>
                            {log.status.toUpperCase()}
                          </span>
                          <span className="text-blue-200">•</span>
                          <span className="text-white font-medium">{log.update_type}</span>
                        </div>
                        <div className="text-sm text-blue-200 mt-1">
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-blue-200">
                        {log.matchups_processed} processed, {log.matchups_updated} updated
                      </div>
                      <div className="text-sm text-gray-400">
                        {log.execution_time_ms}ms
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-blue-200 text-lg">No update logs found</div>
                <p className="text-blue-100 mt-2">Automated updates haven&apos;t run yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Current Week Matchups */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Current Week Matchups</h2>
            <p className="text-blue-100">{currentWeekDisplay} matchups with update status</p>
          </div>
          <div className="p-6">
            {currentMatchups && currentMatchups.length > 0 ? (
              <div className="space-y-4">
                {currentMatchups.map((matchup) => (
                  <div key={matchup.id} className="flex items-center justify-between p-4 border border-white/20 rounded-lg bg-white/5">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-white">{matchup.away_team}</span>
                          <span className="text-lg font-semibold text-white">@</span>
                          <span className="text-sm font-semibold text-white">{matchup.home_team}</span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          matchup.status === 'final' ? 'bg-green-500/20 text-green-200' :
                          matchup.status === 'live' ? 'bg-yellow-500/20 text-yellow-200' :
                          matchup.status === 'postponed' ? 'bg-red-500/20 text-red-200' :
                          'bg-gray-500/20 text-gray-200'
                        }`}>
                          {matchup.status}
                        </span>
                      </div>
                      <div className="text-sm text-blue-200 mt-1">
                        {formatDate(matchup.game_time)}
                        {matchup.venue && (
                          <span className="ml-4">📍 {matchup.venue}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="text-sm text-blue-200">Data Source</div>
                        <div className="text-sm font-semibold text-white">{matchup.data_source || 'manual'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-blue-200">Last API Update</div>
                        <div className="text-sm font-semibold text-white">
                          {matchup.last_api_update ? formatDate(matchup.last_api_update) : 'Never'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-blue-200">Update Count</div>
                        <div className="text-sm font-semibold text-white">{matchup.api_update_count || 0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-blue-200 text-lg">No matchups found for current week</div>
                <p className="text-blue-100 mt-2">Add matchups to see them here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
