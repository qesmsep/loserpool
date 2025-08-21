/**
 * Server-side user type utilities
 */

import { createServerSupabaseClient } from './supabase-server'

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
 * Check if a user is a tester (can buy picks for $0 and test the system)
 */
export async function isUserTester(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('user_type, is_admin')
    .eq('id', userId)
    .single()

  // Check user_type first - if explicitly set to non-tester, respect that
  if (user?.user_type && user.user_type !== 'tester') {
    return false
  } else if (user?.is_admin) {
    // Admins are testers by default, unless explicitly set to another type
    return true
  } else {
    return user?.user_type === 'tester'
  }
}

/**
 * Check if a user is active (has purchased picks and is still in the pool)
 */
export async function isUserActive(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', userId)
    .single()

  return user?.user_type === 'active'
}

/**
 * Check if a user is registered (has account but no picks purchased)
 */
export async function isUserRegistered(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', userId)
    .single()

  return user?.user_type === 'registered'
}

/**
 * Check if a user is eliminated (all picks have been eliminated)
 */
export async function isUserEliminated(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', userId)
    .single()

  return user?.user_type === 'eliminated'
}

/**
 * Check if a user is pending (has purchased picks but hasn't made selections yet)
 */
export async function isUserPending(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', userId)
    .single()

  return user?.user_type === 'pending'
}

/**
 * Check if a user can access preseason games
 * Only testers can access preseason games
 */
export async function canAccessPreseason(userId: string): Promise<boolean> {
  return await isUserTester(userId)
}

/**
 * Get user type for display purposes
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

/**
 * Check if a user can make purchases
 * Testers can buy picks for $0, active users pay normal price, registered users can buy, pending users can buy, eliminated users cannot buy
 */
export async function canMakePurchase(userId: string): Promise<boolean> {
  const userType = await getUserType(userId)
  return userType === 'active' || userType === 'tester' || userType === 'registered' || userType === 'pending'
}

/**
 * Get the price multiplier for a user
 * Testers pay $0, everyone else pays normal price
 */
export async function getPriceMultiplier(userId: string): Promise<number> {
  const isTester = await isUserTester(userId)
  return isTester ? 0 : 1
}

/**
 * Fix user default week when transitioning from Tester to Active
 * This ensures users see the correct games after user type changes
 */
export async function fixUserDefaultWeek(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('user_type, default_week, is_admin')
    .eq('id', userId)
    .single()

  if (!user) {
    return false
  }

  // If user is active but has default_week = 3 (preseason), clear it
  if (user.user_type === 'active' && user.default_week === 3 && !user.is_admin) {
    const { error } = await supabase
      .from('users')
      .update({ default_week: null })
      .eq('id', userId)

    if (error) {
      console.error('Error fixing user default week:', error)
      return false
    }

    return true
  }

  return false
}



/**
 * Fix all users who have the Tester to Active transition issue
 * This is useful for bulk fixing existing users
 */
export async function fixAllTesterToActiveTransitions(): Promise<{
  totalFixed: number
  errors: string[]
}> {
  const supabase = await createServerSupabaseClient()
  const errors: string[] = []
  let totalFixed = 0

  // Get all active users with default_week = 3
  const { data: affectedUsers, error: fetchError } = await supabase
    .from('users')
    .select('id, email, user_type, default_week')
    .eq('user_type', 'active')
    .eq('default_week', 3)

  if (fetchError) {
    errors.push(`Failed to fetch affected users: ${fetchError.message}`)
    return { totalFixed, errors }
  }

  // Fix each affected user
  for (const user of affectedUsers || []) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ default_week: null })
        .eq('id', user.id)

      if (error) {
        errors.push(`Failed to fix user ${user.email}: ${error.message}`)
      } else {
        totalFixed++
      }
    } catch (error) {
      errors.push(`Error fixing user ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return { totalFixed, errors }
}

/**
 * Get the current user type
 */
export async function getUserType(userId: string): Promise<UserType> {
  const supabase = await createServerSupabaseClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', userId)
    .single()

  return user?.user_type || 'registered'
}

/**
 * Update a user's default week
 */
export async function updateUserDefaultWeek(userId: string, week: number): Promise<void> {
  const supabase = await createServerSupabaseClient()
  
  await supabase
    .from('users')
    .update({ default_week: week })
    .eq('id', userId)
}

/**
 * Update user type based on picks status
 * This function is used to automatically update user types based on their picks
 */
export async function updateUserTypeBasedOnPicks(userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  
  // Get user's picks
  const { data: picks } = await supabase
    .from('picks')
    .select('status')
    .eq('user_id', userId)

  // Get user's completed purchases
  const { data: purchases } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')

  let newType: UserType = 'registered'

  if (!picks || picks.length === 0) {
    // No picks - should be 'registered' if no purchases, 'active' if has purchases
    newType = purchases && purchases.length > 0 ? 'active' : 'registered'
  } else {
    // Has picks - check if any are active
    const hasActivePicks = picks.some(pick => pick.status === 'active')
    
    if (hasActivePicks) {
      // Has active picks - user is active
      newType = 'active'
    } else {
      // Has picks but none are active - user is eliminated
      newType = 'eliminated'
    }
  }

  // Update user type if it changed
  const { data: currentUser } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', userId)
    .single()

  if (currentUser && currentUser.user_type !== newType) {
    await supabase
      .from('users')
      .update({ user_type: newType })
      .eq('id', userId)
  }
}

/**
 * Update user type to pending when purchase is completed but no picks have been made yet
 */
export async function updateUserTypeToPending(userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  
  await supabase
    .from('users')
    .update({ user_type: 'pending' })
    .eq('id', userId)
    .eq('user_type', 'registered')
}

/**
 * Update user type to active when purchase is completed
 */
export async function updateUserTypeToActive(userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  
  await supabase
    .from('users')
    .update({ user_type: 'active' })
    .eq('id', userId)
    .in('user_type', ['registered', 'pending'])
}

/**
 * Update user type to eliminated when all picks are eliminated
 */
export async function updateUserTypeToEliminated(userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  
  await supabase
    .from('users')
    .update({ user_type: 'eliminated' })
    .eq('id', userId)
    .in('user_type', ['active', 'pending'])
}


