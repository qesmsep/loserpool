'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminHeader from '@/components/admin-header'

interface MaintenanceData {
  maintenanceMode: boolean
  maintenanceMessage: string
  estimatedDuration: string
}

export default function AdminMaintenancePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  const [maintenance, setMaintenance] = useState<MaintenanceData>({
    maintenanceMode: false,
    maintenanceMessage: 'The pool is currently under maintenance. Please check back later.',
    estimatedDuration: '2 hours'
  })

  useEffect(() => {
    loadMaintenanceSettings()
  }, [])

  const loadMaintenanceSettings = async () => {
    try {
      setLoading(true)
      
      // Get current maintenance settings from global settings
      const { data: settings } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', ['maintenance_mode', 'maintenance_message', 'maintenance_duration'])

      if (settings) {
        const maintenanceMode = settings.find(s => s.key === 'maintenance_mode')?.value === 'true'
        const maintenanceMessage = settings.find(s => s.key === 'maintenance_message')?.value || 'The pool is currently under maintenance. Please check back later.'
        const estimatedDuration = settings.find(s => s.key === 'maintenance_duration')?.value || '2 hours'

        setMaintenance({
          maintenanceMode,
          maintenanceMessage,
          estimatedDuration
        })
      }
    } catch (error) {
      console.error('Error loading maintenance settings:', error)
      setError('Failed to load maintenance settings')
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
        { key: 'maintenance_mode', value: maintenance.maintenanceMode.toString() },
        { key: 'maintenance_message', value: maintenance.maintenanceMessage },
        { key: 'maintenance_duration', value: maintenance.estimatedDuration }
      ]

      for (const update of updates) {
        const { error } = await supabase
          .from('global_settings')
          .upsert({ key: update.key, value: update.value })

        if (error) {
          throw error
        }
      }

      setSuccess('Maintenance settings updated successfully!')
    } catch (error) {
      console.error('Error saving maintenance settings:', error)
      setError('Failed to save maintenance settings')
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
        title="Maintenance Mode"
        subtitle="Manage system maintenance and downtime"
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
            <h2 className="text-xl font-semibold text-white">Maintenance Configuration</h2>
            <p className="text-blue-100">Control maintenance mode and user access</p>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Maintenance Mode Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Maintenance Mode
                </label>
                <div className="text-sm text-blue-200">
                  Enable to restrict user access during maintenance
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenance.maintenanceMode}
                  onChange={(e) => setMaintenance({...maintenance, maintenanceMode: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            {/* Maintenance Message */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Maintenance Message
              </label>
              <div className="text-sm text-blue-200 mb-3">
                Message displayed to users when maintenance mode is active
              </div>
              <textarea
                value={maintenance.maintenanceMessage}
                onChange={(e) => setMaintenance({...maintenance, maintenanceMessage: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                placeholder="Enter maintenance message..."
              />
            </div>

            {/* Estimated Duration */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Estimated Duration
              </label>
              <div className="text-sm text-blue-200 mb-3">
                Expected duration of maintenance
              </div>
              <input
                type="text"
                value={maintenance.estimatedDuration}
                onChange={(e) => setMaintenance({...maintenance, estimatedDuration: e.target.value})}
                className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                placeholder="e.g., 2 hours, 30 minutes"
              />
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

            {/* Maintenance Status */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Maintenance Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-blue-200">Current Status</div>
                  <div className={`text-2xl font-bold ${maintenance.maintenanceMode ? 'text-red-400' : 'text-green-400'}`}>
                    {maintenance.maintenanceMode ? 'Maintenance Mode' : 'Normal Operation'}
                  </div>
                  <div className="text-xs text-blue-300">
                    {maintenance.maintenanceMode ? 'Users cannot access the pool' : 'All systems operational'}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-blue-200">Last Maintenance</div>
                  <div className="text-2xl font-bold text-white">Never</div>
                  <div className="text-xs text-blue-300">No maintenance recorded</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors">
                  Schedule Maintenance
                </button>
                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  View Maintenance Log
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 