/**
 * Season Detection System
 * 
 * This system determines which season (preseason vs regular season) is currently active
 * based on the current date and game times, rather than just week numbers.
 */

export interface SeasonInfo {
  currentSeason: 'PRE' | 'REG'
  currentWeek: number
  seasonDisplay: string
  isPreseason: boolean
  isRegularSeason: boolean
}

/**
 * Get the current season and week based on the current date
 * This is more reliable than using global settings that could be wrong
 */
export async function getCurrentSeasonInfo(): Promise<SeasonInfo> {
  const now = new Date()
  
  // Get all matchups to determine what's currently active
  const { createServerSupabaseClient } = await import('./supabase-server')
  const supabase = await createServerSupabaseClient()
  
  const { data: matchups } = await supabase
    .from('matchups')
    .select('week, season, game_time, status')
    .order('game_time', { ascending: true })

  if (!matchups || matchups.length === 0) {
    // Fallback to global settings if no matchups found
    return getFallbackSeasonInfo()
  }

  // Find the most recent completed game and the next upcoming game
  const nowISO = now.toISOString()
  
  const completedGames = matchups.filter(m => 
    m.game_time < nowISO && m.status === 'final'
  )
  
  const upcomingGames = matchups.filter(m => 
    m.game_time > nowISO && m.status === 'scheduled'
  )

  // If we have upcoming games, use the next game's season
  if (upcomingGames.length > 0) {
    const nextGame = upcomingGames[0]
    return {
      currentSeason: nextGame.season.startsWith('PRE') ? 'PRE' : 'REG',
      currentWeek: nextGame.week,
      seasonDisplay: nextGame.season,
      isPreseason: nextGame.season.startsWith('PRE'),
      isRegularSeason: nextGame.season.startsWith('REG')
    }
  }

  // If no upcoming games but we have completed games, use the most recent
  if (completedGames.length > 0) {
    const lastGame = completedGames[completedGames.length - 1]
    return {
      currentSeason: lastGame.season.startsWith('PRE') ? 'PRE' : 'REG',
      currentWeek: lastGame.week,
      seasonDisplay: lastGame.season,
      isPreseason: lastGame.season.startsWith('PRE'),
      isRegularSeason: lastGame.season.startsWith('REG')
    }
  }

  // Fallback
  return getFallbackSeasonInfo()
}

/**
 * Fallback to global settings if season detection fails
 */
async function getFallbackSeasonInfo(): Promise<SeasonInfo> {
  const { createServerSupabaseClient } = await import('./supabase-server')
  const supabase = await createServerSupabaseClient()
  
  const { data: currentWeekSetting } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'current_week')
    .single()

  const currentWeek = currentWeekSetting ? parseInt(currentWeekSetting.value) : 1
  
  // Determine season based on week number (fallback logic)
  let currentSeason: 'PRE' | 'REG'
  let seasonDisplay: string
  
  if (currentWeek <= 3) {
    currentSeason = 'PRE'
    seasonDisplay = `PRE${currentWeek}`
  } else {
    currentSeason = 'REG'
    seasonDisplay = `REG${currentWeek}`
  }

  return {
    currentSeason,
    currentWeek,
    seasonDisplay,
    isPreseason: currentSeason === 'PRE',
    isRegularSeason: currentSeason === 'REG'
  }
}

/**
 * Get the appropriate season filter for a user based on their type and current season
 */
export async function getUserSeasonFilter(userId: string): Promise<string> {
  const { isUserTester } = await import('./user-types')
  const seasonInfo = await getCurrentSeasonInfo()
  
  const isTester = await isUserTester(userId)
  
  if (isTester) {
    // Testers see preseason games if we're in preseason
    if (seasonInfo.isPreseason) {
      return seasonInfo.seasonDisplay
    } else {
      // If we're in regular season, testers see current regular season week
      return seasonInfo.seasonDisplay
    }
  } else {
    // Non-testers always see regular season games
    if (seasonInfo.isPreseason) {
      // If we're in preseason but user is not a tester, show regular season week 1
      return 'REG1'
    } else {
      // Show current regular season week
      return seasonInfo.seasonDisplay
    }
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
