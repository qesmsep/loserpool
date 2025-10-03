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
  aggregatedTeamPicks?: Array<{ 
    team: string; 
    pickCount: number;
    teamData?: { name: string; abbreviation: string; primary_color: string; secondary_color: string };
    gameResult?: 'won' | 'lost' | 'tie' | 'pending';
  }>
  picks?: Pick[]
  currentWeekColumn?: string
}

interface TeamBreakdown {
  team: string
  totalPicks: number
  activePicks: number
  eliminatedPicks: number
  uniqueUsers: number
  teamData?: { name: string; abbreviation: string; primary_color: string; secondary_color: string }
  gameResult?: 'won' | 'lost' | 'tie' | 'pending'
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
        .map(({ team, pickCount, teamData, gameResult }) => ({
          team,
          totalPicks: pickCount,
          activePicks: 0,
          eliminatedPicks: 0,
          uniqueUsers: 0,
          teamData,
          gameResult
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

  const getPickCountColor = (team: TeamBreakdown) => {
    // Determine pick count color based on game result
    let pickCountBgColor = '#6B7280' // Default gray for pending
    let pickCountTextColor = 'white'
    
    if (team.gameResult === 'won') {
      // Team won - picks are incorrect (RED)
      pickCountBgColor = '#DC2626' // red-600
      pickCountTextColor = 'white'
    } else if (team.gameResult === 'lost') {
      // Team lost - picks are correct (GREEN)
      pickCountBgColor = '#16A34A' // green-600
      pickCountTextColor = 'white'
    } else if (team.gameResult === 'tie') {
      // Tie - picks are incorrect (RED)
      pickCountBgColor = '#DC2626' // red-600
      pickCountTextColor = 'white'
    }
    
    return { backgroundColor: pickCountBgColor, color: pickCountTextColor }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-gray-900 border border-white/20 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div>
            <h2 className="text-lg font-semibold text-white">Teams Picked to Lose</h2>
            <p className="text-xs text-blue-200">{getCurrentWeekDisplay()}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[65vh]">
          <div className="space-y-2">

            {/* Team Breakdown Cards */}
            <div className="space-y-2">
              {teamBreakdown.length === 0 && (
                <div className="text-blue-200 text-center text-sm">No data available yet. Please wait a moment and try again.</div>
              )}
              {teamBreakdown.map((team, index) => {
                // Use teamData colors if available, otherwise fallback to getTeamColors
                let teamColors
                if (team.teamData && team.teamData.primary_color && team.teamData.secondary_color) {
                  teamColors = { 
                    primary: team.teamData.primary_color, 
                    secondary: team.teamData.secondary_color 
                  }
                } else {
                  // Try multiple fallback strategies
                  const fallbackName = team.teamData?.name || team.team
                  teamColors = getTeamColors(fallbackName)
                  
                  // If still default colors, try without underscores
                  if (teamColors.primary === '#6B7280') {
                    const cleanName = fallbackName.replace(/_/g, ' ')
                    teamColors = getTeamColors(cleanName)
                  }
                }
                
                const displayName = team.teamData?.name || team.team.replace(/_/g, ' ')
                const pickCountColors = getPickCountColor(team)
                
                return (
                  <div key={team.team} className="relative rounded-lg overflow-hidden">
                    <div 
                      className="p-3 flex items-center justify-between relative"
                      style={{
                        background: `linear-gradient(to bottom,
                          rgba(255,255,255,0.12) 0%,
                          ${teamColors.primary} 15%,
                          ${teamColors.primary} 70%,
                          rgba(0,0,0,0.15) 100%)`,
                        borderRadius: '8px',
                        color: 'white',
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: '0.02em',
                        textTransform: 'none',
                        textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                      }}
                    >
                      {/* Diagonal stripes pattern */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M0 0L40 40M40 0L0 40' stroke='%23ffffff' stroke-opacity='0.05' stroke-width='1'/%3e%3c/svg%3e")`,
                          opacity: 0.05,
                          zIndex: 10
                        }}
                      />

                      {/* Top subtle accent */}
                      <div
                        aria-hidden="true"
                        className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none"
                        style={{
                          background: `linear-gradient(to bottom, ${teamColors.secondary}40 0%, transparent 100%)`,
                          zIndex: 18
                        }}
                      />

                      {/* Wrapped border accent */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `
                            linear-gradient(to left, ${teamColors.secondary} 0%, ${teamColors.secondary}40 30%, transparent 60%) 0 0 / 100% 3px no-repeat,
                            linear-gradient(to bottom, ${teamColors.secondary} 0%, ${teamColors.secondary}40 50%, transparent 80%) 100% 0 / 3px 100% no-repeat,
                            linear-gradient(to right, ${teamColors.secondary} 0%, ${teamColors.secondary}40 30%, transparent 60%) 0 100% / 100% 3px no-repeat,
                            linear-gradient(to top, ${teamColors.secondary} 0%, ${teamColors.secondary}40 50%, transparent 80%) 0 0 / 3px 100% no-repeat
                          `,
                          zIndex: 19
                        }}
                      />

                      {/* Subtle sheen */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 30%, transparent 60%)`,
                          zIndex: 20
                        }}
                      />

                      {/* Bottom edge shadow */}
                      <div
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 right-0 h-[26px] pointer-events-none"
                        style={{
                          background: 'linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0))',
                          zIndex: 18
                        }}
                      />

                      {/* Diagonal light sweep */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `linear-gradient(20deg, ${teamColors.secondary}40 0%, ${teamColors.secondary}20 30%, ${teamColors.secondary}05 60%, ${teamColors.secondary}00 80%)`,
                          mixBlendMode: 'screen',
                          zIndex: 19
                        }}
                      />

                      {/* Watermark effect */}
                      <div
                        aria-hidden="true"
                        className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] pointer-events-none"
                        style={{
                          background: `radial-gradient(circle, ${teamColors.secondary}20 0%, transparent 70%)`,
                          opacity: 0.05,
                          mixBlendMode: 'overlay',
                          zIndex: 15,
                          backgroundPosition: 'center 60%',
                          backgroundSize: '120% 120%'
                        }}
                      />

                      <div className="flex items-center justify-between w-full relative" style={{ zIndex: 50 }}>
                        <div className="flex items-center">
                          <span 
                            className="text-base font-bold text-white"
                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                          >
                            {displayName}
                          </span>
                        </div>
                        <div className="text-right">
                          <span 
                            className="text-lg font-bold px-3 py-2 rounded-lg"
                            style={{ 
                              backgroundColor: pickCountColors.backgroundColor,
                              color: pickCountColors.color
                            }}
                          >
                            {getDisplayPicks(team)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

