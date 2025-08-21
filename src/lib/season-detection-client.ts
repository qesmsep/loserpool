/**
 * Client-Side Season Detection
 * 
 * This provides client-side access to season detection functionality
 * by making API calls instead of direct database access.
 */

export interface SeasonInfo {
  currentSeason: 'PRE' | 'REG'
  currentWeek: number
  seasonDisplay: string
  isPreseason: boolean
  isRegularSeason: boolean
  preseasonCutoff: Date
  seasonYear: number
}

/**
 * Get the season filter for a user via API call
 */
export async function getUserSeasonFilter(userId: string): Promise<string> {
  try {
    const response = await fetch(`/api/matchups?userId=${userId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch matchups')
    }
    const data = await response.json()
    return data.seasonFilter || 'REG1' // fallback
  } catch (error) {
    console.error('Error getting user season filter:', error)
    return 'REG1' // fallback
  }
}

/**
 * Get the default week for a user via API call
 */
export async function getUserDefaultWeek(userId: string): Promise<number> {
  try {
    const response = await fetch(`/api/user-type/default-week?userId=${userId}`)
    if (!response.ok) {
      throw new Error('Failed to get user default week')
    }
    const data = await response.json()
    return data.defaultWeek || 1 // fallback
  } catch (error) {
    console.error('Error getting user default week:', error)
    return 1 // fallback
  }
}

/**
 * Get current season info via API call
 */
export async function getCurrentSeasonInfo(userId: string): Promise<SeasonInfo> {
  try {
    const response = await fetch(`/api/current-week-display?userId=${userId}`)
    if (!response.ok) {
      throw new Error('Failed to get current season info')
    }
    const data = await response.json()
    
    return {
      currentSeason: data.season_info?.currentSeason || 'REG',
      currentWeek: data.season_info?.currentWeek || 1,
      seasonDisplay: data.season_info?.seasonDisplay || 'REG1',
      isPreseason: data.season_info?.isPreseason || false,
      isRegularSeason: data.season_info?.isRegularSeason || true,
      preseasonCutoff: new Date(), // This would need to come from the API
      seasonYear: new Date().getFullYear()
    }
  } catch (error) {
    console.error('Error getting current season info:', error)
    return {
      currentSeason: 'REG',
      currentWeek: 1,
      seasonDisplay: 'REG1',
      isPreseason: false,
      isRegularSeason: true,
      preseasonCutoff: new Date(),
      seasonYear: new Date().getFullYear()
    }
  }
}
