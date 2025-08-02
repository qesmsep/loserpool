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
 * Formats a game time for display in user's local timezone
 * @param gameTime - The game time (assumed to be in UTC from database)
 * @returns Formatted game time in user's local timezone
 */
export function formatGameTime(gameTime: string): string {
  try {
    const utcDateTime = DateTime.fromISO(gameTime, { zone: 'utc' })
    const localDateTime = utcDateTime.toLocal()
    
    return localDateTime.toFormat('EEE, MMM d, h:mm a')
  } catch (error) {
    console.error('Error formatting game time:', error)
    return 'Invalid time'
  }
} 