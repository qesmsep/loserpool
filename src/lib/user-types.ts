import { createServerSupabaseClient } from './supabase-server'

export type UserType = 'registered' | 'active' | 'tester' | 'eliminated' | 'pending'

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
 * Check if a user is a tester (can buy picks for $0 and test the system)
 */
export async function isUserTester(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('user_type, is_admin')
    .eq('id', userId)
    .single()

  // Admins are always testers
  if (user?.is_admin) return true
  
  return user?.user_type === 'tester'
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
 * Get the default week a user should see
 * - Testers: Week 3 (preseason week 3) until 8/26/25, then current week
 * - Everyone else: Current week of regular season (dynamic)
 */
export async function getUserDefaultWeek(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('user_type, is_admin, default_week')
    .eq('id', userId)
    .single()

  // If user has a default_week set, use it
  if (user?.default_week !== null && user?.default_week !== undefined) {
    return user.default_week
  }

  // Check if user is a tester
  const isTester = user?.is_admin || user?.user_type === 'tester'
  
  // Get current week from global settings
  const { data: currentWeekSetting } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'current_week')
    .single()
  
  const currentWeek = currentWeekSetting ? parseInt(currentWeekSetting.value) : 1
  
  if (isTester) {
    // Check if we're past the preseason cutoff date (8/26/25)
    const preseasonCutoff = new Date('2025-08-26')
    const now = new Date()
    
    if (now >= preseasonCutoff) {
      // After 8/26/25, testers see current week like everyone else
      return currentWeek
    } else {
      // Before 8/26/25, testers see preseason week 3
      return 3
    }
  } else {
    // Non-testers always see the current week of regular season
    return currentWeek
  }
}

/**
 * Get the minimum week a user can access
 * - Testers: Can access all weeks (including preseason)
 * - Active/Eliminated/Registered users: Can only access week 1 and beyond (regular season)
 */
export async function getMinimumAccessibleWeek(userId: string): Promise<number> {
  const isTester = await isUserTester(userId)
  return isTester ? 0 : 1 // 0 = preseason, 1 = regular season week 1
}

/**
 * Check if a specific week is accessible to a user
 */
export async function canAccessWeek(userId: string, week: number): Promise<boolean> {
  const minWeek = await getMinimumAccessibleWeek(userId)
  return week >= minWeek
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
      return 'Has account, but no picks purchased / can see Week 1 of Regular season'
    case 'active':
      return 'has purchased picks available to pick / can see Week 1 of Regular Season'
    case 'tester':
      return 'a Registered User with ability to purchase picks for $0 / Can see Week 3 of PreSeason'
    case 'eliminated':
      return 'has purchased tickets but all picks have been Eliminated / can see what Active Users see'
    case 'pending':
      return 'has purchased picks but has not made any selections yet / can see Week 1 of Regular Season'
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
 * Update user type based on current picks status
 * This function should be called when picks are updated to ensure user types are correct
 */
export async function updateUserTypeBasedOnPicks(userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  
  // Get current user type and admin status
  const { data: user } = await supabase
    .from('users')
    .select('user_type, is_admin')
    .eq('id', userId)
    .single()

  // Don't update testers
  if (user?.is_admin || user?.user_type === 'tester') {
    return
  }

  // Check if user has any picks
  const { data: picks } = await supabase
    .from('picks')
    .select('status')
    .eq('user_id', userId)

  // Check if user has completed purchases
  const { data: purchases } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (!picks || picks.length === 0) {
    // No picks - should be 'registered' if no purchases, 'pending' if has purchases
    const newType = purchases && purchases.length > 0 ? 'pending' : 'registered'
    await supabase
      .from('users')
      .update({ user_type: newType })
      .eq('id', userId)
  } else {
    // Has picks - check if any are active
    const hasActivePicks = picks.some(pick => pick.status === 'active')
    
    if (hasActivePicks) {
      // Has active picks - user is active
      await supabase
        .from('users')
        .update({ user_type: 'active' })
        .eq('id', userId)
    } else {
      // Has picks but none are active - user is eliminated
      await supabase
        .from('users')
        .update({ user_type: 'eliminated' })
        .eq('id', userId)
    }
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


