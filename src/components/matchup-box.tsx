'use client'

import { Plus, Minus } from 'lucide-react'
import StyledTeamName from './styled-team-name'
import TeamBackground from './team-background'
import { getTeamColors } from '@/lib/team-logos'

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
function getFullTeamName(teamName: string): string {
  // If it's already a full name, return as-is
  if (teamName.includes(' ')) {
    return teamName
  }
  
  // Convert abbreviation to full name
  return TEAM_ABBREVIATIONS[teamName] || teamName
}

interface MatchupBoxProps {
  matchup: {
    id: string
    away_team: string
    home_team: string
    game_time: string
  }
  userPick?: {
    team_picked: string
    picks_count: number
  }
  showControls: boolean
  picksSaved: boolean
  userPicks: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  picksRemaining: number
  checkDeadlinePassed: () => boolean
  addPickToTeam: (matchupId: string, teamName: string) => void
  removePickFromTeam: (matchupId: string, teamName: string) => void
  formatGameTime: (gameTime: string) => string
}

interface TeamCardProps {
  teamName: string
  isPicked: boolean
  picksCount: number
  addPick: () => void
  removePick: () => void
  colors: {
    primary: string
    secondary: string
    text: string
  }
  disabled: boolean
  showControls: boolean
}

function TeamCard({
  teamName,
  isPicked,
  picksCount,
  addPick,
  removePick,
  colors,
  disabled,
  showControls
}: TeamCardProps) {
  const fullTeamName = getFullTeamName(teamName)
  
  const teamCardStyle = {
    borderRadius: '8px',
    background: `linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 80%, black))`,
    boxShadow: '0 0 8px rgba(0,0,0,0.5)',
    position: 'relative',
    overflow: 'hidden',
    color: 'white',
    fontFamily: "'Bebas Neue', sans-serif",
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  } as React.CSSProperties

  const innerGlowStyle = isPicked
    ? {
        boxShadow: `inset 0 0 8px 2px ${colors.secondary}`,
      }
    : {}

  const carbonFiberOverlay = {
    content: "''",
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage:
      'url("data:image/svg+xml,%3csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cpath d=\'M0 0L40 40M40 0L0 40\' stroke=\'%23222222\' stroke-opacity=\'0.15\' stroke-width=\'1\'/%3e%3c/svg%3e")',
    pointerEvents: 'none' as 'none',
    opacity: 0.15,
    zIndex: 1,
  }

  const vignetteOverlay = {
    content: "''",
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background:
      'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)',
    pointerEvents: 'none' as 'none',
    zIndex: 2,
  }

  if (isPicked && picksCount > 0) {
    return (
      <div
        className="w-full transform transition-all duration-300 scale-105 relative"
        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
      >
        <div style={{ ...teamCardStyle, ...innerGlowStyle }}>
          <div style={carbonFiberOverlay} />
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
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 right-0 h-[10px] pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(255,255,255,0))',
                zIndex: 18
              }}
            />
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-0 right-0 h-[26px] pointer-events-none"
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0))',
                zIndex: 18
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(20deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 15%, rgba(255,255,255,0) 30%)',
                mixBlendMode: 'screen',
                zIndex: 19
              }}
            />
            <div className="text-center relative z-20 select-none" style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
              <div className="flex items-center justify-center space-x-3 mb-1">
                {showControls && (
                  <button
                    onClick={removePick}
                    disabled={disabled}
                    className="bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-base hover:bg-red-800 disabled:opacity-50"
                    aria-label={`Remove pick from ${fullTeamName}`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}
                <div
                  className="font-bold text-[28px] sm:text-[34px] leading-tight tracking-widest"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                >
                  {fullTeamName}
                </div>
                {showControls && (
                  <button
                    onClick={addPick}
                    disabled={disabled}
                    className="bg-green-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-base hover:bg-green-800 disabled:opacity-50"
                    aria-label={`Add pick to ${fullTeamName}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div
                className="font-semibold text-[12px] sm:text-[13px] tracking-wider opacity-80"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
              >
                {picksCount > 0 ? `${picksCount} loser pick${picksCount !== 1 ? 's' : ''}` : ''}
              </div>
            </div>
          </TeamBackground>
          <div style={vignetteOverlay} />
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={addPick}
      disabled={disabled}
      className="w-full transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
      aria-label={`Pick ${fullTeamName}`}
    >
      <div style={teamCardStyle}>
        <div style={carbonFiberOverlay} />
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
          <div
            className="mb-2 relative z-20 font-bold text-[28px] sm:text-[34px] leading-tight tracking-wide"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
          >
            {fullTeamName}
          </div>
          <div
            className="text-[12px] sm:text-[13px] tracking-wider opacity-70 relative z-20"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
          >
            Click to pick
          </div>
        </TeamBackground>
        <div style={vignetteOverlay} />
      </div>
    </button>
  )
}

// Helper function to darken a hex color by a percentage
function darken(hexColor: string, percent: number): string {
  let r = parseInt(hexColor.slice(1, 3), 16)
  let g = parseInt(hexColor.slice(3, 5), 16)
  let b = parseInt(hexColor.slice(5, 7), 16)

  r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))))
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))))
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))))

  const rr = r.toString(16).padStart(2, '0')
  const gg = g.toString(16).padStart(2, '0')
  const bb = b.toString(16).padStart(2, '0')

  return `#${rr}${gg}${bb}`
}

export default function MatchupBox({
  matchup,
  userPick,
  showControls,
  picksSaved,
  userPicks,
  picksRemaining,
  checkDeadlinePassed,
  addPickToTeam,
  removePickFromTeam,
  formatGameTime
}: MatchupBoxProps) {
  const isThursdayGame = new Date(matchup.game_time).getDay() === 4

  const awayColors = getTeamColors(matchup.away_team)
  const homeColors = getTeamColors(matchup.home_team)

  const awayIsPicked = userPick?.team_picked === matchup.away_team && userPick.picks_count > 0
  const homeIsPicked = userPick?.team_picked === matchup.home_team && userPick.picks_count > 0

  const disabled = checkDeadlinePassed()
  const canShowControls = showControls || (!picksSaved && userPicks.length > 0)

  return (
    <div className="bg-white/5 border border-white/20 rounded-lg p-3 sm:p-4">
      {/* Game Info Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
            <span className="text-xs sm:text-sm text-blue-200">
              {formatGameTime(matchup.game_time)}
            </span>
            {isThursdayGame && (
              <span className="text-xs text-orange-300 bg-orange-500/20 px-2 py-1 rounded self-start">
                TNF
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Team Selection Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Away Team */}
        <div className="relative">
          <TeamCard
            teamName={matchup.away_team}
            isPicked={awayIsPicked}
            picksCount={userPick?.picks_count ?? 0}
            addPick={() => addPickToTeam(matchup.id, matchup.away_team)}
            removePick={() => removePickFromTeam(matchup.id, matchup.away_team)}
            colors={awayColors}
            disabled={disabled || (!awayIsPicked && picksRemaining <= 0)}
            showControls={canShowControls}
          />
        </div>

        {/* Home Team */}
        <div className="relative">
          <TeamCard
            teamName={matchup.home_team}
            isPicked={homeIsPicked}
            picksCount={userPick?.picks_count ?? 0}
            addPick={() => addPickToTeam(matchup.id, matchup.home_team)}
            removePick={() => removePickFromTeam(matchup.id, matchup.home_team)}
            colors={homeColors}
            disabled={disabled || (!homeIsPicked && picksRemaining <= 0)}
            showControls={canShowControls}
          />
        </div>
      </div>
    </div>
  )
}
