import { DateTime } from 'luxon'

/**
 * Converts a CST deadline to the user's local timezone for display
 * @param cstDeadline - The deadline in CST (e.g., "2024-01-15T23:59:00")
 * @returns Formatted deadline in user's local timezone
 */
export function formatDeadlineForUser(cstDeadline: string): string {
  try {
    // Parse the CST deadline
    const cstDateTime = DateTime.fromISO(cstDeadline, { zone: 'America/Chicago' })
    
    // Convert to user's local timezone
    const localDateTime = cstDateTime.toLocal()
    
    // Format for display
    return localDateTime.toFormat('MMM d, h:mm a')
  } catch (error) {
    console.error('Error formatting deadline:', error)
    return 'Invalid deadline'
  }
}

/**
 * Gets the time remaining until deadline in user's local timezone
 * @param cstDeadline - The deadline in CST
 * @returns Formatted time remaining string
 */
export function getTimeRemaining(cstDeadline: string): string {
  try {
    const cstDateTime = DateTime.fromISO(cstDeadline, { zone: 'America/Chicago' })
    const localDateTime = cstDateTime.toLocal()
    const now = DateTime.now()
    
    const diff = localDateTime.diff(now)
    
    if (diff.milliseconds <= 0) {
      return 'EXPIRED'
    }
    
    const days = Math.floor(diff.as('days'))
    const hours = Math.floor(diff.as('hours') % 24)
    const minutes = Math.floor(diff.as('minutes') % 60)
    
    if (days > 0) {
      return `${days}d ${hours}h`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  } catch (error) {
    console.error('Error calculating time remaining:', error)
    return 'Unknown'
  }
}

/**
 * Checks if a deadline has passed
 * @param cstDeadline - The deadline in CST
 * @returns True if deadline has passed
 */
export function isDeadlinePassed(cstDeadline: string): boolean {
  try {
    const cstDateTime = DateTime.fromISO(cstDeadline, { zone: 'America/Chicago' })
    const localDateTime = cstDateTime.toLocal()
    const now = DateTime.now()
    
    return now >= localDateTime
  } catch (error) {
    console.error('Error checking deadline:', error)
    return false
  }
}

/**
 * Debug function to understand timezone conversion
 */
export function debugGameTime(gameTime: string): void {
  try {
    const utcDateTime = DateTime.fromISO(gameTime, { zone: 'utc' })
    const localDateTime = utcDateTime.toLocal()
    const cstDateTime = utcDateTime.setZone('America/Chicago')
    
    console.log('Game time debug:', {
      original: gameTime,
      utc: utcDateTime.toISO(),
      local: localDateTime.toISO(),
      cst: cstDateTime.toISO(),
      userZone: DateTime.local().zoneName,
      localFormatted: localDateTime.toFormat('EEE, MMM d, h:mm a'),
      cstFormatted: cstDateTime.toFormat('EEE, MMM d, h:mm a')
    })
  } catch (error) {
    console.error('Error debugging game time:', error)
  }
}

/**
 * Formats a game time for display in user's local timezone
 * @param gameTime - The game time (stored as UTC in database from ESPN API)
 * @returns Formatted game time in user's local timezone
 */
export function formatGameTime(gameTime: string): string {
  try {
    // ESPN API returns dates in UTC format (e.g., "2026-01-03T21:30Z")
    // Parse as UTC first, then convert to user's local timezone
    let utcDateTime: DateTime
    
    if (gameTime.endsWith('Z')) {
      // UTC format with Z
      utcDateTime = DateTime.fromISO(gameTime, { zone: 'utc' })
    } else if (gameTime.includes('+') || gameTime.includes('-')) {
      // Has timezone offset, parse with it
      utcDateTime = DateTime.fromISO(gameTime, { zone: 'utc' })
    } else {
      // No timezone info, assume UTC
      utcDateTime = DateTime.fromISO(gameTime + 'Z', { zone: 'utc' })
    }
    
    if (!utcDateTime.isValid) {
      console.error('Invalid game time:', gameTime, utcDateTime.invalidReason)
      return 'Invalid time'
    }
    
    // Convert to user's local timezone
    const localDateTime = utcDateTime.toLocal()
    
    return localDateTime.toFormat('EEE, MMM d, h:mm a')
  } catch (error) {
    console.error('Error formatting game time:', error)
    return 'Invalid time'
  }
} 

/**
 * Calculates the picks deadline for the current week based on matchups
 * @param matchups - Array of matchups for the current week
 * @returns ISO string of the deadline in CST
 */
export function calculatePicksDeadline(matchups: Array<{ game_time: string }>): string {
  try {
    if (!matchups || matchups.length === 0) {
      // If no matchups, set deadline to tomorrow morning at 9 AM CST
      const tomorrow = DateTime.now().plus({ days: 1 }).setZone('America/Chicago')
      return tomorrow.set({ hour: 9, minute: 0, second: 0, millisecond: 0 }).toISO() || ''
    }

    // Find the earliest game time for the week
    const earliestGame = matchups.reduce((earliest, matchup) => {
      // Parse game time as UTC (ESPN API format)
      let utcDateTime: DateTime
      if (matchup.game_time.endsWith('Z')) {
        utcDateTime = DateTime.fromISO(matchup.game_time, { zone: 'utc' })
      } else if (matchup.game_time.includes('+') || matchup.game_time.includes('-')) {
        utcDateTime = DateTime.fromISO(matchup.game_time, { zone: 'utc' })
      } else {
        utcDateTime = DateTime.fromISO(matchup.game_time + 'Z', { zone: 'utc' })
      }
      
      if (!utcDateTime.isValid) {
        return earliest || matchup
      }
      
      if (!earliest) {
        return matchup
      }
      
      let earliestUtcDateTime: DateTime
      if (earliest.game_time.endsWith('Z')) {
        earliestUtcDateTime = DateTime.fromISO(earliest.game_time, { zone: 'utc' })
      } else if (earliest.game_time.includes('+') || earliest.game_time.includes('-')) {
        earliestUtcDateTime = DateTime.fromISO(earliest.game_time, { zone: 'utc' })
      } else {
        earliestUtcDateTime = DateTime.fromISO(earliest.game_time + 'Z', { zone: 'utc' })
      }
      
      if (!earliestUtcDateTime.isValid) {
        return matchup
      }
      
      if (utcDateTime < earliestUtcDateTime) {
        return matchup
      }
      return earliest
    })

    if (earliestGame) {
      // Set deadline to the start of the first game (same time as game start)
      let utcDateTime: DateTime
      if (earliestGame.game_time.endsWith('Z')) {
        utcDateTime = DateTime.fromISO(earliestGame.game_time, { zone: 'utc' })
      } else if (earliestGame.game_time.includes('+') || earliestGame.game_time.includes('-')) {
        utcDateTime = DateTime.fromISO(earliestGame.game_time, { zone: 'utc' })
      } else {
        utcDateTime = DateTime.fromISO(earliestGame.game_time + 'Z', { zone: 'utc' })
      }
      
      if (utcDateTime.isValid) {
        // Convert UTC to CST for deadline
        const deadline = utcDateTime.setZone('America/Chicago')
        return deadline.toISO() || ''
      }
    }

    // Fallback: tomorrow morning at 9 AM CST
    const tomorrow = DateTime.now().plus({ days: 1 }).setZone('America/Chicago')
    return tomorrow.set({ hour: 9, minute: 0, second: 0, millisecond: 0 }).toISO() || ''
  } catch (error) {
    console.error('Error calculating picks deadline:', error)
    // Fallback: tomorrow morning at 9 AM CST
    const tomorrow = DateTime.now().plus({ days: 1 }).setZone('America/Chicago')
    return tomorrow.set({ hour: 9, minute: 0, second: 0, millisecond: 0 }).toISO() || ''
  }
} 

/**
 * Gets the detailed time remaining until deadline with days, hours, minutes, and seconds
 * @param cstDeadline - The deadline in CST
 * @returns Object with days, hours, minutes, and seconds remaining
 */
export function getDetailedTimeRemaining(cstDeadline: string): {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
} {
  try {
    const cstDateTime = DateTime.fromISO(cstDeadline, { zone: 'America/Chicago' })
    const localDateTime = cstDateTime.toLocal()
    const now = DateTime.now()
    
    const diff = localDateTime.diff(now)
    
    if (diff.milliseconds <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true
      }
    }
    
    const days = Math.floor(diff.as('days'))
    const hours = Math.floor(diff.as('hours') % 24)
    const minutes = Math.floor(diff.as('minutes') % 60)
    const seconds = Math.floor(diff.as('seconds') % 60)
    
    return {
      days,
      hours,
      minutes,
      seconds,
      isExpired: false
    }
  } catch (error) {
    console.error('Error calculating detailed time remaining:', error)
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true
    }
  }
} 

/**
 * Groups matchups by day of the week for better organization
 * @param matchups - Array of matchups
 * @returns Object with matchups grouped by day
 */
export function groupMatchupsByDay<T extends { game_time: string }>(matchups: T[]): {
  [key: string]: T[]
} {
  const grouped: { [key: string]: T[] } = {}
  
  matchups.forEach(matchup => {
    try {
      // Parse the game time as UTC (ESPN API format)
      let utcDateTime: DateTime
      if (matchup.game_time.endsWith('Z')) {
        utcDateTime = DateTime.fromISO(matchup.game_time, { zone: 'utc' })
      } else if (matchup.game_time.includes('+') || matchup.game_time.includes('-')) {
        utcDateTime = DateTime.fromISO(matchup.game_time, { zone: 'utc' })
      } else {
        utcDateTime = DateTime.fromISO(matchup.game_time + 'Z', { zone: 'utc' })
      }
      
      if (!utcDateTime.isValid) {
        throw new Error('Invalid date')
      }
      
      const localDateTime = utcDateTime.toLocal()
      
      // Get day of week (1 = Monday, 2 = Tuesday, etc.)
      const dayOfWeek = localDateTime.weekday
      
      // Create day labels
      const dayLabels: { [key: number]: string } = {
        1: 'Monday Night Football',
        2: 'Tuesday Games',
        3: 'Wednesday Games', 
        4: 'Thursday Night Football',
        5: 'Friday Games',
        6: 'Saturday Games',
        7: 'Sunday Games'
      }
      
      const dayLabel = dayLabels[dayOfWeek] || 'Other Games'
      
      if (!grouped[dayLabel]) {
        grouped[dayLabel] = []
      }
      
      grouped[dayLabel].push(matchup)
    } catch (error) {
      console.error('Error grouping matchup by day:', error)
      // Fallback to "Other Games" if there's an error
      if (!grouped['Other Games']) {
        grouped['Other Games'] = []
      }
      grouped['Other Games'].push(matchup)
    }
  })
  
  // Sort matchups within each day by game time
  Object.keys(grouped).forEach(day => {
    grouped[day].sort((a, b) => {
      try {
        let timeA: DateTime
        if (a.game_time.endsWith('Z')) {
          timeA = DateTime.fromISO(a.game_time, { zone: 'utc' })
        } else if (a.game_time.includes('+') || a.game_time.includes('-')) {
          timeA = DateTime.fromISO(a.game_time, { zone: 'utc' })
        } else {
          timeA = DateTime.fromISO(a.game_time + 'Z', { zone: 'utc' })
        }
        
        let timeB: DateTime
        if (b.game_time.endsWith('Z')) {
          timeB = DateTime.fromISO(b.game_time, { zone: 'utc' })
        } else if (b.game_time.includes('+') || b.game_time.includes('-')) {
          timeB = DateTime.fromISO(b.game_time, { zone: 'utc' })
        } else {
          timeB = DateTime.fromISO(b.game_time + 'Z', { zone: 'utc' })
        }
        
        if (!timeA.isValid || !timeB.isValid) {
          return 0
        }
        
        return timeA.toMillis() - timeB.toMillis()
      } catch (error) {
        return 0
      }
    })
  })
  
  return grouped
}

/**
 * Gets the display order for days of the week
 * @returns Array of day labels in display order
 */
export function getDayDisplayOrder(): string[] {
  return [
    'Thursday Night Football',
    'Saturday Games', 
    'Sunday Games',
    'Monday Night Football',
    'Tuesday Games',
    'Wednesday Games',
    'Friday Games',
    'Other Games'
  ]
}

/**
 * Sorts matchups chronologically by game time
 * @param matchups - Array of matchups to sort
 * @returns Sorted array of matchups
 */
export function sortMatchupsChronologically<T extends { game_time: string }>(matchups: T[]): T[] {
  return [...matchups].sort((a, b) => {
    try {
      let timeA: DateTime
      if (a.game_time.endsWith('Z')) {
        timeA = DateTime.fromISO(a.game_time, { zone: 'utc' })
      } else if (a.game_time.includes('+') || a.game_time.includes('-')) {
        timeA = DateTime.fromISO(a.game_time, { zone: 'utc' })
      } else {
        timeA = DateTime.fromISO(a.game_time + 'Z', { zone: 'utc' })
      }
      
      let timeB: DateTime
      if (b.game_time.endsWith('Z')) {
        timeB = DateTime.fromISO(b.game_time, { zone: 'utc' })
      } else if (b.game_time.includes('+') || b.game_time.includes('-')) {
        timeB = DateTime.fromISO(b.game_time, { zone: 'utc' })
      } else {
        timeB = DateTime.fromISO(b.game_time + 'Z', { zone: 'utc' })
      }
      
      if (!timeA.isValid || !timeB.isValid) {
        return 0
      }
      
      return timeA.toMillis() - timeB.toMillis()
    } catch (error) {
      return 0
    }
  })
}

/**
 * Gets the week start and end dates for a given array of matchups
 * @param matchups - Array of matchups
 * @returns Object with week start and end dates
 */
export function getWeekDateRange<T extends { game_time: string }>(matchups: T[]): {
  weekStart: string
  weekEnd: string
  weekStartFormatted: string
  weekEndFormatted: string
} {
  if (!matchups || matchups.length === 0) {
    return {
      weekStart: '',
      weekEnd: '',
      weekStartFormatted: '',
      weekEndFormatted: ''
    }
  }

  try {
    // Parse all game times as UTC and find the earliest and latest
    const gameTimes = matchups.map(matchup => {
      let utcDateTime: DateTime
      if (matchup.game_time.endsWith('Z')) {
        utcDateTime = DateTime.fromISO(matchup.game_time, { zone: 'utc' })
      } else if (matchup.game_time.includes('+') || matchup.game_time.includes('-')) {
        utcDateTime = DateTime.fromISO(matchup.game_time, { zone: 'utc' })
      } else {
        utcDateTime = DateTime.fromISO(matchup.game_time + 'Z', { zone: 'utc' })
      }
      return utcDateTime
    }).filter(dt => dt.isValid)

    const earliest = DateTime.min(...gameTimes)
    const latest = DateTime.max(...gameTimes)

    // Check if we have valid dates
    if (!earliest || !latest) {
      return {
        weekStart: '',
        weekEnd: '',
        weekStartFormatted: '',
        weekEndFormatted: ''
      }
    }

    // Get the start of the week (Monday) for the earliest game
    const weekStart = earliest.startOf('week').plus({ days: 1 }) // Monday
    const weekEnd = latest.endOf('week').minus({ days: 1 }) // Sunday

    const weekStartISO = weekStart.toISO()
    const weekEndISO = weekEnd.toISO()

    return {
      weekStart: weekStartISO || '',
      weekEnd: weekEndISO || '',
      weekStartFormatted: weekStart.toFormat('MMM d'),
      weekEndFormatted: weekEnd.toFormat('MMM d, yyyy')
    }
  } catch (error) {
    console.error('Error calculating week date range:', error)
    return {
      weekStart: '',
      weekEnd: '',
      weekStartFormatted: '',
      weekEndFormatted: ''
    }
  }
} 