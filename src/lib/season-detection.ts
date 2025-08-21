/**
 * Season Detection System
 * 
 * This system determines which season (preseason vs regular season) is currently active
 * based on the season column in the database, which is much simpler and more reliable.
 */

export interface SeasonInfo {
  currentSeason: 'PRE' | 'REG'
  currentWeek: number
  seasonDisplay: string
  isPreseason: boolean
  isRegularSeason: boolean
}

/**
 * Get the current season and week based on the global settings
 * This is simpler and more reliable than complex time-based logic
 */
export async function getCurrentSeasonInfo(): Promise<SeasonInfo> {
  const { createServerSupabaseClient } = await import('./supabase-server')
  const supabase = await createServerSupabaseClient()
  
  // Get current week from global settings
  const { data: currentWeekSetting } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'current_week')
    .single()
  
  const currentWeek = currentWeekSetting ? parseInt(currentWeekSetting.value) : 1
  
  // Simple logic: if we're in preseason (before 8/26/25), show preseason
  // Otherwise, show regular season
  const preseasonCutoff = new Date('2025-08-26')
  const now = new Date()
  
  if (now < preseasonCutoff) {
    // Preseason
    return {
      currentSeason: 'PRE',
      currentWeek,
      seasonDisplay: `PRE${currentWeek}`,
      isPreseason: true,
      isRegularSeason: false
    }
  } else {
    // Regular Season
    return {
      currentSeason: 'REG',
      currentWeek,
      seasonDisplay: `REG${currentWeek}`,
      isPreseason: false,
      isRegularSeason: true
    }
  }
}

/**
 * Get the season filter for a specific user
 * This is the main function that determines what games a user sees
 */
export async function getUserSeasonFilter(userId: string): Promise<string> {
  const { createServerSupabaseClient } = await import('./supabase-server')
  const supabase = await createServerSupabaseClient()
  
  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('user_type, is_admin')
    .eq('id', userId)
    .single()
  
  if (!user) {
    return 'REG1' // fallback
  }
  
  // Check if user is a tester
  const isTester = user.user_type === 'tester' || (user.is_admin && user.user_type !== 'active')
  
  if (isTester) {
    // Testers see preseason games
    const preseasonCutoff = new Date('2025-08-26')
    const now = new Date()
    
    if (now < preseasonCutoff) {
      // Before 8/26/25, testers see preseason week 3
      return 'PRE3'
    } else {
      // After 8/26/25, testers see current regular season week
      const { data: currentWeekSetting } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'current_week')
        .single()
      
      const currentWeek = currentWeekSetting ? parseInt(currentWeekSetting.value) : 1
      return `REG${currentWeek}`
    }
  } else {
    // Non-testers always see current regular season week
    const { data: currentWeekSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_week')
      .single()
    
    const currentWeek = currentWeekSetting ? parseInt(currentWeekSetting.value) : 1
    return `REG${currentWeek}`
  }
}

/**
 * Get the default week for a user based on current season
 */
export async function getUserDefaultWeek(userId: string): Promise<number> {
  const seasonInfo = await getCurrentSeasonInfo()
  const { isUserTester } = await import('./user-types')
  
  const isTester = await isUserTester(userId)
  
  if (isTester) {
    // Testers see current week (preseason or regular season)
    return seasonInfo.currentWeek
  } else {
    // Non-testers see regular season week
    if (seasonInfo.isPreseason) {
      return 1 // Regular season week 1
    } else {
      return seasonInfo.currentWeek
    }
  }
}
