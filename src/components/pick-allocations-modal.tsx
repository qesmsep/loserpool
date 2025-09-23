'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Matchup {
  id: string
  away_team: string
  home_team: string
  away_score: number | null
  home_score: number | null
  status: 'scheduled' | 'live' | 'final' | string
}

interface PickRow {
  id: string
  user_id: string
  pick_name?: string | null
  status?: string
  [key: string]: unknown
}

interface PickAllocationsModalProps {
  isOpen: boolean
  onClose: () => void
  picks: PickRow[]
  currentWeek: number
  seasonFilter: string
}

export default function PickAllocationsModal({ isOpen, onClose, picks, currentWeek, seasonFilter }: PickAllocationsModalProps) {
  const [matchupsById, setMatchupsById] = useState<Record<string, Matchup>>({})
  const [loading, setLoading] = useState(false)

  const weekKeys = useMemo(() => {
    const keys: string[] = []
    for (let w = 1; w <= 18; w++) {
      keys.push(`reg${w}_team_matchup_id`)
    }
    for (let p = 1; p <= 4; p++) {
      keys.push(`post${p}_team_matchup_id`)
    }
    return keys
  }, [])

  const visibleKeys = useMemo(() => {
    const isPostPhase = !!seasonFilter && seasonFilter.startsWith('POST')
    if (!seasonFilter || seasonFilter.startsWith('PRE')) {
      // Preseason or unknown: hide all (no REG columns shown yet)
      return [] as string[]
    }
    if (seasonFilter.startsWith('REG')) {
      const keys: string[] = []
      for (let w = 1; w <= Math.max(1, Math.min(18, currentWeek || 1)); w++) {
        keys.push(`reg${w}_team_matchup_id`)
      }
      return keys
    }
    if (isPostPhase) {
      const keys: string[] = []
      for (let w = 1; w <= 18; w++) {
        keys.push(`reg${w}_team_matchup_id`)
      }
      for (let p = 1; p <= Math.max(1, Math.min(4, currentWeek || 1)); p++) {
        keys.push(`post${p}_team_matchup_id`)
      }
      return keys
    }
    return [] as string[]
  }, [seasonFilter, currentWeek])

  const parseKey = (key: string): { phase: 'REG' | 'POST' | 'UNKNOWN'; num: number } => {
    if (key.startsWith('reg')) {
      const m = key.match(/^reg(\d+)_team_matchup_id$/)
      return { phase: 'REG', num: m ? parseInt(m[1], 10) : 0 }
    }
    if (key.startsWith('post')) {
      const m = key.match(/^post(\d+)_team_matchup_id$/)
      return { phase: 'POST', num: m ? parseInt(m[1], 10) : 0 }
    }
    return { phase: 'UNKNOWN', num: 0 }
  }

  const getHeaderLabel = (key: string, index: number): string => {
    const { phase, num } = parseKey(key)
    if (phase === 'REG') return `W${num}`
    if (phase === 'POST') {
      switch (num) {
        case 1: return 'WC'
        case 2: return 'DIV'
        case 3: return 'CONF'
        case 4: return 'SB'
        default: return `P${num}`
      }
    }
    return `C${index + 1}`
  }

  const getMatchupId = (value: unknown): string | null => {
    if (!value || typeof value !== 'string') return null
    const parts = value.split('_')
    return parts.length > 0 ? parts[0] : null
  }

  const getTeamFromValue = (value: unknown): string | null => {
    if (!value || typeof value !== 'string') return null
    const parts = value.split('_')
    if (parts.length >= 2) return parts.slice(1).join('_')
    return null
  }

  useEffect(() => {
    if (!isOpen) return
    const fetchMatchups = async () => {
      try {
        setLoading(true)
        const ids = new Set<string>()
        const isPostPhase = seasonFilter && seasonFilter.startsWith('POST')

        for (const p of picks || []) {
          for (const key of visibleKeys) {
            const { phase, num } = parseKey(key)
            // Fetch rules:
            // - REG phase: fetch REG weeks up to currentWeek; skip POST entirely
            // - POST phase: fetch all REG weeks (for historical colors) and POST weeks up to currentWeek
            if (phase === 'REG') {
              if (!isPostPhase && num > (currentWeek || 1)) continue
              // if isPostPhase, include all REG weeks (1..18)
            } else if (phase === 'POST') {
              if (!isPostPhase) continue
              if (num > (currentWeek || 1)) continue
            } else {
              continue
            }
            const val = (p as Record<string, unknown>)[key]
            const id = getMatchupId(val)
            if (id) ids.add(id)
          }
        }
        const idList = Array.from(ids)
        if (idList.length === 0) {
          setMatchupsById({})
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('matchups')
          .select('id, away_team, home_team, away_score, home_score, status')
          .in('id', idList)

        if (error) {
          console.error('Failed to load matchups for allocations modal:', error)
          setMatchupsById({})
          setLoading(false)
          return
        }

        const map: Record<string, Matchup> = {}
        for (const m of data || []) {
          map[m.id] = m as unknown as Matchup
        }
        setMatchupsById(map)
      } finally {
        setLoading(false)
      }
    }
    fetchMatchups()
  }, [isOpen, picks, visibleKeys, seasonFilter, currentWeek])

  const sortedPicks = useMemo(() => {
    const arr = [...(picks || [])]
    arr.sort((a, b) => {
      const nameA = (a.pick_name || 'TBD').toString().toLowerCase()
      const nameB = (b.pick_name || 'TBD').toString().toLowerCase()
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' })
    })
    return arr
  }, [picks])

  const getCellStatusClass = (key: string, value: unknown): string => {
    const { phase, num } = parseKey(key)
    const isPostPhase = seasonFilter && seasonFilter.startsWith('POST')
    // Future cells
    if (phase === 'REG') {
      if (!isPostPhase && num > currentWeek) return 'text-white/40'
      // In POST phase, all REG weeks are historical
    } else if (phase === 'POST') {
      if (!isPostPhase) return 'text-white/40'
      if (num > currentWeek) return 'text-white/40'
    } else {
      return 'text-white/40'
    }

    // Current week neutral (phase-aware)
    if ((phase === 'REG' && !isPostPhase && num === currentWeek) || (phase === 'POST' && isPostPhase && num === currentWeek)) {
      return 'text-blue-200'
    }

    if (!value || typeof value !== 'string') return 'text-white/40'

    const matchupId = getMatchupId(value)
    const pickedTeam = getTeamFromValue(value)
    if (!matchupId || !pickedTeam) return 'text-white/60'

    const matchup = matchupsById[matchupId]
    if (!matchup) return 'text-white/60'

    if (matchup.status !== 'final') return 'text-white/60'

    const away = matchup.away_team
    const home = matchup.home_team
    const awayScore = matchup.away_score ?? 0
    const homeScore = matchup.home_score ?? 0

    if (awayScore === homeScore) return 'text-red-300' // tie eliminates

    const pickedAway = pickedTeam === away
    const pickedHome = pickedTeam === home
    const winnerIsAway = awayScore > homeScore
    const pickedTeamLost = (pickedAway && !winnerIsAway) || (pickedHome && winnerIsAway)
    return pickedTeamLost ? 'text-green-300' : 'text-red-300'
  }

  const renderCellText = (key: string, value: unknown): string => {
    const { phase, num } = parseKey(key)
    const isPostPhase = seasonFilter && seasonFilter.startsWith('POST')
    if (phase === 'REG') {
      if (!isPostPhase && num > currentWeek) return '—'
      // In POST phase, REG is always historical; show team or dash
    } else if (phase === 'POST') {
      if (!isPostPhase) return '—'
      if (num > currentWeek) return '—'
    } else {
      return '—'
    }
    const team = getTeamFromValue(value)
    return team || '—'
  }

  return !isOpen ? null : (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/20 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div>
            <h2 className="text-xl font-semibold text-white">Allocations by Pick</h2>
            <p className="text-sm text-blue-200 mt-1">Through {seasonFilter}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-x-auto overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="text-blue-200">Loading...</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-gray-900 z-10 text-left px-3 py-2 text-blue-200 font-medium border-b border-white/20">Pick</th>
                  {visibleKeys.map((key, i) => (
                    <th key={key} className="px-3 py-2 text-blue-200 font-medium border-b border-white/20 text-center">{getHeaderLabel(key, i)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPicks.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-blue-200" colSpan={1 + visibleKeys.length}>No picks to display.</td>
                  </tr>
                )}
                {sortedPicks.map((p) => (
                  <tr key={p.id} className="border-b border-white/10">
                    <td className="sticky left-0 bg-gray-900 z-10 px-3 py-2 text-white font-medium whitespace-nowrap">{p.pick_name || 'TBD'}</td>
                    {visibleKeys.map((key) => {
                      const value = (p as Record<string, unknown>)[key]
                      const cls = getCellStatusClass(key, value)
                      return (
                        <td key={key} className="px-3 py-2 text-center align-middle">
                          <span className={cls}>{renderCellText(key, value)}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}


