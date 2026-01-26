/**
 * Season Detection System
 * 
 * This system determines which week of the NFL season we're currently in
 * based on the actual date and available games, then displays those games.
 * 
 * This system is SEASON-AGNOSTIC and will work for any NFL season automatically.
 */

import { createServerSupabaseClient } from './supabase-server'

export interface SeasonInfo {
  currentSeason: 'PRE' | 'REG' | 'POST'
  currentWeek: number
  seasonDisplay: string
  isPreseason: boolean
  isRegularSeason: boolean
  isPostseason: boolean
  preseasonCutoff: Date
  seasonYear: number
}

/**
 * Get the current NFL week based on the actual date and available games
 * This determines the REAL current week dynamically
 */
export async function getCurrentSeasonInfo(): Promise<SeasonInfo> {
  const supabase = await createServerSupabaseClient()
  
  const now = new Date()
  console.log('🔍 Season Detection - Current date:', now.toISOString())
  
  // Get all available games to determine the current week
  const { data: allMatchups } = await supabase
    .from('matchups')
    .select('season, game_time, status')
    .order('game_time', { ascending: true })
  
  if (!allMatchups || allMatchups.length === 0) {
    // No games available, use current year and default preseason cutoff
    const currentYear = new Date().getFullYear()
    const defaultPreseasonCutoff = new Date(`${currentYear}-08-26`)
    
    console.log('🔍 Season Detection - No games available, using default cutoff:', defaultPreseasonCutoff.toISOString())
    
      return {
        currentSeason: 'REG',
        currentWeek: 1,
        seasonDisplay: 'REG1',
        isPreseason: false,
        isRegularSeason: true,
        isPostseason: false,
        preseasonCutoff: defaultPreseasonCutoff,
        seasonYear: currentYear
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
  
  console.log('🔍 Season Detection - Season analysis:', {
    earliestGame: earliestGameDate.toISOString(),
    latestGame: latestGameDate.toISOString(),
    determinedSeasonYear: seasonYear
  })
  
  // Separate preseason, regular season, and postseason games
  const preseasonGames = allMatchups.filter(m => m.season?.startsWith('PRE'))
  const regularSeasonGames = allMatchups.filter(m => m.season?.startsWith('REG'))
  const postseasonGames = allMatchups.filter(m => m.season?.startsWith('POST'))
  
  // Determine preseason cutoff based on available games
  let preseasonCutoff: Date
  
  if (preseasonGames.length > 0 && regularSeasonGames.length > 0) {
    // We have both preseason and regular season games
    const earliestRegularSeasonGame = new Date(Math.min(...regularSeasonGames.map(m => new Date(m.game_time).getTime())))
    preseasonCutoff = new Date(earliestRegularSeasonGame.getTime() - (7 * 24 * 60 * 60 * 1000)) // 1 week before
    
    console.log('🔍 Season Detection - Preseason cutoff calculated:', {
      earliestRegularSeasonGame: earliestRegularSeasonGame.toISOString(),
      calculatedPreseasonCutoff: preseasonCutoff.toISOString()
    })
  } else if (preseasonGames.length > 0) {
    // Only preseason games available
    const latestPreseasonGame = new Date(Math.max(...preseasonGames.map(m => new Date(m.game_time).getTime())))
    preseasonCutoff = new Date(latestPreseasonGame.getTime() + (7 * 24 * 60 * 60 * 1000)) // 1 week after
    
    console.log('🔍 Season Detection - Only preseason games, using default cutoff:', preseasonCutoff.toISOString())
  } else {
    // Only regular season games or no games
    preseasonCutoff = new Date(`${seasonYear}-08-26`)
    console.log('🔍 Season Detection - No preseason games, using default cutoff:', preseasonCutoff.toISOString())
  }
  
  const pickPostseasonWeek = (games: typeof postseasonGames): number | null => {
    if (!games || games.length === 0) {
      return null
    }

    const postWeekNumbers = Array.from(new Set(
      games
        .map(m => m.season)
        .filter((s): s is string => typeof s === 'string' && s.startsWith('POST'))
        .map(s => parseInt(s.replace('POST', '')))
    )).sort((a, b) => b - a)

    if (postWeekNumbers.length === 0) {
      return null
    }

    for (const weekNum of postWeekNumbers) {
      const gamesThisWeek = games.filter(m => parseInt((m.season || 'POST0').replace('POST', '')) === weekNum)
      const hasUpcoming = gamesThisWeek.some(g => new Date(g.game_time) > now)
      if (hasUpcoming) {
        return weekNum
      }
    }

    for (const weekNum of postWeekNumbers) {
      const gamesThisWeek = games.filter(m => parseInt((m.season || 'POST0').replace('POST', '')) === weekNum)
      const anyNonFinal = gamesThisWeek.some(g => g.status !== 'final')
      if (anyNonFinal) {
        return weekNum
      }
    }

    return null
  }

  // Determine current week based on today's date
  if (now < preseasonCutoff) {
    // We're in preseason - find the current preseason week
    const currentPreseasonGames = preseasonGames.filter(m => {
      const gameDate = new Date(m.game_time)
      return gameDate >= now && m.status === 'scheduled'
    })
    
    if (currentPreseasonGames.length > 0) {
      // Find the current preseason week based on scheduled games
      const currentWeek = parseInt(currentPreseasonGames[0].season.replace('PRE', ''))
      const seasonDisplay = `PRE${currentWeek}`
      
      console.log('🔍 Season Detection - Preseason mode, current week:', currentWeek, 'seasonDisplay:', seasonDisplay)
      
      return {
        currentSeason: 'PRE',
        currentWeek,
        seasonDisplay,
        isPreseason: true,
        isRegularSeason: false,
        isPostseason: false,
        preseasonCutoff,
        seasonYear
      }
    } else {
      // No current preseason games, find the next available preseason week
      const futurePreseasonGames = preseasonGames.filter(m => {
        const gameDate = new Date(m.game_time)
        return gameDate > now
      })
      
      if (futurePreseasonGames.length > 0) {
        const nextWeek = parseInt(futurePreseasonGames[0].season.replace('PRE', ''))
        const seasonDisplay = `PRE${nextWeek}`
        
        console.log('🔍 Season Detection - Preseason mode, next week:', nextWeek, 'seasonDisplay:', seasonDisplay)
        
        return {
          currentSeason: 'PRE',
          currentWeek: nextWeek,
          seasonDisplay,
          isPreseason: true,
          isRegularSeason: false,
          isPostseason: false,
          preseasonCutoff,
          seasonYear
        }
      } else {
        // No future preseason games, must be regular season
        const { data: currentWeekSetting } = await supabase
          .from('global_settings')
          .select('value')
          .eq('key', 'current_week')
          .single()
        
        const currentWeek = currentWeekSetting ? parseInt(currentWeekSetting.value) : 1
        const seasonDisplay = `REG${currentWeek}`
        
        console.log('🔍 Season Detection - No preseason games available, using regular season:', seasonDisplay)
        
        return {
          currentSeason: 'REG',
          currentWeek,
          seasonDisplay,
          isPreseason: false,
          isRegularSeason: true,
          isPostseason: false,
          preseasonCutoff,
          seasonYear
        }
      }
    }
  } else {
    // We're past preseason - check POST games first (playoffs take priority)
    // If we have POST games with non-final status, show those
    if (postseasonGames.length > 0) {
      const postWeek = pickPostseasonWeek(postseasonGames)
      if (postWeek !== null) {
        const seasonDisplay = `POST${postWeek}`
        console.log('🔍 Season Detection - Postseason mode (upcoming/non-final), current week:', postWeek, 'seasonDisplay:', seasonDisplay)
        return {
          currentSeason: 'POST',
          currentWeek: postWeek,
          seasonDisplay,
          isPreseason: false,
          isRegularSeason: false,
          isPostseason: true,
          preseasonCutoff,
          seasonYear
        }
      }
    }

    // No POST games or all POST games are final - check regular season
    const weekNumbers = Array.from(new Set(
      regularSeasonGames
        .map(m => m.season)
        .filter((s): s is string => typeof s === 'string' && s.startsWith('REG'))
        .map(s => parseInt(s.replace('REG', '')))
    )).sort((a, b) => a - b)

    for (const weekNum of weekNumbers) {
      const gamesThisWeek = regularSeasonGames.filter(m => parseInt((m.season || 'REG0').replace('REG', '')) === weekNum)
      // If ANY game this week is not final, this is the current week
      const anyNonFinal = gamesThisWeek.some(g => g.status !== 'final')
      if (anyNonFinal) {
        const seasonDisplay = `REG${weekNum}`
        console.log('🔍 Season Detection - Regular season mode (non-final present), current week:', weekNum, 'seasonDisplay:', seasonDisplay)
        return {
          currentSeason: 'REG',
          currentWeek: weekNum,
          seasonDisplay,
          isPreseason: false,
          isRegularSeason: true,
          isPostseason: false,
          preseasonCutoff,
          seasonYear
        }
      }
    }

    // All games in all discovered weeks are final; check for postseason games
    if (weekNumbers.length > 0) {
      // Check if we have postseason games
      if (postseasonGames.length > 0) {
        const postWeek = pickPostseasonWeek(postseasonGames)
        if (postWeek !== null) {
          const seasonDisplay = `POST${postWeek}`
          console.log('🔍 Season Detection - Postseason mode (upcoming/non-final), current week:', postWeek, 'seasonDisplay:', seasonDisplay)
          return {
            currentSeason: 'POST',
            currentWeek: postWeek,
            seasonDisplay,
            isPreseason: false,
            isRegularSeason: false,
            isPostseason: true,
            preseasonCutoff,
            seasonYear
          }
        }

        const postWeekNumbers = Array.from(new Set(
          postseasonGames
            .map(m => m.season)
            .filter((s): s is string => typeof s === 'string' && s.startsWith('POST'))
            .map(s => parseInt(s.replace('POST', '')))
        ))

        // All postseason weeks are final, use last postseason week
        if (postWeekNumbers.length > 0) {
          const lastPostWeek = Math.max(...postWeekNumbers)
          const seasonDisplay = `POST${lastPostWeek}`
          console.log('🔍 Season Detection - All postseason weeks final, using last postseason week:', lastPostWeek)
          return {
            currentSeason: 'POST',
            currentWeek: lastPostWeek,
            seasonDisplay,
            isPreseason: false,
            isRegularSeason: false,
            isPostseason: true,
            preseasonCutoff,
            seasonYear
          }
        }
      }

      // No postseason games or all final, fall back to last regular week
      const lastWeek = Math.max(...weekNumbers)
      const seasonDisplay = `REG${lastWeek}`
      console.log('🔍 Season Detection - All weeks final, using last regular week:', lastWeek)
      return {
        currentSeason: 'REG',
        currentWeek: lastWeek,
        seasonDisplay,
        isPreseason: false,
        isRegularSeason: true,
        isPostseason: false,
        preseasonCutoff,
        seasonYear
      }
    }

    // Check for postseason games if no regular season games
    if (postseasonGames.length > 0) {
      const postWeek = pickPostseasonWeek(postseasonGames)
      if (postWeek !== null) {
        const seasonDisplay = `POST${postWeek}`
        console.log('🔍 Season Detection - Postseason mode (upcoming/non-final), current week:', postWeek)
        return {
          currentSeason: 'POST',
          currentWeek: postWeek,
          seasonDisplay,
          isPreseason: false,
          isRegularSeason: false,
          isPostseason: true,
          preseasonCutoff,
          seasonYear
        }
      }

      const postWeekNumbers = Array.from(new Set(
        postseasonGames
          .map(m => m.season)
          .filter((s): s is string => typeof s === 'string' && s.startsWith('POST'))
          .map(s => parseInt(s.replace('POST', '')))
      ))

      // All postseason weeks final, use last one
      if (postWeekNumbers.length > 0) {
        const lastPostWeek = Math.max(...postWeekNumbers)
        const seasonDisplay = `POST${lastPostWeek}`
        console.log('🔍 Season Detection - All postseason weeks final, using last:', lastPostWeek)
        return {
          currentSeason: 'POST',
          currentWeek: lastPostWeek,
          seasonDisplay,
          isPreseason: false,
          isRegularSeason: false,
          isPostseason: true,
          preseasonCutoff,
          seasonYear
        }
      }
    }

    // No regular season or postseason games found; use global settings as a final fallback
    const { data: currentWeekSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_week')
      .single()
    const currentWeek = currentWeekSetting ? parseInt(currentWeekSetting.value) : 1
    const seasonDisplay = `REG${currentWeek}`
    console.log('🔍 Season Detection - No games found, using global settings:', seasonDisplay)
    return {
      currentSeason: 'REG',
      currentWeek,
      seasonDisplay,
      isPreseason: false,
      isRegularSeason: true,
      isPostseason: false,
      preseasonCutoff,
      seasonYear
    }
  }
}

/**
 * Get the season filter for a specific user
 * This is the main function that determines what games a user sees
 * 
 * SEASON-AGNOSTIC: Works for any NFL season automatically
 */
export async function getUserSeasonFilter(userId: string): Promise<string> {
  const supabase = await createServerSupabaseClient()
  
  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('user_type, is_admin')
    .eq('id', userId)
    .single()
  
  if (!user) {
    console.log('🔍 getUserSeasonFilter - No user found, fallback to REG1')
    return 'REG1' // fallback
  }
  
  console.log('🔍 getUserSeasonFilter - User:', { id: userId, user_type: user.user_type, is_admin: user.is_admin })
  
  // Check if user is a tester
  const isTester = user.user_type === 'tester' || (user.is_admin && user.user_type !== 'active')
  
  if (isTester) {
    // Testers see preseason games (if available) or current regular season week
    const seasonInfo = await getCurrentSeasonInfo()
    
    if (seasonInfo.isPreseason) {
      // Before preseason cutoff, testers see preseason games
      console.log('🔍 getUserSeasonFilter - Tester in preseason, returning:', seasonInfo.seasonDisplay)
      return seasonInfo.seasonDisplay
    } else {
      // After preseason cutoff, testers see current regular season week
      console.log('🔍 getUserSeasonFilter - Tester after preseason cutoff, returning:', seasonInfo.seasonDisplay)
      return seasonInfo.seasonDisplay
    }
  } else {
    // Non-testers see current regular season week (not always week 1)
    const seasonInfo = await getCurrentSeasonInfo()
    
    if (seasonInfo.isPreseason) {
      // Before preseason cutoff, non-testers see regular season week 1
      console.log('🔍 getUserSeasonFilter - Non-tester in preseason, returning REG1')
      return 'REG1'
    } else {
      // After preseason cutoff, non-testers see current regular season week
      console.log('🔍 getUserSeasonFilter - Non-tester in regular season, returning:', seasonInfo.seasonDisplay)
      return seasonInfo.seasonDisplay
    }
  }
}

/**
 * Get the default week for a user based on current season
 * 
 * SEASON-AGNOSTIC: Works for any NFL season automatically
 */
export async function getUserDefaultWeek(userId: string): Promise<number> {
  const seasonInfo = await getCurrentSeasonInfo()
  const { isUserTester } = await import('./user-types')
  
  const isTester = await isUserTester(userId)
  
  if (isTester) {
    // Testers see current week (preseason or regular season)
    console.log('🔍 getUserDefaultWeek - Tester, returning week:', seasonInfo.currentWeek)
    return seasonInfo.currentWeek
  } else {
    // Non-testers see regular season week
    if (seasonInfo.isPreseason) {
      console.log('🔍 getUserDefaultWeek - Non-tester in preseason, returning week 1')
      return 1 // Regular season week 1
    } else {
      console.log('🔍 getUserDefaultWeek - Non-tester in regular season, returning week:', seasonInfo.currentWeek)
      return seasonInfo.currentWeek
    }
  }
}
