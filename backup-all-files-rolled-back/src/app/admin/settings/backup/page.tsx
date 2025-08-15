import { requireAdmin } from '@/lib/auth'
import AdminHeader from '@/components/admin-header'

export default async function AdminBackupPage() {
  await requireAdmin()

  return (
    <div className="min-h-screen app-bg">
      <AdminHeader 
        title="Backup & Export"
        subtitle="Manage data backup and export functionality"
        showBackButton={true}
        backHref="/admin/settings"
        backText="Back to Settings"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Data Backup</h2>
            <p className="text-blue-100">Export and backup pool data</p>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Manual Backup */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Manual Backup</h3>
              <p className="text-blue-200 mb-4">Create a manual backup of all pool data</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Create Backup
              </button>
            </div>

            {/* Export Data */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Export Data</h3>
              <p className="text-blue-200 mb-4">Export specific data types for analysis</p>
              <div className="space-y-2">
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors mr-2">
                  Export Users
                </button>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors mr-2">
                  Export Picks
                </button>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  Export Results
                </button>
              </div>
            </div>

            {/* Backup Schedule */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Backup Schedule</h3>
              <p className="text-blue-200 mb-4">Configure automatic backup settings</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white">Daily Backup</span>
                  <span className="text-green-400">Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Weekly Backup</span>
                  <span className="text-green-400">Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Monthly Backup</span>
                  <span className="text-green-400">Enabled</span>
                </div>
              </div>
            </div>

            {/* Recent Backups */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Recent Backups</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-200">Today 2:30 AM</span>
                  <span className="text-green-400">Success</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-200">Yesterday 2:30 AM</span>
                  <span className="text-green-400">Success</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-200">2 days ago 2:30 AM</span>
                  <span className="text-green-400">Success</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 