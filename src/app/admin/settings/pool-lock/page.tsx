import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPoolStatus } from '@/lib/pool-status'
import Link from 'next/link'
import { ArrowLeft, Settings, Clock, Lock, Unlock } from 'lucide-react'

export default async function PoolLockPage() {
  await requireAdmin()
  const supabase = await createServerSupabaseClient()
  const poolStatus = await getPoolStatus()

  // Get current settings
  const { data: settings } = await supabase
    .from('global_settings')
    .select('*')
    .in('key', ['pool_lock_date', 'pool_locked'])

  const settingsMap = settings?.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>) || {}

  const lockDate = settingsMap.pool_lock_date || '2025-08-31 23:59:00'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
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
                <h1 className="text-3xl font-bold text-white">Pool Lock Management</h1>
                <p className="text-blue-100">Control pool registration and purchases</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Status */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Current Pool Status</h2>
              <div className={`text-2xl font-bold ${poolStatus.isLocked ? 'text-red-400' : 'text-green-400'}`}>
                {poolStatus.isLocked ? '🔒 Pool is Locked' : '🔓 Pool is Open'}
              </div>
              <p className="text-blue-100 mt-2">
                {poolStatus.isLocked 
                  ? 'No new registrations or purchases are allowed.'
                  : 'Users can register and purchase picks normally.'
                }
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-200">Lock Date</div>
              <div className="text-lg font-semibold text-white">
                {new Date(lockDate).toLocaleString()}
              </div>
              {poolStatus.timeUntilLock && poolStatus.timeUntilLock > 0 && (
                <div className="text-sm text-yellow-400 mt-1">
                  {Math.floor(poolStatus.timeUntilLock / (1000 * 60 * 60 * 24))} days remaining
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manual Lock Controls */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Manual Lock Controls</h2>
          <p className="text-blue-100 mb-6">
            Override the automatic lock date to immediately lock or unlock the pool.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lock Pool */}
            <div className="bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-300 p-6">
              <div className="flex items-center mb-4">
                <Lock className="w-6 h-6 text-red-400 mr-3" />
                <h3 className="text-lg font-semibold text-white">Lock Pool</h3>
              </div>
              <p className="text-red-200 mb-4">
                Immediately lock the pool. No new registrations or purchases will be allowed.
              </p>
              <form action="/api/admin/pool-lock/lock" method="POST">
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                  disabled={poolStatus.isLocked}
                >
                  {poolStatus.isLocked ? 'Pool Already Locked' : 'Lock Pool Now'}
                </button>
              </form>
            </div>

            {/* Unlock Pool */}
            <div className="bg-green-500/20 backdrop-blur-sm rounded-lg border border-green-300 p-6">
              <div className="flex items-center mb-4">
                <Unlock className="w-6 h-6 text-green-400 mr-3" />
                <h3 className="text-lg font-semibold text-white">Unlock Pool</h3>
              </div>
              <p className="text-green-200 mb-4">
                Unlock the pool to allow new registrations and purchases.
              </p>
              <form action="/api/admin/pool-lock/unlock" method="POST">
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                  disabled={!poolStatus.isLocked}
                >
                  {!poolStatus.isLocked ? 'Pool Already Open' : 'Unlock Pool Now'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Lock Date Settings */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Automatic Lock Date</h2>
          <p className="text-blue-100 mb-6">
            Set when the pool should automatically lock. This will override any manual lock settings.
          </p>

          <form action="/api/admin/pool-lock/update-date" method="POST" className="space-y-4">
            <div>
              <label htmlFor="lockDate" className="block text-sm font-medium text-white mb-2">
                Lock Date & Time
              </label>
              <input
                type="datetime-local"
                id="lockDate"
                name="lockDate"
                defaultValue={lockDate.replace(' ', 'T')}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-blue-200 mt-1">
                The pool will automatically lock at this date and time.
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                Update Lock Date
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date()
                  now.setDate(now.getDate() + 1)
                  document.getElementById('lockDate')?.setAttribute('value', now.toISOString().slice(0, 16))
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                Set to Tomorrow
              </button>
            </div>
          </form>
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/20 backdrop-blur-sm rounded-lg border border-yellow-300 p-6">
          <div className="flex items-center mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
            <h3 className="text-lg font-semibold text-yellow-200">Important</h3>
          </div>
          <p className="text-yellow-100">
            Locking the pool will immediately prevent new registrations and purchases. 
            This action cannot be easily undone if users are expecting to register.
          </p>
        </div>
      </div>
    </div>
  )
} 