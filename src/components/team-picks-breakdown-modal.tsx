'use client'

import { useMemo, useEffect } from 'react'
import { X } from 'lucide-react'
import { getTeamColors } from '@/lib/team-logos'
import StyledTeamName from '@/components/styled-team-name'

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
  // If aggregatedTeamPicks is provided, the modal will render from it and ignore raw picks
  aggregatedTeamPicks?: Array<{ team: string; pickCount: number }>
  picks?: Pick[]
  currentWeekColumn?: string
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
  aggregatedTeamPicks,
  picks = [],
  currentWeekColumn = 'reg1_team_matchup_id'
}: TeamPicksBreakdownModalProps) {

  const getCurrentWeekColumn = (): string => {
    // Use the passed currentWeekColumn prop
    return currentWeekColumn
  }

  const getCurrentWeekDisplay = (): string => {
    const currentWeekColumn = getCurrentWeekColumn()
    if (currentWeekColumn.startsWith('pre')) {
      const weekNum = currentWeekColumn.replace('pre', '').replace('_team_matchup_id', '')
      return `Preseason Week ${weekNum}`
    } else if (currentWeekColumn.startsWith('reg')) {
      const weekNum = currentWeekColumn.replace('reg', '').replace('_team_matchup_id', '')
      return `Week ${weekNum}`
    } else if (currentWeekColumn.startsWith('post')) {
      const weekNum = currentWeekColumn.replace('post', '').replace('_team_matchup_id', '')
      return `Postseason Week ${weekNum}`
    }
    return 'Current Week'
  }

  const getTeamFromMatchupId = (matchupId: string | null | undefined): string => {
    if (!matchupId) return 'No team selected'
    const parts = matchupId.split('_')
    if (parts.length >= 2) {
      return parts.slice(1).join('_')
    }
    return 'Unknown team'
  }

  // Debug open state and inputs (log only when counts/column change)
  // Avoid logging on every render caused by parent re-renders (e.g., countdown)
  useEffect(() => {
    if (!isOpen) return
    console.log('🟢 [Modal] TeamPicksBreakdownModal open. Inputs:', {
      aggregatedCount: aggregatedTeamPicks?.length || 0,
      picksLength: picks?.length || 0,
      currentWeekColumn
    })
  }, [isOpen, aggregatedTeamPicks?.length, picks?.length, currentWeekColumn])

  const teamBreakdown = useMemo(() => {
    if (!isOpen) return []

    // Prefer aggregated data if provided
    if (aggregatedTeamPicks && aggregatedTeamPicks.length > 0) {
      const rows = aggregatedTeamPicks
        .filter(t => t.team && t.team !== 'No team selected')
        .map(({ team, pickCount }) => ({
          team,
          totalPicks: pickCount,
          activePicks: 0,
          eliminatedPicks: 0,
          uniqueUsers: 0
        }))
        .sort((a, b) => b.totalPicks - a.totalPicks)

      // Single log when aggregated data (count change triggers this effect above)
      return rows
    }

    const currentWeekColumn = getCurrentWeekColumn()
    const breakdown: { [team: string]: TeamBreakdown } = {}

    picks.forEach(pick => {
      const team = getTeamFromMatchupId((pick as unknown as Record<string, unknown>)[currentWeekColumn] as string | null | undefined)

      if (!breakdown[team]) {
        breakdown[team] = {
          team,
          totalPicks: 0,
          activePicks: 0,
          eliminatedPicks: 0,
          uniqueUsers: 0
        }
      }

      const pickCount = pick.picks_count || 0
      breakdown[team].totalPicks += pickCount

      if (pick.status === 'active') {
        breakdown[team].activePicks += pickCount
      } else if (pick.status === 'eliminated') {
        breakdown[team].eliminatedPicks += pickCount
      }
    })

    // Calculate unique users per team
    const teamUsers: { [team: string]: Set<string> } = {}
    picks.forEach(pick => {
      const team = getTeamFromMatchupId((pick as unknown as Record<string, unknown>)[currentWeekColumn] as string | null | undefined)
      if (!teamUsers[team]) {
        teamUsers[team] = new Set()
      }
      teamUsers[team].add(pick.user_id)
    })

    // Set unique user counts
    Object.keys(breakdown).forEach(team => {
      breakdown[team].uniqueUsers = teamUsers[team]?.size || 0
    })

    const rows = Object.values(breakdown)
      .filter(team => team.team !== 'No team selected')
      .sort((a, b) => b.totalPicks - a.totalPicks)

    // Single log would be emitted by the open-state effect above
    return rows
  }, [aggregatedTeamPicks, picks, isOpen, currentWeekColumn])

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
          <div>
            <h2 className="text-xl font-semibold text-white">Teams Picked to Lose</h2>
            <p className="text-sm text-blue-200 mt-1">{getCurrentWeekDisplay()}</p>
          </div>
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

            {/* Team Breakdown Cards */}
            <div className="space-y-3">
              {teamBreakdown.length === 0 && (
                <div className="text-blue-200 text-center">No data available yet. Please wait a moment and try again.</div>
              )}
              {teamBreakdown.map((team, index) => (
                <div key={team.team} className="relative rounded-lg border border-gray-300 overflow-hidden">
                  <div 
                    className="p-4 flex items-center justify-between"
                    style={{
                      background: `linear-gradient(to bottom,
                        rgba(255,255,255,0.18) 0%,
                        ${getTeamColors(team.team).primary} 12%,
                        ${getTeamColors(team.team).primary} 60%,
                        rgba(0,0,0,0.28) 100%)`
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full">
                        <span 
                          className="text-sm font-bold text-white"
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                        >
                          #{index + 1}
                        </span>
                      </div>
                      <StyledTeamName 
                        teamName={team.team} 
                        size="lg" 
                        className="font-bold"
                        showTeamColors={false}
                      />
                    </div>
                    <div className="text-right">
                      <div 
                        className="text-2xl font-bold text-white"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                      >
                        {getDisplayPicks(team)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

