import { requireAdmin } from '@/lib/auth'
import AdminHeader from '@/components/admin-header'

export default async function AdminResetPage() {
  await requireAdmin()

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
        <div className="bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-500/30">
          <div className="px-6 py-4 border-b border-red-500/30">
            <h2 className="text-xl font-semibold text-red-200">⚠️ Dangerous Operations</h2>
            <p className="text-red-100">These operations will permanently delete data</p>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Reset Picks */}
            <div className="bg-white/5 rounded-lg p-4 border border-red-500/30">
              <h3 className="text-lg font-semibold text-red-200 mb-2">Reset All Picks</h3>
              <p className="text-red-100 mb-4">Delete all user picks and reset to week 1</p>
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                Reset Picks
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