export type UserType = 'registered' | 'active' | 'tester' | 'eliminated'

export interface UserWithType {
  id: string
  email: string
  username: string | null
  is_admin: boolean
  user_type: UserType
  default_week: number
  created_at: string
}

/**
 * Get user type display name for UI
 */
export function getUserTypeDisplay(userType: UserType | 'regular'): string {
  switch (userType) {
    case 'tester':
      return 'Tester'
    case 'active':
      return 'Active Player'
    case 'registered':
      return 'Registered'
    case 'eliminated':
      return 'Eliminated'
    case 'regular':
      return 'Regular Player'
    default:
      return 'Unknown'
  }
}

/**
 * Check if a user is a tester (can buy picks for $0 and test the system)
 */
export async function isUserTester(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/user-type/is-tester?userId=${userId}`)
    if (!response.ok) {
      throw new Error('Failed to check user tester status')
    }
    const data = await response.json()
    return data.isTester
  } catch (error) {
    console.error('Error checking if user is tester:', error)
    return false
  }
}

/**
 * Get the default week a user should see
 * - Testers: Week 3 (preseason week 3)
 * - Everyone else: Week 1 (regular season week 1)
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
    return 1 // Default to regular season week 1
  }
}
