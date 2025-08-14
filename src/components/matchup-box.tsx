'use client'

import { Plus, Minus, MapPin, Clock } from 'lucide-react'
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

// Mock team stats and venue data
const TEAM_STATS: Record<string, { rank: number; record: string; venue: string; city: string }> = {
  'Green Bay Packers': { rank: 12, record: '9-8', venue: 'Lambeau Field', city: 'Green Bay, WI' },
  'Chicago Bears': { rank: 28, record: '7-10', venue: 'Soldier Field', city: 'Chicago, IL' },
  'Dallas Cowboys': { rank: 5, record: '12-5', venue: 'AT&T Stadium', city: 'Arlington, TX' },
  'New York Giants': { rank: 25, record: '6-11', venue: 'MetLife Stadium', city: 'East Rutherford, NJ' },
  'Philadelphia Eagles': { rank: 3, record: '11-6', venue: 'Lincoln Financial Field', city: 'Philadelphia, PA' },
  'Washington Commanders': { rank: 26, record: '4-13', venue: 'FedExField', city: 'Landover, MD' },
  'Detroit Lions': { rank: 8, record: '12-5', venue: 'Ford Field', city: 'Detroit, MI' },
  'Kansas City Chiefs': { rank: 1, record: '11-6', venue: 'Arrowhead Stadium', city: 'Kansas City, MO' },
  'Carolina Panthers': { rank: 32, record: '2-15', venue: 'Bank of America Stadium', city: 'Charlotte, NC' },
  'Atlanta Falcons': { rank: 20, record: '7-10', venue: 'Mercedes-Benz Stadium', city: 'Atlanta, GA' },
  'Houston Texans': { rank: 15, record: '10-7', venue: 'NRG Stadium', city: 'Houston, TX' },
  'Baltimore Ravens': { rank: 2, record: '13-4', venue: 'M&T Bank Stadium', city: 'Baltimore, MD' },
  'Cincinnati Bengals': { rank: 16, record: '9-8', venue: 'Paycor Stadium', city: 'Cincinnati, OH' },
  'Cleveland Browns': { rank: 13, record: '11-6', venue: 'Cleveland Browns Stadium', city: 'Cleveland, OH' },
  'Jacksonville Jaguars': { rank: 14, record: '9-8', venue: 'EverBank Stadium', city: 'Jacksonville, FL' },
  'Indianapolis Colts': { rank: 22, record: '9-8', venue: 'Lucas Oil Stadium', city: 'Indianapolis, IN' },
  'Tampa Bay Buccaneers': { rank: 18, record: '9-8', venue: 'Raymond James Stadium', city: 'Tampa, FL' },
  'Minnesota Vikings': { rank: 21, record: '7-10', venue: 'U.S. Bank Stadium', city: 'Minneapolis, MN' },
  'Tennessee Titans': { rank: 27, record: '6-11', venue: 'Nissan Stadium', city: 'Nashville, TN' },
  'New Orleans Saints': { rank: 19, record: '9-8', venue: 'Caesars Superdome', city: 'New Orleans, LA' },
  'San Francisco 49ers': { rank: 4, record: '12-5', venue: 'Levi\'s Stadium', city: 'Santa Clara, CA' },
  'Pittsburgh Steelers': { rank: 17, record: '10-7', venue: 'Acrisure Stadium', city: 'Pittsburgh, PA' },
  'Arizona Cardinals': { rank: 31, record: '4-13', venue: 'State Farm Stadium', city: 'Glendale, AZ' },
  'Las Vegas Raiders': { rank: 24, record: '8-9', venue: 'Allegiant Stadium', city: 'Las Vegas, NV' },
  'Denver Broncos': { rank: 29, record: '8-9', venue: 'Empower Field at Mile High', city: 'Denver, CO' },
  'Miami Dolphins': { rank: 6, record: '11-6', venue: 'Hard Rock Stadium', city: 'Miami Gardens, FL' },
  'Los Angeles Chargers': { rank: 23, record: '5-12', venue: 'SoFi Stadium', city: 'Inglewood, CA' },
  'Los Angeles Rams': { rank: 11, record: '10-7', venue: 'SoFi Stadium', city: 'Inglewood, CA' },
  'Seattle Seahawks': { rank: 9, record: '9-8', venue: 'Lumen Field', city: 'Seattle, WA' },
  'Buffalo Bills': { rank: 7, record: '11-6', venue: 'Highmark Stadium', city: 'Orchard Park, NY' },
  'New York Jets': { rank: 30, record: '7-10', venue: 'MetLife Stadium', city: 'East Rutherford, NJ' },
  'New England Patriots': { rank: 10, record: '4-13', venue: 'Gillette Stadium', city: 'Foxborough, MA' }
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

// Function to get team stats
function getTeamStats(teamName: string) {
  const fullName = getFullTeamName(teamName)
  return TEAM_STATS[fullName] || { rank: 0, record: '0-0', venue: 'Unknown', city: 'Unknown' }
}

interface MatchupBoxProps {
  matchup: {
    id: string
    away_team: string
    home_team: string
    game_time: string
    venue?: string
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
  getPicksForMatchup?: (matchupId: string) => any[]
}

interface TeamCardProps {
  teamName: string
  isPicked: boolean
  picksCount: number
  pickNames: string[]
  addPick: () => void
  removePick: () => void
  colors: {
    primary: string
    secondary: string
    text: string
  }
  disabled: boolean
  showControls: boolean
  isHomeTeam?: boolean
}

function TeamCard({
  teamName,
  isPicked,
  picksCount,
  pickNames,
  addPick,
  removePick,
  colors,
  disabled,
  showControls,
  isHomeTeam = false
}: TeamCardProps) {
  const fullTeamName = getFullTeamName(teamName)
  const teamStats = getTeamStats(teamName)
  
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

  const innerGlowStyle = {}

  const carbonFiberOverlay = {
    content: "''",
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage:
      'url("data:image/svg+xml,%3csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cpath d=\'M0 0L40 40M40 0L0 40\' stroke=\'%23222222\' stroke-opacity=\'0.15\' stroke-width=\'1\'/%3e%3c/svg%3e")',
    pointerEvents: 'none' as const,
    opacity: 0.15,
    zIndex: 1,
  }

  const vignetteOverlay = {
    content: "''",
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background:
      'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)',
    pointerEvents: 'none' as const,
    zIndex: 2,
  }

  if (isPicked && picksCount > 0) {
    return (
      <button
        onClick={addPick}
        disabled={disabled}
        className="w-[90%] mx-auto transform transition-all duration-300 relative h-full flex flex-col hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        aria-label={`Edit picks for ${fullTeamName}`}
      >
        <div style={{ ...teamCardStyle, ...innerGlowStyle }}>
          <div style={carbonFiberOverlay} />
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0) 70%, rgba(0,0,0,0.35) 100%)',
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
              {/* Team Stats Row */}
              <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-1">
                <span className="text-[7px] sm:text-[9px] bg-white/20 px-1 sm:px-1.5 py-0.5 rounded text-white/90">
                  {teamStats.record}
                </span>
                {isHomeTeam ? (
                  <span className="text-[7px] sm:text-[9px] bg-white/20 px-1 sm:px-1.5 py-0.5 rounded text-white/90">
                    HOME
                  </span>
                ) : (
                  <span className="text-[7px] sm:text-[9px] bg-white/20 px-1 sm:px-1.5 py-0.5 rounded text-white/90">
                    AWAY
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-1">
                {showControls && (
                  <button
                    onClick={removePick}
                    disabled={disabled}
                    className="bg-white/20 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm hover:bg-white/30 disabled:opacity-50 border border-white/30"
                    aria-label={`Remove pick from ${fullTeamName}`}
                  >
                    <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                )}
                <div
                  className="font-normal sm:font-medium text-[11px] sm:text-[24px] leading-tight tracking-wide min-h-[2.5rem] sm:min-h-0 flex flex-col items-center justify-center"
                  style={{ fontFamily: "'Inter', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                >
                  <div className="text-[12px] sm:text-[24px] leading-none">
                    {fullTeamName.split(' ').slice(0, -1).join(' ')}
                  </div>
                  <div className="text-[12px] sm:text-[24px] leading-none">
                    {fullTeamName.split(' ').slice(-1)[0]}
                  </div>
                </div>
                {showControls && (
                  <button
                    onClick={addPick}
                    disabled={disabled}
                    className="bg-white/20 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm hover:bg-white/30 disabled:opacity-50 border border-white/30"
                    aria-label={`Add pick to ${fullTeamName}`}
                  >
                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                )}
              </div>
              <div
                className="font-normal sm:font-medium text-[8px] sm:text-[11px] tracking-wide opacity-80"
                style={{ fontFamily: "'Inter', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
              >
                {picksCount > 0 ? `${picksCount} loser pick${picksCount !== 1 ? 's' : ''}` : ''}
              </div>

            </div>
          </TeamBackground>
          <div style={vignetteOverlay} />
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={addPick}
      disabled={disabled}
      className="w-[90%] mx-auto transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed h-full flex flex-col"
      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
      aria-label={`Pick ${fullTeamName}`}
    >
      <div style={teamCardStyle}>
        <div style={carbonFiberOverlay} />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0) 70%, rgba(0,0,0,0.35) 100%)',
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
          {/* Team Stats Row */}
          <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-1">
            <span className="text-[7px] sm:text-[9px] bg-white/20 px-1 sm:px-1.5 py-0.5 rounded text-white/90">
              {teamStats.record}
            </span>
            {isHomeTeam ? (
              <span className="text-[7px] sm:text-[9px] bg-white/20 px-1 sm:px-1.5 py-0.5 rounded text-white/90">
                HOME
              </span>
            ) : (
              <span className="text-[7px] sm:text-[9px] bg-white/20 px-1 sm:px-1.5 py-0.5 rounded text-white/90">
                AWAY
              </span>
            )}
          </div>
          
          <div
            className="mb-1 relative z-20 font-normal sm:font-medium text-[11px] sm:text-[24px] leading-tight tracking-wide min-h-[2.5rem] sm:min-h-0 flex flex-col items-center justify-center"
            style={{ fontFamily: "'Inter', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
          >
            <div className="text-[12px] sm:text-[24px] leading-none">
              {fullTeamName.split(' ').slice(0, -1).join(' ')}
            </div>
            <div className="text-[12px] sm:text-[24px] leading-none">
              {fullTeamName.split(' ').slice(-1)[0]}
            </div>
          </div>
          <div
            className="text-[8px] sm:text-[11px] tracking-wide opacity-70 relative z-20"
            style={{ fontFamily: "'Inter', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
          >
            Click to pick
          </div>
        </TeamBackground>
        <div style={vignetteOverlay} />
      </div>
    </button>
  )
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
  formatGameTime,
  getPicksForMatchup
}: MatchupBoxProps) {
  const isThursdayGame = new Date(matchup.game_time).getDay() === 4

  const awayColors = getTeamColors(matchup.away_team)
  const homeColors = getTeamColors(matchup.home_team)

  // Get all picks for this matchup
  const matchupPicks = getPicksForMatchup ? getPicksForMatchup(matchup.id) : []
  
  // Get picks for each team
  const awayTeamPicks = matchupPicks.filter(pick => pick.team_picked === matchup.away_team)
  const homeTeamPicks = matchupPicks.filter(pick => pick.team_picked === matchup.home_team)
  
  const awayIsPicked = awayTeamPicks.length > 0
  const homeIsPicked = homeTeamPicks.length > 0
  
  const awayPicksCount = awayTeamPicks.reduce((sum, pick) => sum + pick.picks_count, 0)
  const homePicksCount = homeTeamPicks.reduce((sum, pick) => sum + pick.picks_count, 0)
  
  const awayPickNames = awayTeamPicks.map(pick => pick.pick_name).filter(Boolean)
  const homePickNames = homeTeamPicks.map(pick => pick.pick_name).filter(Boolean)

  const disabled = checkDeadlinePassed()
  const canShowControls = showControls || (!picksSaved && userPicks.length > 0)

  return (
    <div className="bg-white/5 border border-white/20 rounded-lg p-2 sm:p-3">
      {/* Game Info Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex-1">
          <div className="flex flex-col space-y-1">
            {/* Game Time */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Clock className="w-3 h-3 text-blue-200" />
              <span className="text-xs sm:text-sm text-blue-200">
                {formatGameTime(matchup.game_time)}
              </span>
              {isThursdayGame && (
                <span className="text-xs text-orange-300 bg-orange-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                  TNF
                </span>
              )}
            </div>
            
            {/* Venue Info */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <MapPin className="w-3 h-3 text-blue-200" />
              <span className="text-xs text-blue-200">
                {getTeamStats(matchup.home_team).venue}, {getTeamStats(matchup.home_team).city}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Selection Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 items-start">
        {/* Away Team */}
        <div className="relative">
          <TeamCard
            teamName={matchup.away_team}
            isPicked={awayIsPicked}
            picksCount={awayPicksCount}
            pickNames={awayPickNames}
            addPick={() => addPickToTeam(matchup.id, matchup.away_team)}
            removePick={() => removePickFromTeam(matchup.id, matchup.away_team)}
            colors={awayColors}
            disabled={disabled}
            showControls={canShowControls}
          />
          {/* Pick names below away team */}
          {awayPickNames.length > 0 && (
            <div className="mt-2 text-center">
              <div className="text-xs text-blue-200">
                {awayPickNames.join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Home Team */}
        <div className="relative">
          <TeamCard
            teamName={matchup.home_team}
            isPicked={homeIsPicked}
            picksCount={homePicksCount}
            pickNames={homePickNames}
            addPick={() => addPickToTeam(matchup.id, matchup.home_team)}
            removePick={() => removePickFromTeam(matchup.id, matchup.home_team)}
            colors={homeColors}
            disabled={disabled}
            showControls={canShowControls}
            isHomeTeam={true}
          />
          {/* Pick names below home team */}
          {homePickNames.length > 0 && (
            <div className="mt-2 text-center">
              <div className="text-xs text-blue-200">
                {homePickNames.join(', ')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
