import React from 'react'

// Team colors mapping for NFL teams
// Using official team colors for visual identification

export const teamColors: Record<string, { primary: string; secondary: string; text: string }> = {
  // AFC Teams
  'Buffalo Bills': { primary: '#00338D', secondary: '#C60C30', text: 'white' },
  'Miami Dolphins': { primary: '#008E97', secondary: '#FC4C02', text: 'white' },
  'New England Patriots': { primary: '#002244', secondary: '#C60C30', text: 'white' },
  'New York Jets': { primary: '#003F2D', secondary: '#FFFFFF', text: 'white' },
  
  'Baltimore Ravens': { primary: '#241773', secondary: '#000000', text: 'white' },
  'Cincinnati Bengals': { primary: '#FB4F14', secondary: '#000000', text: 'white' },
  'Cleveland Browns': { primary: '#311D00', secondary: '#FF3C00', text: 'white' },
  'Pittsburgh Steelers': { primary: '#000000', secondary: '#FFB612', text: 'white' },
  
  'Houston Texans': { primary: '#03202F', secondary: '#A71930', text: 'white' },
  'Indianapolis Colts': { primary: '#002C5F', secondary: '#FFFFFF', text: 'white' },
  'Jacksonville Jaguars': { primary: '#006778', secondary: '#9F792C', text: 'white' },
  'Tennessee Titans': { primary: '#0C2340', secondary: '#4B92DB', text: 'white' },
  
  'Denver Broncos': { primary: '#FB4F14', secondary: '#002244', text: 'white' },
  'Kansas City Chiefs': { primary: '#E31837', secondary: '#FFB81C', text: 'white' },
  'Las Vegas Raiders': { primary: '#000000', secondary: '#C4C4C4', text: 'white' },
  'Los Angeles Chargers': { primary: '#0080C6', secondary: '#FFC20E', text: 'white' },
  
  // NFC Teams
  'Dallas Cowboys': { primary: '#003594', secondary: '#869397', text: 'white' },
  'New York Giants': { primary: '#0B2265', secondary: '#A71930', text: 'white' },
  'Philadelphia Eagles': { primary: '#004C54', secondary: '#A5ACAF', text: 'white' },
  'Washington Commanders': { primary: '#5A1414', secondary: '#FFB612', text: 'white' },
  
  'Chicago Bears': { primary: '#0B162A', secondary: '#C83803', text: 'white' },
  'Detroit Lions': { primary: '#0076B6', secondary: '#B0B7BC', text: 'white' },
  'Green Bay Packers': { primary: '#203731', secondary: '#FFB612', text: 'white' },
  'Minnesota Vikings': { primary: '#4F2683', secondary: '#FFC62F', text: 'white' },
  
  'Atlanta Falcons': { primary: '#A71930', secondary: '#000000', text: 'white' },
  'Carolina Panthers': { primary: '#0085CA', secondary: '#101820', text: 'white' },
  'New Orleans Saints': { primary: '#D3BC8D', secondary: '#000000', text: 'black' },
  'Tampa Bay Buccaneers': { primary: '#D50A0A', secondary: '#34302B', text: 'white' },
  
  'Arizona Cardinals': { primary: '#97233F', secondary: '#000000', text: 'white' },
  'Los Angeles Rams': { primary: '#003594', secondary: '#FFA300', text: 'white' },
  'San Francisco 49ers': { primary: '#AA0000', secondary: '#B3995D', text: 'white' },
  'Seattle Seahawks': { primary: '#002244', secondary: '#69BE28', text: 'white' },
}

export function getTeamColors(teamName: string) {
  return teamColors[teamName] || { primary: '#6B7280', secondary: '#374151', text: 'white' }
}

export const TeamLogo: React.FC<{ teamName: string; className?: string }> = ({ teamName, className = "w-8 h-8" }) => {
  const colors = getTeamColors(teamName)
  
  return (
    <div 
      className={`${className} rounded-full flex items-center justify-center text-xs font-bold border-2`}
      style={{
        backgroundColor: colors.primary,
        borderColor: colors.secondary,
        color: colors.text
      }}
    >
      {teamName.split(' ').map(word => word[0]).join('')}
    </div>
  )
}
