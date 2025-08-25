'use client'

import { useMemo } from 'react'
import { X, TrendingDown, Users } from 'lucide-react'
import { getTeamColors } from '@/lib/team-logos'

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

interface TeamPicksBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  picks: Pick[]
}

interface TeamBreakdown {
  team: string
  totalPicks: number
  activePicks: number
  eliminatedPicks: number
  uniqueUsers: number
}

export default function TeamPicksBreakdownModal({
  isOpen,
  onClose,
  picks
}: TeamPicksBreakdownModalProps) {

  const getCurrentWeekColumn = (): string => {
    // This should match the logic from the API
    return 'reg1_team_matchup_id' // For week 1
  }

  const getTeamFromMatchupId = (matchupId: string | null | undefined): string => {
    if (!matchupId) return 'No team selected'
    const parts = matchupId.split('_')
    if (parts.length >= 2) {
      return parts.slice(1).join('_')
    }
    return 'Unknown team'
  }

  const teamBreakdown = useMemo(() => {
    if (!isOpen) return []
    
    const currentWeekColumn = getCurrentWeekColumn()
    const breakdown: { [team: string]: TeamBreakdown } = {}

    picks.forEach(pick => {
      const team = getTeamFromMatchupId((pick as Record<string, unknown>)[currentWeekColumn])
      
      if (!breakdown[team]) {
        breakdown[team] = {
          team,
          totalPicks: 0,
          activePicks: 0,
          eliminatedPicks: 0,
          uniqueUsers: new Set()
        }
      }

      breakdown[team].totalPicks += pick.picks_count
      breakdown[team].uniqueUsers.add(pick.user_id)

      if (pick.status === 'active') {
        breakdown[team].activePicks += pick.picks_count
      } else if (pick.status === 'eliminated') {
        breakdown[team].eliminatedPicks += pick.picks_count
      }
    })

    // Convert uniqueUsers Set to count
    Object.values(breakdown).forEach(team => {
      team.uniqueUsers = (team.uniqueUsers as Set<string>).size
    })

    return Object.values(breakdown)
      .sort((a, b) => b.totalPicks - a.totalPicks)
  }, [picks, isOpen])

  if (!isOpen) return null

  const getDisplayPicks = (team: TeamBreakdown) => {
    return team.totalPicks
  }

  const getStatusColor = () => {
    return 'text-white'
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/20 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <h2 className="text-xl font-semibold text-white">Teams Picked to Lose</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>



        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <TrendingDown className="w-5 h-5 text-blue-200 mr-2" />
                  <h3 className="text-lg font-semibold text-white">Total Teams</h3>
                </div>
                <p className="text-3xl font-bold text-white">{teamBreakdown.length}</p>
                <p className="text-sm text-blue-200">Teams picked to lose</p>
              </div>

              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Users className="w-5 h-5 text-green-200 mr-2" />
                  <h3 className="text-lg font-semibold text-white">Total Picks</h3>
                </div>
                <p className="text-3xl font-bold text-white">
                  {teamBreakdown.reduce((sum, team) => sum + getDisplayPicks(team), 0)}
                </p>
                <p className="text-sm text-green-200">All picks</p>
              </div>

              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Users className="w-5 h-5 text-purple-200 mr-2" />
                  <h3 className="text-lg font-semibold text-white">Unique Users</h3>
                </div>
                <p className="text-3xl font-bold text-white">
                  {new Set(picks.map(pick => pick.user_id)).size}
                </p>
                <p className="text-sm text-purple-200">Users who made picks</p>
              </div>
            </div>

            {/* Team Breakdown Table */}
            <div className="bg-white/5 border border-white/20 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-white/20">
                <h3 className="text-lg font-semibold text-white">Team Breakdown</h3>
                                 <p className="text-sm text-blue-200">
                   Sorted by total picks (most to least)
                 </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                        Team
                      </th>
                                             <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                         Total Picks
                       </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                        Unique Users
                      </th>
                      
                    </tr>
                  </thead>
                  <tbody className="bg-white/5 divide-y divide-white/20">
                    {teamBreakdown.map((team, index) => (
                      <tr key={team.team} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-white">#{index + 1}</span>
                        </td>
                                                 <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex items-center">
                             <div 
                               className="w-4 h-4 rounded-full mr-3"
                               style={{ backgroundColor: getTeamColors(team.team).primary }}
                             ></div>
                             <span className="text-sm font-semibold text-white">{team.team}</span>
                           </div>
                         </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-lg font-bold ${getStatusColor()}`}>
                            {getDisplayPicks(team)}
                          </span>
                        </td>
                                                 <td className="px-6 py-4 whitespace-nowrap">
                           <span className="text-sm text-white">{team.uniqueUsers}</span>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Data Source Info */}
            <div className="bg-white/5 border border-white/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Data Source</h3>
              <div className="space-y-2 text-sm text-blue-200">
                <p>• Teams extracted from {getCurrentWeekColumn()} column in picks table</p>
                <p>• Team names parsed from matchup_id format: &quot;matchup_id_team_name&quot;</p>
                <p>• Pick counts include picks_count field from each pick record</p>
                <p>• Unique users counted per team (one user can have multiple picks for same team)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
