/**
 * Converts a user's default week to the corresponding database column name
 * This centralizes the logic for mapping weeks to database columns
 * 
 * @param userDefaultWeek - The user's default week number
 * @returns The database column name for that week
 */
export function getWeekColumnName(userDefaultWeek: number): string {
  // Define the mapping of default weeks to database columns
  // This can be easily modified if the schema changes
  const weekToColumnMap: Record<number, string> = {
    1: 'reg1_team_matchup_id',    // Regular Season Week 1
    2: 'reg2_team_matchup_id',    // Regular Season Week 2  
    3: 'pre3_team_matchup_id',    // Preseason Week 3 (for testers)
    4: 'reg4_team_matchup_id',    // Regular Season Week 4
    5: 'reg5_team_matchup_id',    // Regular Season Week 5
    // ... add more as needed
  }

  // Check if we have a direct mapping
  if (weekToColumnMap[userDefaultWeek]) {
    return weekToColumnMap[userDefaultWeek]
  }

  // Fallback logic for weeks not explicitly mapped
  if (userDefaultWeek <= 0) {
    // Preseason weeks (negative or zero)
    return `pre${Math.abs(userDefaultWeek) + 1}_team_matchup_id`
  } else if (userDefaultWeek <= 18) {
    // Regular season weeks
    return `reg${userDefaultWeek}_team_matchup_id`
  } else {
    // Postseason weeks
    return `post${userDefaultWeek - 18}_team_matchup_id`
  }
}

/**
 * Get the week column name from season detection info
 * This is the new function that works with the season detection system
 * 
 * @param seasonInfo - The season info from getCurrentSeasonInfo()
 * @param isTester - Whether the user is a tester
 * @returns The database column name for that week
 */
export function getWeekColumnNameFromSeasonInfo(seasonInfo: { currentSeason: string, currentWeek: number, isPreseason: boolean }, isTester: boolean): string {
  if (isTester && seasonInfo.isPreseason) {
    // Tester in preseason - use preseason column
    return `pre${seasonInfo.currentWeek}_team_matchup_id`
  } else {
    // Regular season or non-tester - use regular season column
    return `reg${seasonInfo.currentWeek}_team_matchup_id`
  }
}

/**
 * Gets the display name for a week based on the user's default week
 * 
 * @param userDefaultWeek - The user's default week number
 * @returns A human-readable week display name
 */
export function getWeekDisplayName(userDefaultWeek: number): string {
  if (userDefaultWeek <= 0) {
    return `Pre Season : Week ${Math.abs(userDefaultWeek) + 1}`
  } else if (userDefaultWeek <= 18) {
    return `Regular Season : Week ${userDefaultWeek}`
  } else {
    return `Post Season : Week ${userDefaultWeek - 18}`
  }
}

/**
 * Determines the current week based on game dates
 * 
 * @param gameDates - Array of game dates
 * @returns The current week number
 */
export function getCurrentWeekFromGames(gameDates: Date[]): number {
  if (!gameDates || gameDates.length === 0) {
    return 1
  }

  const now = new Date()
  const regularSeasonStart = new Date('2025-09-04T00:00:00') // NFL 2025 regular season start
  
  // If before regular season start, it's preseason
  if (now < regularSeasonStart) {
    const preseasonStart = new Date('2025-08-07T00:00:00')
    const daysSinceStart = Math.floor((now.getTime() - preseasonStart.getTime()) / (24 * 60 * 60 * 1000))
    
    // Calculate preseason week based on NFL schedule
    if (daysSinceStart >= 20) { // Aug 27+ is Week 4
      return 4
    } else if (daysSinceStart >= 13) { // Aug 20+ is Week 3
      return 3
    } else if (daysSinceStart >= 6) { // Aug 13+ is Week 2
      return 2
    } else {
      return 1
    }
  }
  
  // For regular season, find the week based on game dates
  const sortedGameDates = gameDates.sort((a, b) => a.getTime() - b.getTime())
  
  // Find the first game that hasn't happened yet
  const currentGameIndex = sortedGameDates.findIndex(gameDate => gameDate > now)
  
  if (currentGameIndex === -1) {
    // All games have passed, we're in the last week
    return Math.min(18, Math.ceil(sortedGameDates.length / 16)) // Assuming ~16 games per week
  }
  
  // Calculate week based on game index
  const week = Math.ceil((currentGameIndex + 1) / 16) // Assuming ~16 games per week
  return Math.max(1, Math.min(18, week))
}
