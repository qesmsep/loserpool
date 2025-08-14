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
 * @param gameTime - The game time (stored in EST in database)
 * @returns Formatted game time in user's local timezone
 */
export function formatGameTime(gameTime: string): string {
  try {
    // Remove the timezone offset and parse as EST
    // The database stores times like '2025-09-14T16:25:00+00:00' but they're actually EST
    const timeWithoutOffset = gameTime.replace(/[+-]\d{2}:\d{2}$/, '')
    const estDateTime = DateTime.fromISO(timeWithoutOffset, { zone: 'America/New_York' })
    
    // Convert to user's local timezone
    const localDateTime = estDateTime.toLocal()
    
    // Debug logging
    console.log('Game time conversion:', {
      original: gameTime,
      timeWithoutOffset,
      est: estDateTime.toISO(),
      local: localDateTime.toISO(),
      userZone: DateTime.local().zoneName,
      formatted: localDateTime.toFormat('EEE, MMM d, h:mm a')
    })
    
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
      const gameTime = DateTime.fromISO(matchup.game_time, { zone: 'utc' })
      const earliestTime = earliest ? DateTime.fromISO(earliest.game_time, { zone: 'utc' }) : null
      
      if (!earliestTime || gameTime < earliestTime) {
        return matchup
      }
      return earliest
    })

    if (earliestGame) {
      // Set deadline to the start of the first game (same time as game start)
      const gameTime = DateTime.fromISO(earliestGame.game_time, { zone: 'utc' })
      const deadline = gameTime.setZone('America/Chicago')
      return deadline.toISO() || ''
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