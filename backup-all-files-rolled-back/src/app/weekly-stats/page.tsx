'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Header from '@/components/header'

import StyledTeamName from '@/components/styled-team-name'
import { formatGameTime } from '@/lib/timezone'

interface TeamStats {
  team_name: string
  total_picks: number
  matchup_id: string
  game_time: string
  away_team: string
  home_team: string
}

export default function WeeklyStatsPage() {
  const [stats, setStats] = useState<TeamStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentWeek, setCurrentWeek] = useState<number>(0)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current week
      const { data: settingsData, error: settingsError } = await supabase
        .from('global_settings')
        .select('current_week')
        .single()

      if (settingsError) throw settingsError
      setCurrentWeek(settingsData.current_week)

      console.log('Current week:', settingsData.current_week)

      // Get all picks for current week with matchup info
      const { data: picksData, error: picksError } = await supabase
        .from('picks')
        .select(`
          team_picked,
          picks_count,
          matchups!inner(
            id,
            game_time,
            away_team,
            home_team
          )
        `)
        .eq('week', settingsData.current_week)
        .eq('status', 'active')

      if (picksError) throw picksError
      
      console.log('Picks data:', picksData)

      // Aggregate picks by team
      const teamStatsMap = new Map<string, TeamStats>()

      if (picksData && picksData.length > 0) {
        picksData.forEach((pick: {
          team_picked: string
          picks_count: number
          matchups: {
            id: string
            game_time: string
            away_team: string
            home_team: string
          }[]
        }) => {
          const teamName = pick.team_picked
          const existing = teamStatsMap.get(teamName)
          const matchup = pick.matchups[0] // Get the first matchup since we're using inner join
          
          if (existing) {
            existing.total_picks += pick.picks_count
          } else {
            teamStatsMap.set(teamName, {
              team_name: teamName,
              total_picks: pick.picks_count,
              matchup_id: matchup.id,
              game_time: matchup.game_time,
              away_team: matchup.away_team,
              home_team: matchup.home_team
            })
          }
        })
      } else {
        console.log('No picks data found for current week')
      }

      // Convert to array and sort by total picks (descending)
      const statsArray = Array.from(teamStatsMap.values())
        .sort((a, b) => b.total_picks - a.total_picks)

      setStats(statsArray)
    } catch (error) {
      console.error('Error loading stats:', error)
      
      // More detailed error handling
      let errorMessage = 'Failed to load stats'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase error objects
        const supabaseError = error as { message?: string; error?: string; details?: string }
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        } else if (supabaseError.error) {
          errorMessage = supabaseError.error
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details
        } else {
          errorMessage = JSON.stringify(error)
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="app-bg">
        <Header 
          title="Weekly Stats"
          subtitle="This Week&apos;s Pick Distribution"
          showBackButton={true}
          backHref="/dashboard"
          backText="Back to Dashboard"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white mt-4">Loading weekly stats...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-bg">
              <Header 
          title="Weekly Stats"
          subtitle="This Week&apos;s Pick Distribution"
          showBackButton={true}
          backHref="/dashboard"
          backText="Back to Dashboard"
        />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            This Week&apos;s Stats
          </h1>
          <p className="text-blue-100">
            {currentWeek === 0 ? 'Week Zero' : `Week ${currentWeek}`} - Total picks by team
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {stats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {stats.map((teamStat, index) => (
              <div
                key={teamStat.team_name}
                className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 sm:p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-yellow-200 font-bold text-sm">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold text-white">
                        {teamStat.team_name}
                      </h3>
                      <p className="text-sm text-blue-200">
                        {formatGameTime(teamStat.game_time)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full p-3 sm:p-4 rounded-lg text-white font-bold shadow-lg mb-3 bg-white/10 border border-white/20">
                  <div className="text-center">
                    <StyledTeamName teamName={teamStat.team_name} size="lg" className="mb-2" />
                    <div className="text-2xl sm:text-3xl font-bold text-white">
                      {teamStat.total_picks}
                    </div>
                    <div className="text-sm sm:text-base opacity-90">
                      {teamStat.total_picks === 1 ? 'pick' : 'picks'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm">
                  <StyledTeamName teamName={teamStat.away_team} size="sm" />
                  <span className="text-blue-200">@</span>
                  <StyledTeamName teamName={teamStat.home_team} size="sm" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-blue-200 text-lg">No picks have been made yet this week</p>
          </div>
        )}
      </div>
    </div>
  )
}
