'use client'

import { useState } from 'react'
import { X, Trophy, AlertTriangle, Users, Calendar } from 'lucide-react'

interface Pick {
  id: string
  user_id: string
  pick_name: string
  status: string
  picks_count: number
  created_at: string
  updated_at: string
  reg1_team_matchup_id?: string
  reg2_team_matchup_id?: string
  reg3_team_matchup_id?: string
  reg4_team_matchup_id?: string
  reg5_team_matchup_id?: string
  reg6_team_matchup_id?: string
  reg7_team_matchup_id?: string
  reg8_team_matchup_id?: string
  reg9_team_matchup_id?: string
  reg10_team_matchup_id?: string
  reg11_team_matchup_id?: string
  reg12_team_matchup_id?: string
  reg13_team_matchup_id?: string
  reg14_team_matchup_id?: string
  reg15_team_matchup_id?: string
  reg16_team_matchup_id?: string
  reg17_team_matchup_id?: string
  reg18_team_matchup_id?: string
  pre1_team_matchup_id?: string
  pre2_team_matchup_id?: string
  pre3_team_matchup_id?: string
  post1_team_matchup_id?: string
  post2_team_matchup_id?: string
  post3_team_matchup_id?: string
  post4_team_matchup_id?: string
}

interface User {
  id: string
  email: string
  username: string | null
  first_name: string | null
  last_name: string | null
}

interface AdminStatsModalProps {
  isOpen: boolean
  onClose: () => void
  activePicks: Pick[]
  eliminatedPicks: Pick[]
  users: User[]
  totalPicksPurchased: number
  totalRevenue: number
}

export default function AdminStatsModal({
  isOpen,
  onClose,
  activePicks,
  eliminatedPicks,
  users,
  totalPicksPurchased,
  totalRevenue
}: AdminStatsModalProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'eliminated' | 'summary'>('summary')

  if (!isOpen) return null

  const getTeamFromMatchupId = (matchupId: string | null | undefined): string => {
    if (!matchupId) return 'No team selected'
    const parts = matchupId.split('_')
    if (parts.length >= 2) {
      return parts.slice(1).join('_')
    }
    return 'Unknown team'
  }

  const getUserName = (userId: string): string => {
    const user = users.find(u => u.id === userId)
    if (!user) return 'Unknown User'
    return user.username || user.first_name || user.email
  }

  const getCurrentWeekColumn = (): string => {
    // This should match the logic from the API
    return 'reg1_team_matchup_id' // For week 1
  }

  const currentWeekColumn = getCurrentWeekColumn()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/20 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <h2 className="text-xl font-semibold text-white">Pool Statistics Details</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/20">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'summary'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'active'
                ? 'text-white border-b-2 border-green-500'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Active Picks ({activePicks.length})
          </button>
          <button
            onClick={() => setActiveTab('eliminated')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'eliminated'
                ? 'text-white border-b-2 border-red-500'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Eliminated Picks ({eliminatedPicks.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Users className="w-5 h-5 text-blue-200 mr-2" />
                    <h3 className="text-lg font-semibold text-white">Users</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">{users.length}</p>
                  <p className="text-sm text-blue-200">Total registered users</p>
                </div>

                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Calendar className="w-5 h-5 text-purple-200 mr-2" />
                    <h3 className="text-lg font-semibold text-white">Revenue</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">${(totalRevenue / 100).toFixed(2)}</p>
                  <p className="text-sm text-purple-200">Total pool revenue</p>
                </div>

                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Trophy className="w-5 h-5 text-green-200 mr-2" />
                    <h3 className="text-lg font-semibold text-white">Active Picks</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">{activePicks.length}</p>
                  <p className="text-sm text-green-200">Picks still in play</p>
                </div>

                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-200 mr-2" />
                    <h3 className="text-lg font-semibold text-white">Eliminated Picks</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">{eliminatedPicks.length}</p>
                  <p className="text-sm text-red-200">Picks that lost</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Data Sources</h3>
                                 <div className="space-y-2 text-sm text-blue-200">
                   <p>• Active picks: Filtered from picks table where status = 'active'</p>
                   <p>• Eliminated picks: Filtered from picks table where status = 'eliminated'</p>
                   <p>• Total users: Count from users table</p>
                   <p>• Revenue: Sum of amount_paid from purchases where status = 'completed'</p>
                   <p>• Picks purchased: Sum of picks_count from purchases where status = 'completed'</p>
                   <p>• Current week column: {currentWeekColumn}</p>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'active' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Active Picks Details</h3>
              {activePicks.length === 0 ? (
                <p className="text-blue-200 text-center py-8">No active picks found</p>
              ) : (
                <div className="space-y-3">
                  {activePicks.map((pick) => (
                    <div key={pick.id} className="bg-white/5 border border-white/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">{pick.pick_name}</h4>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-200">
                          {pick.picks_count} pick{pick.picks_count > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-blue-200">User: {getUserName(pick.user_id)}</p>
                          <p className="text-blue-200">Team: {getTeamFromMatchupId((pick as any)[currentWeekColumn])}</p>
                        </div>
                        <div>
                          <p className="text-blue-200">Created: {new Date(pick.created_at).toLocaleDateString()}</p>
                          <p className="text-blue-200">Updated: {new Date(pick.updated_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'eliminated' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Eliminated Picks Details</h3>
              {eliminatedPicks.length === 0 ? (
                <p className="text-blue-200 text-center py-8">No eliminated picks found</p>
              ) : (
                <div className="space-y-3">
                  {eliminatedPicks.map((pick) => (
                    <div key={pick.id} className="bg-white/5 border border-white/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">{pick.pick_name}</h4>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-200">
                          {pick.picks_count} pick{pick.picks_count > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-blue-200">User: {getUserName(pick.user_id)}</p>
                          <p className="text-blue-200">Team: {getTeamFromMatchupId((pick as any)[currentWeekColumn])}</p>
                        </div>
                        <div>
                          <p className="text-blue-200">Created: {new Date(pick.created_at).toLocaleDateString()}</p>
                          <p className="text-blue-200">Updated: {new Date(pick.updated_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
