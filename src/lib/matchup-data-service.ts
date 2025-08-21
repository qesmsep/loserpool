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
