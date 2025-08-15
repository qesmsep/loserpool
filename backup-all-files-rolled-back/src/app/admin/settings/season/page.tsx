'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminHeader from '@/components/admin-header'

// NFL 2025-2026 Season Dates (based on typical NFL schedule)
const NFL_DATES_2025_2026 = {
  preseason: {
    start: '2025-08-07', // First preseason game typically early August
    end: '2025-08-28'    // Last preseason game typically late August
  },
  regularSeason: {
    start: '2025-09-04', // Week 1 typically first Thursday in September
    end: '2026-01-05'    // Week 18 typically first Sunday in January
  },
  postseason: {
    start: '2026-01-11', // Wild Card weekend typically second Saturday in January
    end: '2026-01-26'    // Conference Championships typically last Sunday in January
  },
  superbowl: {
    date: '2026-02-08'   // Super Bowl typically first Sunday in February
  }
}

interface SeasonData {
  seasonStartType: 'preseason' | 'regularSeason'
  seasonEndType: 'regularSeason' | 'postseason' | 'superbowl'
  registrationDeadline: string
  currentWeek: number
}

export default function AdminSeasonPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  const [season, setSeason] = useState<SeasonData>({
    seasonStartType: 'regularSeason',
    seasonEndType: 'regularSeason',
    registrationDeadline: '',
    currentWeek: 1
  })

  // Calculate actual dates based on selections
  const getSeasonStartDate = () => {
    return season.seasonStartType === 'preseason' 
      ? NFL_DATES_2025_2026.preseason.start 
      : NFL_DATES_2025_2026.regularSeason.start
  }

  const getSeasonEndDate = () => {
    switch (season.seasonEndType) {
      case 'regularSeason':
        return NFL_DATES_2025_2026.regularSeason.end
      case 'postseason':
        return NFL_DATES_2025_2026.postseason.end
      case 'superbowl':
        return NFL_DATES_2025_2026.superbowl.date
      default:
        return NFL_DATES_2025_2026.regularSeason.end
    }
  }

  useEffect(() => {
    loadSeasonSettings()
  }, [])

  const loadSeasonSettings = async () => {
    try {
      setLoading(true)
      
      // Get current season settings from global settings
      const { data: settings } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', ['season_start', 'registration_deadline', 'season_end', 'current_week'])

      if (settings) {
        const seasonStart = settings.find(s => s.key === 'season_start')?.value || ''
        const registrationDeadline = settings.find(s => s.key === 'registration_deadline')?.value || ''
        const seasonEnd = settings.find(s => s.key === 'season_end')?.value || ''
        const currentWeek = settings.find(s => s.key === 'current_week')?.value || '1'

        // Determine season start type based on stored date
        let seasonStartType: 'preseason' | 'regularSeason' = 'regularSeason'
        if (seasonStart === NFL_DATES_2025_2026.preseason.start) {
          seasonStartType = 'preseason'
        }

        // Determine season end type based on stored date
        let seasonEndType: 'regularSeason' | 'postseason' | 'superbowl' = 'regularSeason'
        if (seasonEnd === NFL_DATES_2025_2026.superbowl.date) {
          seasonEndType = 'superbowl'
        } else if (seasonEnd === NFL_DATES_2025_2026.postseason.end) {
          seasonEndType = 'postseason'
        }

        setSeason({
          seasonStartType,
          seasonEndType,
          registrationDeadline,
          currentWeek: parseInt(currentWeek)
        })
      }
    } catch (error) {
      console.error('Error loading season settings:', error)
      setError('Failed to load season settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const seasonStartDate = getSeasonStartDate()
      const seasonEndDate = getSeasonEndDate()

      // Update global settings
      const updates = [
        { key: 'season_start', value: seasonStartDate },
        { key: 'registration_deadline', value: season.registrationDeadline },
        { key: 'season_end', value: seasonEndDate },
        { key: 'current_week', value: season.currentWeek.toString() }
      ]

      for (const update of updates) {
        // First try to update existing record
        const { error: updateError } = await supabase
          .from('global_settings')
          .update({ value: update.value })
          .eq('key', update.key)

        if (updateError) {
          // If update fails, try to insert (in case the key doesn't exist)
          const { error: insertError } = await supabase
            .from('global_settings')
            .insert({ key: update.key, value: update.value })

          if (insertError) {
            throw insertError
          }
        }
      }

      setSuccess('Season settings updated successfully!')
    } catch (error) {
      console.error('Error saving season settings:', error)
      setError('Failed to save season settings')
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
        title="Season Settings"
        subtitle="Configure season dates and schedule"
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
            <h2 className="text-xl font-semibold text-white">Season Configuration</h2>
            <p className="text-blue-100">Set important dates for the 2025-2026 NFL season</p>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Season Start */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Season Start
              </label>
              <div className="text-sm text-blue-200 mb-3">
                When the pool officially begins
              </div>
              <select
                value={season.seasonStartType}
                onChange={(e) => setSeason({...season, seasonStartType: e.target.value as 'preseason' | 'regularSeason'})}
                className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
              >
                <option value="preseason">Pre-season (August 7, 2025)</option>
                <option value="regularSeason">Regular Season (September 4, 2025)</option>
              </select>
              <div className="text-xs text-blue-300 mt-1">
                Selected date: {getSeasonStartDate()}
              </div>
            </div>

            {/* Registration Deadline */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Registration Deadline
              </label>
              <div className="text-sm text-blue-200 mb-3">
                Last day users can register and purchase picks
              </div>
              <input
                type="date"
                value={season.registrationDeadline}
                onChange={(e) => setSeason({...season, registrationDeadline: e.target.value})}
                className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
              />
            </div>

            {/* Season End */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Season End
              </label>
              <div className="text-sm text-blue-200 mb-3">
                When the pool officially ends
              </div>
              <select
                value={season.seasonEndType}
                onChange={(e) => setSeason({...season, seasonEndType: e.target.value as 'regularSeason' | 'postseason' | 'superbowl'})}
                className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
              >
                <option value="regularSeason">Regular Season (January 5, 2026)</option>
                <option value="postseason">Post Season (January 26, 2026)</option>
                <option value="superbowl">Super Bowl (February 8, 2026)</option>
              </select>
              <div className="text-xs text-blue-300 mt-1">
                Selected date: {getSeasonEndDate()}
              </div>
            </div>

            {/* Current Week */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Current Week
              </label>
              <div className="text-sm text-blue-200 mb-3">
                Current NFL week (1-18)
              </div>
              <input
                type="number"
                value={season.currentWeek}
                onChange={(e) => setSeason({...season, currentWeek: parseInt(e.target.value) || 1})}
                className="w-full px-3 py-2 border border-white/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/10"
                min="1"
                max="18"
              />
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

            {/* Season Info */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Season Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-blue-200">Season Status</div>
                  <div className="text-2xl font-bold text-white">Active</div>
                  <div className="text-xs text-blue-300">Week {season.currentWeek}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-blue-200">Weeks Remaining</div>
                  <div className="text-2xl font-bold text-white">{Math.max(0, 18 - season.currentWeek)}</div>
                  <div className="text-xs text-blue-300">of 18 weeks</div>
                </div>
              </div>
              
              {/* NFL Schedule Info */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-blue-200">Season Start</div>
                  <div className="text-lg font-semibold text-white">
                    {season.seasonStartType === 'preseason' ? 'Pre-season' : 'Regular Season'}
                  </div>
                  <div className="text-xs text-blue-300">{getSeasonStartDate()}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-blue-200">Season End</div>
                  <div className="text-lg font-semibold text-white">
                    {season.seasonEndType === 'superbowl' ? 'Super Bowl' : 
                     season.seasonEndType === 'postseason' ? 'Post Season' : 'Regular Season'}
                  </div>
                  <div className="text-xs text-blue-300">{getSeasonEndDate()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 