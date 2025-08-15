'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminHeader from '@/components/admin-header'

interface LimitsData {
  maxTotalEntries: number
  entriesPerUser: number
  pickPrice: number
  lockTime: string
}

export default function AdminLimitsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  const [limits, setLimits] = useState<LimitsData>({
    maxTotalEntries: 2100,
    entriesPerUser: 10,
    pickPrice: 21,
    lockTime: 'Thursday Night'
  })

  useEffect(() => {
    loadLimits()
  }, [])

  const loadLimits = async () => {
    try {
      setLoading(true)
      
      // Get current limits from global settings
      const { data: settings } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', ['max_total_entries', 'entries_per_user', 'pick_price', 'lock_time'])

      if (settings) {
        const maxTotalEntries = settings.find(s => s.key === 'max_total_entries')?.value || '2100'
        const entriesPerUser = settings.find(s => s.key === 'entries_per_user')?.value || '10'
        const pickPrice = settings.find(s => s.key === 'pick_price')?.value || '21'
        const lockTime = settings.find(s => s.key === 'lock_time')?.value || 'Thursday Night'

        setLimits({
          maxTotalEntries: parseInt(maxTotalEntries),
          entriesPerUser: parseInt(entriesPerUser),
          pickPrice: parseInt(pickPrice),
          lockTime: lockTime
        })
      }
    } catch (error) {
      console.error('Error loading limits:', error)
      setError('Failed to load current limits')
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
        { key: 'max_total_entries', value: limits.maxTotalEntries.toString() },
        { key: 'entries_per_user', value: limits.entriesPerUser.toString() },
        { key: 'pick_price', value: limits.pickPrice.toString() },
        { key: 'lock_time', value: limits.lockTime }
      ]

      for (const update of updates) {
        const { error } = await supabase
          .from('global_settings')
          .upsert({ key: update.key, value: update.value })

        if (error) {
          throw error
        }
      }

      setSuccess('Limits updated successfully!')
    } catch (error) {
      console.error('Error saving limits:', error)
      setError('Failed to save limits')
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
        title="Edit Limits"
        subtitle="Configure entry limits and pool settings"
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
            <h2 className="text-xl font-semibold text-white">Entry Limits</h2>
            <p className="text-blue-100">Configure maximum entries and user limits</p>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Max Total Entries */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Maximum Total Entries
              </label>
              <div className="text-sm text-blue-200 mb-3">
                Total number of picks that can be purchased across all users
              </div>
              <input
                type="number"
                value={limits.maxTotalEntries}
                onChange={(e) => setLimits({...limits, maxTotalEntries: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                min="1"
              />
            </div>

            {/* Entries Per User */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Maximum Entries Per User
              </label>
              <div className="text-sm text-blue-200 mb-3">
                Maximum number of picks any single user can purchase
              </div>
              <input
                type="number"
                value={limits.entriesPerUser}
                onChange={(e) => setLimits({...limits, entriesPerUser: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                min="1"
              />
            </div>

            {/* Pick Price */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Pick Price (USD)
              </label>
              <div className="text-sm text-blue-200 mb-3">
                Cost per pick in dollars
              </div>
              <input
                type="number"
                value={limits.pickPrice}
                onChange={(e) => setLimits({...limits, pickPrice: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                min="1"
                step="0.01"
              />
            </div>

            {/* Lock Time */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                First Game of the Week
              </label>
              <div className="text-sm text-blue-200 mb-3">
                When picks lock each week
              </div>
              <select
                value={limits.lockTime}
                onChange={(e) => setLimits({...limits, lockTime: e.target.value})}
                className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
              >
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
                <option value="Monday">Monday</option>
              </select>
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

            {/* Current Stats */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Current Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-blue-200">Total Entries Used</div>
                  <div className="text-2xl font-bold text-white">0</div>
                  <div className="text-xs text-blue-300">of {limits.maxTotalEntries}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-blue-200">Entries Remaining</div>
                  <div className="text-2xl font-bold text-white">{limits.maxTotalEntries}</div>
                  <div className="text-xs text-blue-300">available</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 