'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminHeader from '@/components/admin-header'
import { RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react'

export default function AdminResetPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const handleResetPicks = async () => {
    if (!confirm('Are you sure you want to reset all picks? This will bring all eliminated picks back to life.')) {
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/reset-picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message
        })
        // Refresh the page after a short delay to show updated stats
        setTimeout(() => {
          router.refresh()
        }, 2000)
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to reset picks'
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen app-bg">
      <AdminHeader 
        title="Reset Pool"
        subtitle="Dangerous operations - reset pool data"
        showBackButton={true}
        backHref="/admin/settings"
        backText="Back to Settings"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-500/20 border-green-500/30 text-green-200' 
              : 'bg-red-500/20 border-red-500/30 text-red-200'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertTriangle className="w-5 h-5 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        <div className="bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-500/30">
          <div className="px-6 py-4 border-b border-red-500/30">
            <h2 className="text-xl font-semibold text-red-200">⚠️ Dangerous Operations</h2>
            <p className="text-red-100">These operations will permanently delete data</p>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Reset Picks */}
            <div className="bg-white/5 rounded-lg p-4 border border-red-500/30">
              <h3 className="text-lg font-semibold text-red-200 mb-2">Reset All Picks</h3>
              <p className="text-red-100 mb-4">Bring all eliminated picks back to life by setting them to &apos;active&apos; status</p>
              <button 
                onClick={handleResetPicks}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Picks'
                )}
              </button>
            </div>

            {/* Reset Results */}
            <div className="bg-white/5 rounded-lg p-4 border border-red-500/30">
              <h3 className="text-lg font-semibold text-red-200 mb-2">Reset Results</h3>
              <p className="text-red-100 mb-4">Clear all game results and weekly outcomes</p>
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                Reset Results
              </button>
            </div>

            {/* Reset Users */}
            <div className="bg-white/5 rounded-lg p-4 border border-red-500/30">
              <h3 className="text-lg font-semibold text-red-200 mb-2">Reset Users</h3>
              <p className="text-red-100 mb-4">Remove all users except admins</p>
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                Reset Users
              </button>
            </div>

            {/* Full Reset */}
            <div className="bg-red-600/20 rounded-lg p-4 border border-red-500">
              <h3 className="text-lg font-semibold text-red-200 mb-2">🚨 Full Pool Reset</h3>
              <p className="text-red-100 mb-4">Delete ALL data and start completely fresh</p>
              <div className="bg-red-700/50 p-3 rounded mb-4">
                <p className="text-red-100 text-sm">
                  <strong>Warning:</strong> This will delete all users, picks, results, purchases, and settings. 
                  This action cannot be undone.
                </p>
              </div>
              <button className="bg-red-700 text-white px-6 py-3 rounded-lg hover:bg-red-800 transition-colors font-semibold">
                🚨 FULL RESET
              </button>
            </div>

            {/* Backup Warning */}
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-200 mb-2">Backup First</h3>
              <p className="text-yellow-100">
                Before performing any reset operations, make sure to create a backup of your data. 
                You can do this in the <a href="/admin/settings/backup" className="text-yellow-300 underline">Backup & Export</a> section.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 