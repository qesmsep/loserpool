/**
 * Dynamic Current Week Calculator
 * 
 * This system determines the current week based on:
 * 1. Current date (preseason vs regular season cutoff)
 * 2. Available games in the database
 * 3. Game times and status
 */

export interface CurrentWeekInfo {
  currentWeek: number
  currentSeason: 'PRE' | 'REG' | 'POST'
  seasonString: string
  isPreseason: boolean
  isRegularSeason: boolean
  isPostseason: boolean
  reason: string
}

/**
 * Calculate the current week dynamically based on date and available games
 */
export async function calculateCurrentWeek(): Promise<CurrentWeekInfo> {
  const { createServerSupabaseClient } = await import('./supabase-server')
  const supabase = await createServerSupabaseClient()
  
  const now = new Date()
  
  // Get all available games to determine the season year and preseason cutoff
  const { data: allMatchups } = await supabase
    .from('matchups')
    .select('season, game_time, status')
    .order('game_time', { ascending: true })
  
  if (!allMatchups || allMatchups.length === 0) {
    // No games available, use current year and default preseason cutoff
    const currentYear = new Date().getFullYear()
    const defaultPreseasonCutoff = new Date(`${currentYear}-08-26`)
    
    console.log('🔍 Current Week Calculator - No games available, using default cutoff:', defaultPreseasonCutoff.toISOString())
    
    return {
      currentWeek: 1,
      currentSeason: 'REG',
      seasonString: 'REG1',
      isPreseason: false,
      isRegularSeason: true,
      isPostseason: false,
      reason: 'No games in database, defaulting to regular season week 1'
    }
  }
  
  // Determine season year from game times
  const gameDates = allMatchups.map(m => new Date(m.game_time))
  const earliestGameDate = new Date(Math.min(...gameDates.map(d => d.getTime())))
  const latestGameDate = new Date(Math.max(...gameDates.map(d => d.getTime())))
  
  // Determine the NFL season year (games typically span from August to February)
  let seasonYear = earliestGameDate.getFullYear()
  if (earliestGameDate.getMonth() >= 8) {
    // Games start in August/September, so this is the season year
    seasonYear = earliestGameDate.getFullYear()
  } else {
    // Games start in January/February, so this is the previous year's season
    seasonYear = earliestGameDate.getFullYear() - 1
  }
  
  // Determine preseason cutoff based on available games
  const preseasonGames = allMatchups.filter(m => m.season?.startsWith('PRE'))
  const regularSeasonGames = allMatchups.filter(m => m.season?.startsWith('REG'))
  
  let preseasonCutoff: Date
  
  if (preseasonGames.length > 0 && regularSeasonGames.length > 0) {
    // We have both preseason and regular season games
    // Find the latest preseason game and earliest regular season game
    const latestPreseasonGame = new Date(Math.max(...preseasonGames.map(m => new Date(m.game_time).getTime())))
    const earliestRegularSeasonGame = new Date(Math.min(...regularSeasonGames.map(m => new Date(m.game_time).getTime())))
    
    // Preseason cutoff is typically 1-2 weeks before the first regular season game
    preseasonCutoff = new Date(earliestRegularSeasonGame.getTime() - (7 * 24 * 60 * 60 * 1000)) // 1 week before
  } else if (preseasonGames.length > 0) {
    // Only preseason games available, use a reasonable default
    const latestPreseasonGame = new Date(Math.max(...preseasonGames.map(m => new Date(m.game_time).getTime())))
    preseasonCutoff = new Date(latestPreseasonGame.getTime() + (7 * 24 * 60 * 60 * 1000)) // 1 week after last preseason game
  } else {
    // Only regular season games or no games, use a reasonable default
    preseasonCutoff = new Date(`${seasonYear}-08-26`)
  }
  
  console.log('🔍 Current Week Calculator - Season analysis:', {
    now: now.toISOString(),
    preseasonCutoff: preseasonCutoff.toISOString(),
    isAfterPreseason: now >= preseasonCutoff,
    seasonYear,
    earliestGame: earliestGameDate.toISOString(),
    latestGame: latestGameDate.toISOString()
  })
  

  
  // Determine current season based on date
  if (now < preseasonCutoff) {
    // We're in preseason
    if (preseasonGames.length > 0) {
      // Find the highest preseason week
      const maxPreseasonWeek = Math.max(...preseasonGames.map(m => parseInt(m.season.replace('PRE', ''))))
      console.log('🔍 Current Week Calculator - Preseason mode, week:', maxPreseasonWeek)
      
      return {
        currentWeek: maxPreseasonWeek,
        currentSeason: 'PRE',
        seasonString: `PRE${maxPreseasonWeek}`,
        isPreseason: true,
        isRegularSeason: false,
        isPostseason: false,
        reason: `Preseason week ${maxPreseasonWeek} (before ${preseasonCutoff.toISOString()})`
      }
    } else {
      // No preseason games, default to regular season week 1
      console.log('🔍 Current Week Calculator - Preseason mode but no PRE games, defaulting to REG1')
      return {
        currentWeek: 1,
        currentSeason: 'REG',
        seasonString: 'REG1',
        isPreseason: false,
        isRegularSeason: true,
        isPostseason: false,
        reason: 'Preseason period but no preseason games available, defaulting to regular season week 1'
      }
    }
  } else {
    // We're in regular season or postseason
    if (regularSeasonGames.length > 0) {
      // Determine the earliest regular-season week that still has any non-final game
      const weekNumbers = Array.from(new Set(
        regularSeasonGames
          .map(m => m.season)
          .filter((s): s is string => typeof s === 'string' && s.startsWith('REG'))
          .map(s => parseInt(s.replace('REG', '')))
      )).sort((a, b) => a - b)

      for (const weekNum of weekNumbers) {
        const gamesThisWeek = regularSeasonGames.filter(m => parseInt((m.season || 'REG0').replace('REG', '')) === weekNum)
        const anyNonFinal = gamesThisWeek.some(g => g.status !== 'final')
        if (anyNonFinal) {
          console.log('🔍 Current Week Calculator - Regular season mode (non-final present), week:', weekNum)
          return {
            currentWeek: weekNum,
            currentSeason: 'REG',
            seasonString: `REG${weekNum}`,
            isPreseason: false,
            isRegularSeason: true,
            isPostseason: false,
            reason: `Regular season week ${weekNum} has non-final games (after ${preseasonCutoff.toISOString()})`
          }
        }
      }

      // All discovered weeks are final; use the last week
      const maxRegularWeek = Math.max(...weekNumbers)
      console.log('🔍 Current Week Calculator - All weeks final, using last week:', maxRegularWeek)
      return {
        currentWeek: maxRegularWeek,
        currentSeason: 'REG',
        seasonString: `REG${maxRegularWeek}`,
        isPreseason: false,
        isRegularSeason: true,
        isPostseason: false,
        reason: `All regular season weeks are final; using last week ${maxRegularWeek}`
      }
    } else {
      // No regular season games, this shouldn't happen but default to week 1
      console.log('🔍 Current Week Calculator - No regular season games, defaulting to REG1')
      return {
        currentWeek: 1,
        currentSeason: 'REG',
        seasonString: 'REG1',
        isPreseason: false,
        isRegularSeason: true,
        isPostseason: false,
        reason: 'After preseason cutoff but no regular season games available, defaulting to week 1'
      }
    }
  }
}

/**
 * Update the global settings with the calculated current week
 */
export async function updateGlobalCurrentWeek(): Promise<CurrentWeekInfo> {
  const { createServerSupabaseClient } = await import('./supabase-server')
  const supabase = await createServerSupabaseClient()
  
  const weekInfo = await calculateCurrentWeek()
  
  // Update global settings
  const { error } = await supabase
    .from('global_settings')
    .upsert({
      key: 'current_week',
      value: weekInfo.currentWeek.toString(),
      updated_at: new Date().toISOString()
    })
  
  if (error) {
    console.error('❌ Error updating global current week:', error)
    throw error
  }
  
  console.log('✅ Updated global current_week to:', weekInfo.currentWeek)
  return weekInfo
}
