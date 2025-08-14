import React from 'react'
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

interface TeamBackgroundProps {
  teamName: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  diagonalStripes?: boolean
  gradientDepth?: boolean
  borderGlow?: boolean
  watermarkLogo?: boolean
  embossLogo?: boolean
  duotoneLogo?: boolean
  croppedLogo?: boolean
}

export default function TeamBackground({
  teamName,
  children,
  className = '',
  size = 'md',
  diagonalStripes = true,
  gradientDepth = true,
  borderGlow = true,
  watermarkLogo = true,
  embossLogo = true,
  duotoneLogo = true,
  croppedLogo = true
}: TeamBackgroundProps) {
  const fullTeamName = getFullTeamName(teamName)
  const colors = getTeamColors(fullTeamName)
  
  const sizeClasses = {
    sm: 'p-2 text-sm',
    md: 'p-3.5 text-base',
    lg: 'p-5 text-lg'
  }

  const backgroundStyle: React.CSSProperties = {
    background: gradientDepth
      ? `linear-gradient(to bottom,
          rgba(255,255,255,0.18) 0%,
          ${colors.primary} 10%,
          ${colors.primary} 55%,
          rgba(0,0,0,0.28) 100%)`
      : colors.primary,
    border: 'none',
    boxShadow: 'none',
    borderRadius: '8px',
    position: 'relative',
    overflow: 'hidden',
    color: 'white',
    fontFamily: "'Bebas Neue', sans-serif",
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    transition: 'box-shadow 0.3s ease',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)'
  }

  return (
    <div 
      className={`${sizeClasses[size]} ${className}`}
      style={backgroundStyle}
    >
      {/* Diagonal stripes pattern */}
      {diagonalStripes && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M0 0L40 40M40 0L0 40' stroke='%23ffffff' stroke-opacity='0.05' stroke-width='1'/%3e%3c/svg%3e")`,
            opacity: 0.05,
            zIndex: 10
          }}
        />
      )}

      {/* Top micro-sheen band */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-[10px] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(255,255,255,0))',
          zIndex: 18
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
          background: `linear-gradient(20deg, ${colors.secondary}FF 0%, ${colors.secondary}50 20%, ${colors.secondary}10 45%, ${colors.secondary}00 70%)`,
          mixBlendMode: 'screen',
          zIndex: 19
        }}
      />

      {/* Watermark logo - using team colors instead of logo image */}
      {watermarkLogo && (
        <div
          aria-hidden="true"
          className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${colors.secondary}20 0%, transparent 70%)`,
            filter: embossLogo 
              ? 'brightness(0.8) contrast(1.2)'
              : duotoneLogo
                ? 'brightness(0.9) saturate(1.1)'
                : 'none',
            opacity: 0.05,
            mixBlendMode: 'overlay',
            zIndex: 15,
            backgroundPosition: 'center 60%',
            backgroundSize: '120% 120%'
          }}
        />
      )}

      {/* Dark vignette gradient overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'none',
          zIndex: 20
        }}
      />

      {/* Content */}
      <div className="relative z-30">
        {children}
      </div>
    </div>
  )
}
