import React from 'react'
import { getTeamColors } from '@/lib/team-logos'
import styled from 'styled-components'

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

interface StyledTeamNameProps {
  teamName: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showTeamColors?: boolean
}

export default function StyledTeamName({ 
  teamName, 
  className = '', 
  size = 'md',
  showTeamColors = true 
}: StyledTeamNameProps) {
  const fullTeamName = getFullTeamName(teamName)
  const colors = getTeamColors(fullTeamName)
  
  const sizeClasses = {
    sm: 'text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2',
    md: 'text-sm sm:text-base px-3 sm:px-5 py-2 sm:py-2.5',
    lg: 'text-base sm:text-lg px-4 sm:px-6 py-2.5 sm:py-3'
  }

  // Bevel effect using text shadows
  const bevelTextShadow = '0 -1px 0 rgba(255,255,255,1), 0 -2px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.8), 0 2px 0 rgba(0,0,0,0.4)'

  if (!showTeamColors) {
    return (
      <span 
        className={`${sizeClasses[size]} ${className}`} 
        style={{ 
          color: 'white',
          textShadow: bevelTextShadow
        }}
      >
        {fullTeamName}
      </span>
    )
  }

  return (
    <span
      className={`${sizeClasses[size]} ${className} font-normal sm:font-bold rounded-lg inline-block`}
      style={{
        background: `linear-gradient(to bottom,
          rgba(255,255,255,0.18) 0%,
          ${colors.primary} 12%,
          ${colors.primary} 60%,
          rgba(0,0,0,0.28) 100%)`,
        color: 'white',
        textTransform: 'none',
        letterSpacing: '0.02em',
        textShadow: `${bevelTextShadow}, 0 1px 2px rgba(0,0,0,0.55)`,
        whiteSpace: 'nowrap',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {fullTeamName}
    </span>
  )
}

export const TeamBackground = styled.div`
  background: linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, var(--primary) 50%, rgba(0,0,0,0.25) 100%);
  color: var(--secondary);
  text-shadow: 0 1px 2px rgba(0,0,0,0.6);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: url('/path-to-watermark-logo.svg') no-repeat center 60%;
    background-size: 120% 120%;
    opacity: 0.05;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: url('/path-to-subtle-texture.png') repeat;
    opacity: 0.05;
    pointer-events: none;
  }
`
