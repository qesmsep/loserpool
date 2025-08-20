'use client'

import { Plus, Minus, MapPin, Clock, Cloud, Sun, CloudRain, CloudSnow } from 'lucide-react'
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

// Default team data fallback (will be replaced by database data)
const DEFAULT_TEAM_DATA = {
  record: '0-0',
  venue: 'Unknown',
  city: 'Unknown'
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

// Function to get weather icon based on forecast
function getWeatherIcon(forecast: string) {
  const lowerForecast = forecast.toLowerCase()
  if (lowerForecast.includes('rain') || lowerForecast.includes('shower')) {
    return <CloudRain className="w-3 h-3 inline" />
  } else if (lowerForecast.includes('snow')) {
    return <CloudSnow className="w-3 h-3 inline" />
  } else if (lowerForecast.includes('cloud') || lowerForecast.includes('overcast')) {
    return <Cloud className="w-3 h-3 inline" />
  } else {
    return <Sun className="w-3 h-3 inline" />
  }
}

// Function to get team stats (placeholder for now - will be replaced with database lookup)
function getTeamStats(teamName: string, venue?: string) {
  const fullName = getFullTeamName(teamName)
  
  // If venue is available from the matchup, extract city from it
  if (venue) {
    // Extract city from venue name (e.g., "Arrowhead Stadium" -> "Kansas City")
    const venueCityMap: { [key: string]: string } = {
      'Arrowhead Stadium': 'Kansas City',
      'Soldier Field': 'Chicago',
      'AT&T Stadium': 'Dallas',
      'MetLife Stadium': 'New York',
      'Lincoln Financial Field': 'Philadelphia',
      'FedExField': 'Washington',
      'Ford Field': 'Detroit',
      'Bank of America Stadium': 'Carolina',
      'Mercedes-Benz Stadium': 'Atlanta',
      'NRG Stadium': 'Houston',
      'M&T Bank Stadium': 'Baltimore',
      'Paycor Stadium': 'Cincinnati',
      'Cleveland Browns Stadium': 'Cleveland',
      'TIAA Bank Field': 'Jacksonville',
      'Lucas Oil Stadium': 'Indianapolis',
      'Raymond James Stadium': 'Tampa Bay',
      'U.S. Bank Stadium': 'Minnesota',
      'Nissan Stadium': 'Tennessee',
      'Caesars Superdome': 'New Orleans',
      'Levi\'s Stadium': 'San Francisco',
      'Acrisure Stadium': 'Pittsburgh',
      'State Farm Stadium': 'Arizona',
      'Allegiant Stadium': 'Las Vegas',
      'Empower Field at Mile High': 'Denver',
      'Hard Rock Stadium': 'Miami',
      'SoFi Stadium': 'Los Angeles',
      'Lumen Field': 'Seattle',
      'Highmark Stadium': 'Buffalo',
      'Gillette Stadium': 'New England',
      'Lambeau Field': 'Green Bay'
    }
    
    const city = venueCityMap[venue] || venue.split(' ')[0] // Fallback to first word of venue
    return {
      record: '0-0',
      venue: venue,
      city: city
    }
  }
  
  // Fallback to team name mapping if no venue
  const cityMap: { [key: string]: string } = {
    'Green Bay Packers': 'Green Bay',
    'Chicago Bears': 'Chicago',
    'Dallas Cowboys': 'Dallas',
    'New York Giants': 'New York',
    'Philadelphia Eagles': 'Philadelphia',
    'Washington Commanders': 'Washington',
    'Detroit Lions': 'Detroit',
    'Kansas City Chiefs': 'Kansas City',
    'Carolina Panthers': 'Carolina',
    'Atlanta Falcons': 'Atlanta',
    'Houston Texans': 'Houston',
    'Baltimore Ravens': 'Baltimore',
    'Cincinnati Bengals': 'Cincinnati',
    'Cleveland Browns': 'Cleveland',
    'Jacksonville Jaguars': 'Jacksonville',
    'Indianapolis Colts': 'Indianapolis',
    'Tampa Bay Buccaneers': 'Tampa Bay',
    'Minnesota Vikings': 'Minnesota',
    'Tennessee Titans': 'Tennessee',
    'New Orleans Saints': 'New Orleans',
    'San Francisco 49ers': 'San Francisco',
    'Pittsburgh Steelers': 'Pittsburgh',
    'Arizona Cardinals': 'Arizona',
    'Las Vegas Raiders': 'Las Vegas',
    'Denver Broncos': 'Denver',
    'Miami Dolphins': 'Miami',
    'Los Angeles Chargers': 'Los Angeles',
    'Los Angeles Rams': 'Los Angeles',
    'Seattle Seahawks': 'Seattle',
    'Buffalo Bills': 'Buffalo',
    'New York Jets': 'New York',
    'New England Patriots': 'New England'
  }
  
  return {
    record: '0-0',
    venue: 'Unknown',
    city: cityMap[fullName] || 'Unknown'
  }
}

interface MatchupBoxProps {
  matchup: {
    id: string
    away_team: string
    home_team: string
    game_time: string
    venue?: string
    away_score?: number | null
    home_score?: number | null
    status?: string
    winner?: string
    weather_forecast?: string
    temperature?: number
    wind_speed?: number
    away_spread?: number
    home_spread?: number
    over_under?: number
    quarter_info?: string
    broadcast_info?: string
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
  isPickingAllowed?: boolean
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
  homeTeamName: string
  venue?: string
  score?: number | null
  spread?: number
  isPickingAllowed?: boolean
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
  isHomeTeam = false,
  homeTeamName,
  venue,
  score,
  spread,
  isPickingAllowed = true
}: TeamCardProps) {

  const fullTeamName = getFullTeamName(teamName)
  const teamStats = getTeamStats(teamName, venue)
  
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
    width: '90%', // Exactly 90% as requested
    maxWidth: '90%',
    minWidth: '90%',
    margin: '0 auto',
    display: 'block',
    // Safari-specific properties
    WebkitTransform: 'translateZ(0)',
    transform: 'translateZ(0)',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
    // CSS custom properties for Safari
    '--safari-width': '90%',
    '--safari-max-width': '90%',
    '--safari-min-width': '90%'
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
      <div
        className="transform transition-all duration-300 relative h-full flex flex-col hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed team-card safari-team-card"
        style={{ 
          fontFamily: "'Bebas Neue', sans-serif",
          width: '90%',
          maxWidth: '90%',
          minWidth: '90%',
          margin: '0 auto',
          display: 'block',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          cursor: disabled || !isPickingAllowed ? 'not-allowed' : 'pointer'
        }}
        onClick={(e) => {
          // Only trigger addPick if picking is allowed and the click wasn't on a control button
          if (isPickingAllowed && (!e.target || !(e.target as Element).closest('button'))) {
            addPick()
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (isPickingAllowed && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            addPick()
          }
        }}
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

              
              <div className="flex items-center justify-between w-full mb-1">
                {/* Left side - Team name and controls */}
                <div className="flex items-center space-x-2">
                  {showControls && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removePick()
                      }}
                      disabled={disabled}
                      className="bg-white/20 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm hover:bg-white/30 disabled:opacity-50 border border-white/30"
                      aria-label={`Remove pick from ${fullTeamName}`}
                    >
                      <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  )}
                  <div
                    className="font-bold text-[12px] sm:text-[16px] leading-tight tracking-wide"
                    style={{ fontFamily: "'Inter', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                  >
                    {fullTeamName}
                  </div>
                </div>
                
                {/* Right side - Score or Spread */}
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    {score !== null && score !== undefined ? (
                      <div className="text-lg sm:text-xl font-mono font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                        {score}
                      </div>
                    ) : spread !== null && spread !== undefined ? (
                      <div className="text-sm font-mono text-white/80" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                        {spread > 0 ? `+${spread}` : spread}
                      </div>
                    ) : null}
                  </div>
                  {showControls && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addPick()
                      }}
                      disabled={disabled}
                      className="bg-white/20 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm hover:bg-white/30 disabled:opacity-50 border border-white/30"
                      aria-label={`Add pick to ${fullTeamName}`}
                    >
                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  )}
                </div>
              </div>
              



            </div>
          </TeamBackground>
          <div style={vignetteOverlay} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="transform transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed h-full flex flex-col team-card safari-team-card"
      style={{ 
        fontFamily: "'Bebas Neue', sans-serif",
        width: '90%',
        maxWidth: '90%',
        minWidth: '90%',
        margin: '0 auto',
        display: 'block',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        cursor: disabled || !isPickingAllowed ? 'not-allowed' : 'pointer'
      }}
      onClick={isPickingAllowed ? addPick : undefined}
      role="button"
      tabIndex={0}
              onKeyDown={(e) => {
          if (isPickingAllowed && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            addPick()
          }
        }}
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

          
          <div className="flex items-center justify-between w-full mb-1 relative z-20">
            {/* Left side - Team name */}
            <div
              className="font-bold text-[12px] sm:text-[16px] leading-tight tracking-wide"
              style={{ fontFamily: "'Inter', sans-serif", color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
            >
              {fullTeamName}
            </div>
            
            {/* Right side - Score or Spread */}
            <div className="text-right">
              {score !== null && score !== undefined ? (
                <div className="text-lg sm:text-xl font-mono font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {score}
                </div>
              ) : spread !== null && spread !== undefined ? (
                <div className="text-sm font-mono text-white/80" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                  {spread > 0 ? `+${spread}` : spread}
                </div>
              ) : null}
            </div>
          </div>
          

        </TeamBackground>
        <div style={vignetteOverlay} />
      </div>
    </div>
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
  getPicksForMatchup,
  isPickingAllowed = true
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
    <div className="bg-white/5 border border-white/20 rounded-lg p-2 sm:p-3" style={{
      WebkitTransform: 'translateZ(0)',
      transform: 'translateZ(0)',
      WebkitBackfaceVisibility: 'hidden',
      backfaceVisibility: 'hidden'
    }}>

      {/* Centered Game Info Header */}
      <div className="text-center mb-3 sm:mb-4">
        {/* Game Time and Location */}
        <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-1">
          <Clock className="w-3 h-3 text-blue-200" />
          <span className="text-xs sm:text-sm text-blue-200">
            {formatGameTime(matchup.game_time)}
            {matchup.venue && ` at ${matchup.venue}`}
            {matchup.broadcast_info && ` on ${matchup.broadcast_info}`}
          </span>
          {isThursdayGame && (
            <span className="text-xs text-orange-300 bg-orange-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
              TNF
            </span>
          )}
        </div>
        
        {/* Weather Info */}
        {matchup.weather_forecast && (
          <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-1">
            <span className="text-xs text-blue-200">
              {getWeatherIcon(matchup.weather_forecast)} {matchup.weather_forecast}
              {matchup.temperature && ` ${matchup.temperature}°F`}
              {matchup.wind_speed && ` ${matchup.wind_speed} mph`}
            </span>
          </div>
        )}
        

      </div>

      {/* Team Selection Grid */}
      <div className="flex gap-2 sm:gap-3 items-start" style={{
        display: '-webkit-flex',
        gap: '8px',
        alignItems: 'flex-start',
        width: '100%',
        maxWidth: '100%'
      }}>
        {/* Away Team */}
        <div className="flex-1 relative" style={{
          width: '50%',
          maxWidth: '50%',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden'
        }}>
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
            homeTeamName={matchup.home_team}
            venue={matchup.venue}
            score={matchup.away_score}
            spread={matchup.away_spread}
            isPickingAllowed={isPickingAllowed}
          />
        </div>

        {/* VS/AT Separator */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2" style={{
          minWidth: '40px',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden'
        }}>
          <div className="text-center">
            <div className="text-xs sm:text-sm font-bold text-white/80 mb-1">
              {matchup.status === 'scheduled' ? 'VS' : 'AT'}
            </div>
            {/* Game Status */}
            {matchup.status && (
              <div className="text-xs text-white/60">
                {matchup.quarter_info ? matchup.quarter_info :
                 matchup.status === 'scheduled' ? 'UPCOMING' :
                 matchup.status === 'live' ? 'LIVE' :
                 matchup.status === 'final' ? 'FINAL' :
                 matchup.status.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Home Team */}
        <div className="flex-1 relative" style={{
          width: '50%',
          maxWidth: '50%',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden'
        }}>
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
            homeTeamName={matchup.home_team}
            venue={matchup.venue}
            score={matchup.home_score}
            spread={matchup.home_spread}
            isPickingAllowed={isPickingAllowed}
          />
        </div>
      </div>
    </div>
  )
}
