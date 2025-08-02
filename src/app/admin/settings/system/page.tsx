'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminHeader from '@/components/admin-header'

interface SystemData {
  maintenanceMode: boolean
  debugMode: boolean
  emailNotifications: boolean
  autoBackup: boolean
}

export default function AdminSystemPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const [system, setSystem] = useState<SystemData>({
    maintenanceMode: false,
    debugMode: false,
    emailNotifications: true,
    autoBackup: true
  })

  useEffect(() => {
    loadSystemSettings()
  }, [])

  const loadSystemSettings = async () => {
    try {
      setLoading(true)
      
      // Get current system settings from global settings
      const { data: settings } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', ['maintenance_mode', 'debug_mode', 'email_notifications', 'auto_backup'])

      if (settings) {
        const maintenanceMode = settings.find(s => s.key === 'maintenance_mode')?.value === 'true'
        const debugMode = settings.find(s => s.key === 'debug_mode')?.value === 'true'
        const emailNotifications = settings.find(s => s.key === 'email_notifications')?.value !== 'false'
        const autoBackup = settings.find(s => s.key === 'auto_backup')?.value !== 'false'

        setSystem({
          maintenanceMode,
          debugMode,
          emailNotifications,
          autoBackup
        })
      }
    } catch (error) {
      console.error('Error loading system settings:', error)
      setError('Failed to load system settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Update global settings
      const updates = [
        { key: 'maintenance_mode', value: system.maintenanceMode.toString() },
        { key: 'debug_mode', value: system.debugMode.toString() },
        { key: 'email_notifications', value: system.emailNotifications.toString() },
        { key: 'auto_backup', value: system.autoBackup.toString() }
      ]

      for (const update of updates) {
        const { error } = await supabase
          .from('global_settings')
          .upsert({ key: update.key, value: update.value })

        if (error) {
          throw error
        }
      }

      setSuccess('System settings updated successfully!')
    } catch (error) {
      console.error('Error saving system settings:', error)
      setError('Failed to save system settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
          <p className="mt-4 text-blue-200">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <AdminHeader 
        title="System Settings"
        subtitle="Configure system behavior and maintenance"
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
            <h2 className="text-xl font-semibold text-white">System Configuration</h2>
            <p className="text-blue-100">Manage system behavior and maintenance settings</p>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Maintenance Mode */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Maintenance Mode
                </label>
                <div className="text-sm text-blue-200">
                  Temporarily disable user access for maintenance
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={system.maintenanceMode}
                  onChange={(e) => setSystem({...system, maintenanceMode: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            {/* Debug Mode */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Debug Mode
                </label>
                <div className="text-sm text-blue-200">
                  Enable detailed logging and error reporting
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={system.debugMode}
                  onChange={(e) => setSystem({...system, debugMode: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Email Notifications
                </label>
                <div className="text-sm text-blue-200">
                  Send email notifications for important events
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={system.emailNotifications}
                  onChange={(e) => setSystem({...system, emailNotifications: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Auto Backup */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Auto Backup
                </label>
                <div className="text-sm text-blue-200">
                  Automatically backup data daily
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={system.autoBackup}
                  onChange={(e) => setSystem({...system, autoBackup: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Save Button */}
            <div className="pt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {/* System Info */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-blue-200">System Status</div>
                  <div className="text-2xl font-bold text-green-400">Online</div>
                  <div className="text-xs text-blue-300">All systems operational</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-blue-200">Last Backup</div>
                  <div className="text-2xl font-bold text-white">Today</div>
                  <div className="text-xs text-blue-300">2:30 AM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 