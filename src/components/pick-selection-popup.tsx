'use client'

import { useState, useEffect } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'
import { getTeamColors } from '@/lib/team-logos'
import TeamBackground from '@/components/team-background'

// Team abbreviation to full name mapping
const TEAM_ABBREVIATIONS: Record<string, string> = {
  'GB': 'Green Bay Packers',
  'CHI': 'Chicago Bears',
  'DAL': 'Dallas Cowboys',
  'NYG': 'New York Giants',
  'PHI': 'Philadelphia Eagles',
  'WAS': 'Washington Commanders',
  'DET': 'Detroit Lions',
  'KC': 'Kansas City Chiefs',
  'CAR': 'Carolina Panthers',
  'ATL': 'Atlanta Falcons',
  'HOU': 'Houston Texans',
  'BAL': 'Baltimore Ravens',
  'CIN': 'Cincinnati Bengals',
  'CLE': 'Cleveland Browns',
  'JAX': 'Jacksonville Jaguars',
  'IND': 'Indianapolis Colts',
  'TB': 'Tampa Bay Buccaneers',
  'MIN': 'Minnesota Vikings',
  'TEN': 'Tennessee Titans',
  'NO': 'New Orleans Saints',
  'SF': 'San Francisco 49ers',
  'PIT': 'Pittsburgh Steelers',
  'ARI': 'Arizona Cardinals',
  'LV': 'Las Vegas Raiders',
  'DEN': 'Denver Broncos',
  'MIA': 'Miami Dolphins',
  'LAC': 'Los Angeles Chargers',
  'LAR': 'Los Angeles Rams',
  'SEA': 'Seattle Seahawks',
  'BUF': 'Buffalo Bills',
  'NYJ': 'New York Jets',
  'NE': 'New England Patriots'
}

// Function to get full team name
const getFullTeamName = (teamName: string): string => {
  // If it's already a full name, return it
  if (TEAM_ABBREVIATIONS[teamName]) {
    return TEAM_ABBREVIATIONS[teamName]
  }
  // If it's not in abbreviations, assume it's already a full name
  return teamName
}

interface PickName {
  id: string
  name: string
  description?: string
  isAllocated?: boolean
  allocatedTeam?: string | null
  status?: 'pending' | 'active' | 'lost' | 'safe'
  matchupInfo?: {
    awayTeam: string
    homeTeam: string
  } | null
}

interface PickSelectionPopupProps {
  isOpen: boolean
  onClose: () => void
  matchupId: string
  teamName: string
  onPicksAllocated: (picks: any[]) => void
}

export default function PickSelectionPopup({
  isOpen,
  onClose,
  matchupId,
  teamName,
  onPicksAllocated
}: PickSelectionPopupProps) {
  const [availablePicks, setAvailablePicks] = useState<PickName[]>([])
  const [selectedPickIds, setSelectedPickIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch available picks when popup opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailablePicks()
    }
  }, [isOpen])

  const fetchAvailablePicks = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/picks/available')
      const data = await response.json()
      
      if (data.success) {
        // Sort picks alphabetically by name
        const sortedPicks = (data.availablePicks || []).sort((a: PickName, b: PickName) => 
          a.name.localeCompare(b.name)
        )
        setAvailablePicks(sortedPicks)
      } else {
        setError(data.error || 'Failed to fetch available picks')
      }
    } catch (error) {
      console.error('Error fetching available picks:', error)
      setError('Failed to fetch available picks')
    } finally {
      setLoading(false)
    }
  }



  const handlePickToggle = (pickId: string) => {
    setSelectedPickIds(prev => {
      if (prev.includes(pickId)) {
        return prev.filter(id => id !== pickId)
      } else {
        return [...prev, pickId]
      }
    })
  }

  const handleSelectAll = () => {
    setSelectedPickIds(availablePicks.filter(pick => pick.status !== 'lost').map(pick => pick.id))
  }

  const handleSelectNone = () => {
    setSelectedPickIds([])
  }

  const handleAllocate = async () => {
    if (selectedPickIds.length === 0) {
      setError('Please select at least one pick to allocate')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/picks/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchupId,
          teamName,
          pickNameIds: selectedPickIds
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        onPicksAllocated(data.picks)
        onClose()
        setSelectedPickIds([])
      } else {
        setError(data.error || 'Failed to allocate picks')
      }
    } catch (error) {
      console.error('Error allocating picks:', error)
      setError('Failed to allocate picks')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedPickIds([])
    setError('')
    setSuccess('')
    onClose()
  }

  if (!isOpen) return null

  const fullTeamName = getFullTeamName(teamName)
  const teamColors = getTeamColors(fullTeamName)

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] sm:max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            <span className="sm:hidden">Pick Selection</span>
            <span className="hidden sm:inline">Select Picks to Allocate</span>
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>



        {/* Content */}
        <div className="p-3 sm:p-8">
          {/* Team Info */}
          <div 
            className={`mb-3 sm:mb-4 p-3 sm:p-4 rounded-lg text-white font-semibold text-center relative overflow-hidden touch-manipulation ${
              selectedPickIds.length > 0 ? 'cursor-pointer hover:opacity-90 transition-opacity active:opacity-75' : 'cursor-not-allowed'
            }`}
            style={{
              borderRadius: '8px',
              boxShadow: '0 0 8px rgba(0,0,0,0.5)',
              position: 'relative',
              overflow: 'hidden',
              color: 'white',
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              border: selectedPickIds.length > 0 ? '3px solid #22c55e' : 'none',
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden'
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('Team button clicked!', { selectedPickIds: selectedPickIds.length, loading })
              if (selectedPickIds.length > 0 && !loading) {
                console.log('Calling handleAllocate...')
                handleAllocate()
              } else {
                console.log('Button not clickable:', { selectedPickIds: selectedPickIds.length, loading })
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (selectedPickIds.length > 0 && !loading && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                handleAllocate()
              }
            }}
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('Touch start on team button!')
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('Touch end on team button!')
              if (selectedPickIds.length > 0 && !loading) {
                console.log('Touch calling handleAllocate...')
                handleAllocate()
              }
            }}
            aria-label={`Pick ${fullTeamName} to lose for ${selectedPickIds.length} pick${selectedPickIds.length !== 1 ? 's' : ''}`}
          >
            <TeamBackground
              teamName={fullTeamName}
              size="lg"
              className="w-full bg-transparent border-none shadow-none relative z-10"
              gradientDepth={false}
              borderGlow={false}
              watermarkLogo
              embossLogo={false}
              duotoneLogo={false}
              croppedLogo
            >
              <div className="text-center relative z-20 select-none" style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Allocating...</span>
                </div>
              ) : selectedPickIds.length > 0 ? (
                <>
                  <div className="font-normal sm:font-bold text-[12px] sm:text-[16px] leading-tight tracking-wide" style={{ fontFamily: "'Inter', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                    PICK {fullTeamName}
                  </div>
                  <div className="font-normal sm:font-bold text-[12px] sm:text-[16px] leading-tight tracking-wide" style={{ fontFamily: "'Inter', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                    TO LOSE
                  </div>
                  <div className="text-xs sm:text-sm opacity-90" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                    ({selectedPickIds.length} pick{selectedPickIds.length !== 1 ? 's' : ''} selected)
                  </div>
                </>
              ) : (
                <>
                  <div className="font-normal sm:font-bold text-[12px] sm:text-[16px] leading-tight tracking-wide" style={{ fontFamily: "'Inter', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                    PICK {fullTeamName}
                  </div>
                  <div className="font-normal sm:font-bold text-[12px] sm:text-[16px] leading-tight tracking-wide" style={{ fontFamily: "'Inter', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                    TO LOSE
                  </div>
                </>
              )}
              </div>
            </TeamBackground>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
              <p className="text-xs sm:text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
              <p className="text-xs sm:text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && availablePicks.length === 0 && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading available picks...</p>
            </div>
          )}

          {/* Available Picks */}
          {!loading && availablePicks.length > 0 && (
            <>
              {/* Selection Instructions */}
              <div className="mb-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 font-medium">
                    Choose your pick below to select this team to lose
                  </p>
                </div>
              </div>

              {/* Column Headers */}
              <div className="flex items-center space-x-3 p-3 mb-2 bg-gray-100 rounded-lg border border-gray-200">
                <div className="w-4"></div> {/* Checkbox spacer */}
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div className="font-semibold text-xs sm:text-sm text-gray-700">Pick Name</div>
                  <div className="font-semibold text-xs sm:text-sm text-gray-700">Status</div>
                  <div className="font-semibold text-xs sm:text-sm text-gray-700">Chosen Team</div>
                </div>
              </div>

              {/* Picks List */}
              <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
                {availablePicks.map((pick) => {
                  const isLost = pick.status === 'lost'
                  const isSelectable = pick.status !== 'lost'
                  
                  return (
                    <label
                      key={pick.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        isLost
                          ? 'bg-red-50 border-red-200 cursor-not-allowed opacity-75'
                          : selectedPickIds.includes(pick.id)
                          ? 'bg-blue-50 border-blue-200 cursor-pointer'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPickIds.includes(pick.id)}
                        onChange={() => handlePickToggle(pick.id)}
                        disabled={isLost}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                        <div className="font-medium text-gray-900">{pick.name}</div>
                        <div>
                          {/* Status Badge */}
                          {(() => {
                            let statusText = 'Available'
                            let statusClass = 'bg-green-100 text-green-800'
                            
                            if (pick.status === 'lost') {
                              statusText = 'Lost'
                              statusClass = 'bg-red-100 text-red-800'
                            } else if (pick.isAllocated) {
                              statusText = 'Picked'
                              statusClass = 'bg-blue-100 text-blue-800'
                            }
                            
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                                {statusText}
                              </span>
                            )
                          })()}
                        </div>
                        <div className="text-gray-600">
                          {/* Allocation Info */}
                          {pick.isAllocated && pick.allocatedTeam ? (
                            <div className="inline-block">
                              <TeamBackground
                                teamName={pick.allocatedTeam}
                                size="sm"
                                className="w-16 h-6 rounded text-xs font-medium border border-gray-300 flex items-center justify-center"
                                gradientDepth={false}
                                borderGlow={false}
                                watermarkLogo={false}
                                embossLogo={false}
                                duotoneLogo={false}
                                croppedLogo={false}
                              >
                                <span className="text-white text-xs font-medium">
                                  {pick.allocatedTeam}
                                </span>
                              </TeamBackground>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Not allocated</span>
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </>
          )}

          {/* No Available Picks */}
          {!loading && availablePicks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No picks found</p>
              <p className="text-sm text-gray-400 mt-1">
                You don&apos;t have any picks to allocate
              </p>
            </div>
          )}
        </div>

                {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          {/* Desktop allocate button removed - team button is now the primary action */}
        </div>

        {/* Mobile Cancel Button - Bottom */}
        <div className="sm:hidden p-4 border-t bg-gray-50">
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-full px-4 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
