/**
 * Client-side user type utilities
 * These functions call the server-side APIs
 */

export interface User {
  id: string
  email: string
  username?: string
  first_name?: string
  last_name?: string
  is_admin: boolean
  user_type: UserType
  created_at: string
  updated_at: string
}

export type UserType = 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'

/**
 * Get user's default week using the new season detection system
 */
export async function getUserDefaultWeek(userId: string): Promise<number> {
  try {
    const response = await fetch(`/api/user-type/default-week?userId=${userId}`)
    
    if (!response.ok) {
      throw new Error('Failed to get user default week')
    }
    
    const data = await response.json()
    return data.defaultWeek
  } catch (error) {
    console.error('Error getting user default week:', error)
    return 1 // fallback to week 1
  }
}

/**
 * Check if a user is a tester using the new season detection system
 */
export async function isUserTester(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/user-type/is-tester?userId=${userId}`)
    
    if (!response.ok) {
      throw new Error('Failed to check if user is tester')
    }
    
    const data = await response.json()
    return data.isTester
  } catch (error) {
    console.error('Error checking if user is tester:', error)
    return false // fallback to non-tester
  }
}

/**
 * Get user type display name
 */
export function getUserTypeDisplay(userType: UserType): string {
  switch (userType) {
    case 'registered':
      return 'Registered'
    case 'active':
      return 'Active'
    case 'tester':
      return 'Tester'
    case 'eliminated':
      return 'Eliminated'
    case 'pending':
      return 'Pending'
    default:
      return 'Unknown'
  }
}

/**
 * Get user type description
 */
export function getUserTypeDescription(userType: UserType): string {
  switch (userType) {
    case 'registered':
      return 'Has account, but no picks purchased / can see Regular Season games'
    case 'active':
      return 'Has purchased picks available to pick / can see Regular Season games'
    case 'tester':
      return 'A Registered User with ability to purchase picks for $0 / Can see Preseason games (until 8/26/25)'
    case 'eliminated':
      return 'Has purchased tickets but all picks have been Eliminated / can see what Active Users see'
    case 'pending':
      return 'Account is pending approval'
    default:
      return 'Unknown user type'
  }
}
