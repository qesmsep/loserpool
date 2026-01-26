import { createServerSupabaseClient } from '@/lib/supabase-server'

// ESPN API interfaces
export interface ESPNGame {
  id: string
  name: string
  shortName: string
  season: {
    year: number
    type: number
  }
  week: {
    number: number
  }
  competitions: Array<{
    id: string
    date: string
    status: {
      clock: number
      displayClock: string
      period: number
      type: {
        id: string
        name: string
        state: string
        description: string
        detail: string
        shortDetail: string
      }
    }
    competitors: Array<{
      id: string
      homeAway: string
      team: {
        id: string
        name: string
        abbreviation: string
      }
      score: string
    }>
    venue: {
      id: string
      fullName: string
    }
    broadcasts?: Array<{
      market: string
      names: string[]
    }>
  }>
}

export interface ESPNSchedule {
  events: ESPNGame[]
}

// Matchup update interface
export interface MatchupUpdate {
  status: string
  venue?: string
  dataSource: string
  lastApiUpdate: Date
}

export class MatchupDataService {
  private supabase: any

  constructor() {
    this.supabase = null
  }

  private async initSupabase() {
    if (!this.supabase) {
      this.supabase = await createServerSupabaseClient()
    }
  }

  // Get current week from global settings
  async getCurrentWeek(): Promise<number> {
    await this.initSupabase()
    
    const { data: weekSetting, error } = await this.supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_week')
      .single()

    if (error || !weekSetting) {
      throw new Error('Could not determine current week')
    }

    return parseInt(weekSetting.value)
  }

  // Get current week display string
  async getCurrentWeekDisplay(): Promise<string> {
    const currentWeek = await this.getCurrentWeek()
    return `Week ${currentWeek}`
  }

  // Update current week matchups using ESPN API
  async updateCurrentWeekMatchups(): Promise<{ gamesFound: number, gamesUpdated: number }> {
    await this.initSupabase()
    
    const startTime = Date.now()
    let gamesFound = 0
    let gamesUpdated = 0

    try {
      // Get current week
      const currentWeek = await this.getCurrentWeek()
      console.log(`Updating current week (${currentWeek}) matchups...`)
      
      // Get ESPN API data
      const { espnService } = await import('@/lib/espn-service')
      const espnGames = await espnService.getNFLSchedule(2024, currentWeek, 'REG')
      gamesFound = espnGames.length
      
      // Get existing matchups from database for current week
      const { data: existingMatchups, error: fetchError } = await this.supabase
        .from('matchups')
        .select('*')
        .eq('week', currentWeek)

      if (fetchError) {
        throw new Error(`Database fetch error: ${fetchError.message}`)
      }

      // Process each ESPN game
      for (const espnGame of espnGames) {
        try {
          // Convert ESPN game to our format
          const gameData = espnService.convertToMatchupFormat(espnGame)
          
          if (!gameData) {
            console.log(`Could not convert ESPN game: ${espnGame.id}`)
            continue
          }

          // Find matching matchup in database
          const existingMatchup = existingMatchups?.find((m: Record<string, unknown>) =>
            m.away_team === gameData.away_team && m.home_team === gameData.home_team
          )

          if (!existingMatchup) {
            console.log(`No existing matchup found for ${gameData.away_team} @ ${gameData.home_team}`)
            continue
          }

          // Check if data has changed
          const hasChanges = this.hasDataChanged(existingMatchup, gameData)
          
          if (!hasChanges) {
            console.log(`No changes detected for ${gameData.away_team} @ ${gameData.home_team}`)
            continue
          }

          // Prepare update data
          const updateData: Partial<MatchupUpdate> = {
            status: gameData.status as string,
            venue: gameData.venue as string,
            dataSource: gameData.data_source as string || 'espn',
            lastApiUpdate: new Date()
          }

          // Update the matchup in database
          const { error: updateError } = await this.supabase
            .from('matchups')
            .update({
              ...updateData,
              api_update_count: (existingMatchup.api_update_count || 0) + 1
            })
            .eq('id', existingMatchup.id)

          if (updateError) {
            console.error(`Update error for ${existingMatchup.id}: ${updateError.message}`)
          } else {
            gamesUpdated++
            console.log(`Updated matchup: ${gameData.away_team} @ ${gameData.home_team}`)
          }

        } catch (error) {
          console.error(`Error processing ESPN game ${espnGame.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      const executionTime = Date.now() - startTime
      console.log(`Current week update completed in ${executionTime}ms: ${gamesFound} games found, ${gamesUpdated} updated`)

      return { gamesFound, gamesUpdated }

    } catch (error) {
      console.error('Error updating current week matchups:', error)
      throw error
    }
  }

  // Update next week matchups using ESPN API
  async updateNextWeekMatchups(): Promise<{ gamesFound: number, gamesUpdated: number }> {
    await this.initSupabase()
    
    const startTime = Date.now()
    let gamesFound = 0
    let gamesUpdated = 0

    try {
      // Get next week (current week + 1)
      const currentWeek = await this.getCurrentWeek()
      const nextWeek = currentWeek + 1
      console.log(`Updating next week (${nextWeek}) matchups...`)
      
      // Get ESPN API data for next week
      const { espnService } = await import('@/lib/espn-service')
      const espnGames = await espnService.getNFLSchedule(2024, nextWeek, 'REG')
      gamesFound = espnGames.length
      
      // Get existing matchups from database for next week
      const { data: existingMatchups, error: fetchError } = await this.supabase
        .from('matchups')
        .select('*')
        .eq('week', nextWeek)

      if (fetchError) {
        throw new Error(`Database fetch error: ${fetchError.message}`)
      }

      // Process each ESPN game
      for (const espnGame of espnGames) {
        try {
          // Convert ESPN game to our format
          const gameData = espnService.convertToMatchupFormat(espnGame)
          
          if (!gameData) {
            console.log(`Could not convert ESPN game: ${espnGame.id}`)
            continue
          }

          // Find matching matchup in database
          const existingMatchup = existingMatchups?.find((m: Record<string, unknown>) =>
            m.away_team === gameData.away_team && m.home_team === gameData.home_team
          )

          if (!existingMatchup) {
            console.log(`No existing matchup found for ${gameData.away_team} @ ${gameData.home_team}`)
            continue
          }

          // Check if data has changed
          const hasChanges = this.hasDataChanged(existingMatchup, gameData)
          
          if (!hasChanges) {
            console.log(`No changes detected for ${gameData.away_team} @ ${gameData.home_team}`)
            continue
          }

          // Prepare update data
          const updateData: Partial<MatchupUpdate> = {
            status: gameData.status as string,
            venue: gameData.venue as string,
            dataSource: gameData.data_source as string || 'espn',
            lastApiUpdate: new Date()
          }

          // Update the matchup in database
          const { error: updateError } = await this.supabase
            .from('matchups')
            .update({
              ...updateData,
              api_update_count: (existingMatchup.api_update_count || 0) + 1
            })
            .eq('id', existingMatchup.id)

          if (updateError) {
            console.error(`Update error for ${existingMatchup.id}: ${updateError.message}`)
          } else {
            gamesUpdated++
            console.log(`Updated matchup: ${gameData.away_team} @ ${gameData.home_team}`)
          }

        } catch (error) {
          console.error(`Error processing ESPN game ${espnGame.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      const executionTime = Date.now() - startTime
      console.log(`Next week update completed in ${executionTime}ms: ${gamesFound} games found, ${gamesUpdated} updated`)

      return { gamesFound, gamesUpdated }

    } catch (error) {
      console.error('Error updating next week matchups:', error)
      throw error
    }
  }

  // Fetch and create matchups for current week if they don't exist
  async fetchAndCreateCurrentWeekMatchups(): Promise<{ gamesFound: number, gamesCreated: number, gamesUpdated: number }> {
    await this.initSupabase()
    
    const startTime = Date.now()
    let gamesFound = 0
    let gamesCreated = 0
    let gamesUpdated = 0

    try {
      // Use season detection to get current week/season/year
      const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
      const seasonInfo = await getCurrentSeasonInfo()
      const currentWeek = seasonInfo.currentWeek
      const seasonType = seasonInfo.isPreseason ? 'PRE' : (seasonInfo.isPostseason ? 'POST' : 'REG')
      const seasonYear = seasonInfo.seasonYear
      const seasonDisplay = seasonInfo.seasonDisplay // e.g., 'REG2', 'POST1'
      
      console.log(`Fetching and creating matchups for ${seasonDisplay} (week ${currentWeek}, year ${seasonYear})...`)
      
      // Get ESPN API data
      const { espnService } = await import('@/lib/espn-service')
      const espnGames = await espnService.getNFLSchedule(seasonYear, currentWeek, seasonType)
      gamesFound = espnGames.length
      
      if (gamesFound === 0) {
        console.log(`No games found from ESPN API for ${seasonDisplay}`)
        return { gamesFound: 0, gamesCreated: 0, gamesUpdated: 0 }
      }
      
      // Get existing matchups from database for current season
      const { data: existingMatchups, error: fetchError } = await this.supabase
        .from('matchups')
        .select('*')
        .eq('season', seasonDisplay)

      if (fetchError) {
        throw new Error(`Database fetch error: ${fetchError.message}`)
      }

      const isPlaceholderTeam = (team: string | null | undefined): boolean => {
        if (!team) return true
        const normalized = team.trim().toUpperCase()
        if (!normalized) return true

        const placeholders = new Set([
          'TBD',
          'TBA',
          'N/A',
          'UNKNOWN',
          'AFC',
          'NFC'
        ])

        if (placeholders.has(normalized)) {
          return true
        }

        if (normalized.includes('CHAMP') && (normalized.includes('AFC') || normalized.includes('NFC'))) {
          return true
        }

        if (normalized.includes('WINNER') || normalized.includes('LOSER')) {
          return true
        }

        return false
      }

      const findFallbackMatchup = (gameTime: string): Record<string, unknown> | undefined => {
        if (!existingMatchups || existingMatchups.length === 0) {
          return undefined
        }

        const gameTimeMs = new Date(gameTime).getTime()
        const timeMatch = existingMatchups.find((m: Record<string, unknown>) => {
          if (!m.game_time) return false
          const matchupTimeMs = new Date(m.game_time as string).getTime()
          const diffHours = Math.abs(gameTimeMs - matchupTimeMs) / (60 * 60 * 1000)
          return diffHours <= 36
        })

        if (timeMatch) {
          return timeMatch
        }

        if (existingMatchups.length === 1) {
          return existingMatchups[0]
        }

        return existingMatchups.find((m: Record<string, unknown>) => {
          const away = m.away_team as string | null | undefined
          const home = m.home_team as string | null | undefined
          return isPlaceholderTeam(away) || isPlaceholderTeam(home)
        })
      }

      // For POST4 (Super Bowl), if ESPN API returns placeholders, scrape the schedule page
      const getSuperBowlTeamsFromScraper = async (): Promise<{ awayTeam: string | null, homeTeam: string | null }> => {
        if (seasonDisplay !== 'POST4') {
          return { awayTeam: null, homeTeam: null }
        }

        try {
          const { espnScheduleScraper } = await import('@/lib/espn-scraper')
          const scrapedGames = await espnScheduleScraper.scrapeSchedule()
          
          // Find Super Bowl game (usually the last game or has "Super Bowl" in the name)
          const superBowlGame = scrapedGames.find(g => 
            g.awayTeam && g.homeTeam && 
            !isPlaceholderTeam(g.awayTeam) && !isPlaceholderTeam(g.homeTeam) &&
            (g.season === 'POST' || scrapedGames.length === 1)
          )

          if (superBowlGame && superBowlGame.awayTeam && superBowlGame.homeTeam) {
            console.log(`Found Super Bowl teams from scraper: ${superBowlGame.awayTeam} @ ${superBowlGame.homeTeam}`)
            return { awayTeam: superBowlGame.awayTeam, homeTeam: superBowlGame.homeTeam }
          }
        } catch (error) {
          console.error('Error scraping Super Bowl teams from schedule page:', error)
        }

        return { awayTeam: null, homeTeam: null }
      }

      const superBowlTeams = await getSuperBowlTeamsFromScraper()

      // Process each ESPN game
      for (const espnGame of espnGames) {
        try {
          // Convert ESPN game to our format
          const gameData = espnService.convertToMatchupFormat(espnGame)
          
          if (!gameData) {
            console.log(`Could not convert ESPN game: ${espnGame.id}`)
            continue
          }

          // For POST4, if ESPN returned placeholders, use derived teams
          let finalAwayTeam = gameData.away_team as string
          let finalHomeTeam = gameData.home_team as string
          let finalGameTime = gameData.game_time as string
          let finalVenue = gameData.venue as string | null
          
          if (seasonDisplay === 'POST4' && superBowlTeams.awayTeam && superBowlTeams.homeTeam) {
            const espnHasPlaceholders = isPlaceholderTeam(gameData.away_team as string | null | undefined) || isPlaceholderTeam(gameData.home_team as string | null | undefined)
            if (espnHasPlaceholders) {
              finalAwayTeam = superBowlTeams.awayTeam
              finalHomeTeam = superBowlTeams.homeTeam
              console.log(`Using derived Super Bowl teams: ${finalAwayTeam} @ ${finalHomeTeam}`)
            }
          }

          // Override bad ESPN data for Super Bowl (POST4)
          if (seasonDisplay === 'POST4') {
            // Super Bowl is always first Sunday in February
            // For 2026: February 8, 2026 at 6:30 PM ET = 11:30 PM UTC
            const correctSuperBowlDate = '2026-02-08T23:30:00Z'
            const gameDate = new Date(finalGameTime)
            const correctDate = new Date(correctSuperBowlDate)
            
            // If ESPN date is more than 2 days off, use correct date
            const daysDiff = Math.abs((gameDate.getTime() - correctDate.getTime()) / (1000 * 60 * 60 * 24))
            if (daysDiff > 2) {
              finalGameTime = correctSuperBowlDate
              console.log(`Overriding bad Super Bowl date from ESPN: ${gameData.game_time} → ${finalGameTime}`)
            }
            
            // Override obviously wrong venues (like "Moscone Center")
            const badVenues = ['Moscone Center', 'TBD', 'TBA']
            if (finalVenue && badVenues.some(bad => finalVenue!.includes(bad))) {
              // Use a reasonable default - actual venue will be updated when known
              finalVenue = 'TBD'
              console.log(`Overriding bad Super Bowl venue from ESPN: ${gameData.venue} → ${finalVenue}`)
            }
          }

          // Find matching matchup in database
          let existingMatchup = existingMatchups?.find((m: Record<string, unknown>) =>
            m.away_team === finalAwayTeam && m.home_team === finalHomeTeam
          )

          if (!existingMatchup) {
            existingMatchup = findFallbackMatchup(gameData.game_time as string)
          }

          if (!existingMatchup) {
            // Create new matchup
            const insertData = {
              week: currentWeek,
              season: seasonDisplay,
              away_team: finalAwayTeam,
              home_team: finalHomeTeam,
              game_time: finalGameTime,
              status: (gameData.status as string) || 'scheduled',
              away_score: gameData.away_score as number | null,
              home_score: gameData.home_score as number | null,
              venue: finalVenue,
              away_spread: gameData.away_spread as number | null,
              home_spread: gameData.home_spread as number | null
            }

            const { error: insertError } = await this.supabase
              .from('matchups')
              .insert(insertData)

            if (insertError) {
              console.error(`Error creating matchup ${finalAwayTeam} @ ${finalHomeTeam}: ${insertError.message}`)
            } else {
              gamesCreated++
              console.log(`Created new matchup: ${finalAwayTeam} @ ${finalHomeTeam}`)
            }
          } else {
            // Update existing matchup
            const existingAway = existingMatchup.away_team as string | null | undefined
            const existingHome = existingMatchup.home_team as string | null | undefined
            const newAway = finalAwayTeam
            const newHome = finalHomeTeam
            const existingHasPlaceholder = isPlaceholderTeam(existingAway) || isPlaceholderTeam(existingHome)
            const newTeamsAreReal = !isPlaceholderTeam(newAway) && !isPlaceholderTeam(newHome)
            
            const hasChanges = this.hasDataChanged(existingMatchup, gameData) || (existingHasPlaceholder && newTeamsAreReal)
            
            if (!hasChanges) {
              console.log(`No changes detected for ${finalAwayTeam} @ ${finalHomeTeam}`)
              continue
            }

            // Prepare update data
            const updateData: Record<string, unknown> = {
              game_time: finalGameTime,
              status: gameData.status as string,
              venue: finalVenue,
              away_score: gameData.away_score,
              home_score: gameData.home_score,
              away_spread: gameData.away_spread,
              home_spread: gameData.home_spread
            }

            if (existingHasPlaceholder && newTeamsAreReal) {
              updateData.away_team = newAway
              updateData.home_team = newHome
            }

            // Update the matchup in database
            const { error: updateError } = await this.supabase
              .from('matchups')
              .update(updateData)
              .eq('id', existingMatchup.id)

            if (updateError) {
              console.error(`Update error for ${existingMatchup.id}: ${updateError.message}`)
            } else {
              gamesUpdated++
              console.log(`Updated matchup: ${finalAwayTeam} @ ${finalHomeTeam}`)
            }
          }

        } catch (error) {
          console.error(`Error processing ESPN game ${espnGame.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      const executionTime = Date.now() - startTime
      console.log(`Fetch and create completed in ${executionTime}ms: ${gamesFound} games found, ${gamesCreated} created, ${gamesUpdated} updated`)

      return { gamesFound, gamesCreated, gamesUpdated }

    } catch (error) {
      console.error('Error fetching and creating current week matchups:', error)
      throw error
    }
  }

  // Helper method to check if data has changed
  private hasDataChanged(existingMatchup: Record<string, unknown>, newData: Record<string, unknown>): boolean {
    // Compare key fields that might change
    const fieldsToCompare = [
      'status',
      'venue',
      'game_time',
      'away_score',
      'home_score'
    ]

    for (const field of fieldsToCompare) {
      if (existingMatchup[field] !== newData[field]) {
        return true
      }
    }

    return false
  }
}

// Export a singleton instance
export const matchupDataService = new MatchupDataService()
