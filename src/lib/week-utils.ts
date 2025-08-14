// Utility functions for week display that can be used in client components

// Get current NFL week display string (includes preseason)
export function getCurrentWeekDisplay(): string {
  try {
    const now = new Date()
    const preseasonStart = new Date('2025-08-07T00:00:00') // NFL 2025 preseason start
    const regularSeasonStart = new Date('2025-09-04T00:00:00') // NFL 2025 regular season start (approximate)
    
          // If before regular season start, it's preseason
      if (now < regularSeasonStart) {
        // NFL preseason weeks are typically:
        // Week 1: Aug 7-11 (first 5 days)
        // Week 2: Aug 14-18 (next 5 days)
        // Week 3: Aug 21-25 (next 5 days)
        // Week 4: Aug 28-Sep 1 (next 5 days)
        
        const daysSinceStart = Math.floor((now.getTime() - preseasonStart.getTime()) / (24 * 60 * 60 * 1000))
        
        // Calculate preseason week based on NFL schedule
        // NFL preseason typically starts the first full week after Aug 7
        let preseasonWeek = 1
        if (daysSinceStart >= 6) { // Aug 13+ is Week 2
          preseasonWeek = 2
        } else if (daysSinceStart >= 13) { // Aug 20+ is Week 3
          preseasonWeek = 3
        } else if (daysSinceStart >= 20) { // Aug 27+ is Week 4
          preseasonWeek = 4
        }
        
        return `Preseason Week ${preseasonWeek}`
      }
    
    // Regular season
    const regularSeasonWeeksSinceStart = Math.floor((now.getTime() - regularSeasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const regularSeasonWeek = Math.max(1, Math.min(18, regularSeasonWeeksSinceStart + 1))
    return `Week ${regularSeasonWeek}`
  } catch (error) {
    console.error('Error calculating current week display:', error)
    return 'Week 1' // Fallback
  }
}

// Get current NFL week number
export function getCurrentWeekNumber(): number {
  try {
    const now = new Date()
    const preseasonStart = new Date('2025-08-07T00:00:00') // NFL 2025 preseason start
    const regularSeasonStart = new Date('2025-09-04T00:00:00') // NFL 2025 regular season start
    
    // If in preseason, calculate preseason week
    if (now < regularSeasonStart) {
      // NFL preseason weeks are typically:
      // Week 1: Aug 7-11 (first 5 days)
      // Week 2: Aug 14-18 (next 5 days)
      // Week 3: Aug 21-25 (next 5 days)
      // Week 4: Aug 28-Sep 1 (next 5 days)
      
      const daysSinceStart = Math.floor((now.getTime() - preseasonStart.getTime()) / (24 * 60 * 60 * 1000))
      
              // Calculate preseason week based on NFL schedule
        // NFL preseason typically starts the first full week after Aug 7
        let preseasonWeek = 1
        if (daysSinceStart >= 6) { // Aug 13+ is Week 2
          preseasonWeek = 2
        } else if (daysSinceStart >= 13) { // Aug 20+ is Week 3
          preseasonWeek = 3
        } else if (daysSinceStart >= 20) { // Aug 27+ is Week 4
          preseasonWeek = 4
        }
      
      return preseasonWeek
    }
    
    // Regular season
    const regularSeasonWeeksSinceStart = Math.floor((now.getTime() - regularSeasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const regularSeasonWeek = Math.max(1, Math.min(18, regularSeasonWeeksSinceStart + 1))
    return regularSeasonWeek
  } catch (error) {
    console.error('Error calculating current week:', error)
    return 1 // Fallback to week 1
  }
}

// Check if currently in preseason
export function isPreseason(): boolean {
  const now = new Date()
  const regularSeasonStart = new Date('2025-09-04T00:00:00')
  return now < regularSeasonStart
}

// Helper function to format week display
export function formatWeekDisplay(week: number, isPreseason: boolean = false): string {
  if (isPreseason) {
    return `Preseason Week ${week}`
  }
  return week === 0 ? 'Week Zero' : `Week ${week}`
}

// Get the day name for a given date
export function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[date.getDay()]
}

// Get the day name abbreviated
export function getDayNameShort(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[date.getDay()]
}

// Check if a date is a Thursday (typical TNF day)
export function isThursday(date: Date): boolean {
  return date.getDay() === 4 // 4 = Thursday
}

// Check if a date is a Friday
export function isFriday(date: Date): boolean {
  return date.getDay() === 5 // 5 = Friday
}

// Check if a date is a Saturday
export function isSaturday(date: Date): boolean {
  return date.getDay() === 6 // 6 = Saturday
}

// Check if a date is a Sunday
export function isSunday(date: Date): boolean {
  return date.getDay() === 0 // 0 = Sunday
}

// Check if a date is a Monday
export function isMonday(date: Date): boolean {
  return date.getDay() === 1 // 1 = Monday
}

// Check if a date is a Tuesday
export function isTuesday(date: Date): boolean {
  return date.getDay() === 2 // 2 = Tuesday
}

// Check if a date is a Wednesday
export function isWednesday(date: Date): boolean {
  return date.getDay() === 3 // 3 = Wednesday
}

// Get the start of the week based on the first game of that week
// This handles special cases where weeks might start on different days
export function getWeekStartDate(gameDate: Date): Date {
  const dayOfWeek = gameDate.getDay()
  
  // If it's already Thursday or earlier, that's the start of the week
  if (dayOfWeek <= 4) { // Sunday (0) through Thursday (4)
    return new Date(gameDate.getTime())
  }
  
  // If it's Friday, Saturday, or Monday, find the previous Thursday
  // This handles special cases like Friday games, Saturday games, or Monday games
  const daysToSubtract = dayOfWeek === 5 ? 1 : // Friday -> Thursday
                        dayOfWeek === 6 ? 2 : // Saturday -> Thursday
                        3 // Monday -> Thursday (previous Thursday)
  
  const weekStart = new Date(gameDate.getTime())
  weekStart.setDate(weekStart.getDate() - daysToSubtract)
  return weekStart
}

// Determine if a game is the first game of the week
export function isFirstGameOfWeek(gameDate: Date, allGameDates: Date[]): boolean {
  const weekStart = getWeekStartDate(gameDate)
  
  // Check if this game is the earliest game in the same week
  return allGameDates.every(otherDate => {
    const otherWeekStart = getWeekStartDate(otherDate)
    return otherDate.getTime() >= gameDate.getTime() || 
           Math.abs(weekStart.getTime() - otherWeekStart.getTime()) > 7 * 24 * 60 * 60 * 1000
  })
}

// Get the current week based on actual game schedules
// This is more accurate than date-based calculation
export function getCurrentWeekFromGames(gameDates: Date[]): number {
  if (gameDates.length === 0) {
    return getCurrentWeekNumber() // Fallback to date-based calculation
  }
  
  const now = new Date()
  const sortedDates = gameDates.sort((a, b) => a.getTime() - b.getTime())
  
  // Find the current week by looking at game dates
  let currentWeek = 1
  let lastWeekStart: Date | null = null
  
  for (const gameDate of sortedDates) {
    const weekStart = getWeekStartDate(gameDate)
    
    // If this is a new week
    if (!lastWeekStart || Math.abs(weekStart.getTime() - lastWeekStart.getTime()) > 7 * 24 * 60 * 60 * 1000) {
      currentWeek++
      lastWeekStart = weekStart
    }
    
    // If we've found a game that's in the future, we're in the previous week
    if (gameDate > now) {
      return Math.max(1, currentWeek - 1)
    }
  }
  
  return currentWeek
}

// Get week start date for a specific week number
export function getWeekStartDateByWeekNumber(weekNumber: number, gameDates: Date[]): Date | null {
  if (gameDates.length === 0) return null
  
  const sortedDates = gameDates.sort((a, b) => a.getTime() - b.getTime())
  let currentWeek = 1
  let lastWeekStart: Date | null = null
  
  for (const gameDate of sortedDates) {
    const weekStart = getWeekStartDate(gameDate)
    
    // If this is a new week
    if (!lastWeekStart || Math.abs(weekStart.getTime() - lastWeekStart.getTime()) > 7 * 24 * 60 * 60 * 1000) {
      if (currentWeek === weekNumber) {
        return weekStart
      }
      currentWeek++
      lastWeekStart = weekStart
    }
  }
  
  return null
}

// Format a game date with day information
export function formatGameDateWithDay(gameDate: Date): string {
  const dayName = getDayNameShort(gameDate)
  const dateStr = gameDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  return `${dayName} ${dateStr}`
}

// Check if a game is a Thursday Night Football game
export function isThursdayNightFootball(gameDate: Date): boolean {
  return isThursday(gameDate) && gameDate.getHours() >= 19 // 7 PM or later
}

// Check if a game is a special game (not Sunday)
export function isSpecialGame(gameDate: Date): boolean {
  return !isSunday(gameDate)
}
