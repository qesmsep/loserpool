import { createServerSupabaseClient } from './supabase-server'

export interface MatchupUpdateResult {
  processed: number
  updated: number
  created: number
  errors: string[]
  preservedUuids: string[]
}

export class MatchupUpdateServicePreserveUuid {
  private supabase: any // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor() {
    this.supabase = null
  }

  private async initSupabase() {
    if (!this.supabase) {
      this.supabase = await createServerSupabaseClient()
    }
  }

  /**
   * Update matchups while preserving existing UUIDs
   * This method will:
   * 1. Fetch fresh data from external sources
   * 2. Match existing matchups by teams and week/season
   * 3. Update existing records instead of deleting/recreating
   * 4. Only create new records for truly new games
   */
  async updateMatchupsPreserveUuid(): Promise<MatchupUpdateResult> {
    await this.initSupabase()
    
    const startTime = Date.now()
    const errors: string[] = []
    let processed = 0
    let updated = 0
    let created = 0
    const preservedUuids: string[] = []

    try {
      console.log('Starting matchup update with UUID preservation...')

      // Get all existing matchups from database
      const { data: existingMatchups, error: fetchError } = await this.supabase
        .from('matchups')
        .select('*')
        .order('get_season_order(season)', { ascending: true })

      if (fetchError) {
        throw new Error(`Database fetch error: ${fetchError.message}`)
      }

      console.log(`Found ${existingMatchups?.length || 0} existing matchups`)

      // Fetch fresh data from external sources
      const freshData = await this.fetchFreshMatchupData()
      console.log(`Fetched ${freshData.length} fresh matchup records`)

      // Process each fresh data record
      for (const freshMatchup of freshData) {
        processed++
        
        try {
          // Try to find matching existing matchup
          const existingMatchup = this.findMatchingMatchup(existingMatchups, freshMatchup)
          
          if (existingMatchup) {
            // Update existing matchup
            const updateResult = await this.updateExistingMatchup(existingMatchup, freshMatchup)
            if (updateResult.success) {
              updated++
              preservedUuids.push(existingMatchup.id)
              console.log(`Updated existing matchup: ${freshMatchup.away_team} @ ${freshMatchup.home_team} (UUID: ${existingMatchup.id})`)
            } else {
              errors.push(`Failed to update matchup ${existingMatchup.id}: ${updateResult.error}`)
            }
          } else {
            // Create new matchup
            const createResult = await this.createNewMatchup(freshMatchup)
            if (createResult.success) {
              created++
              console.log(`Created new matchup: ${freshMatchup.away_team} @ ${freshMatchup.home_team} (UUID: ${createResult.uuid})`)
            } else {
              errors.push(`Failed to create new matchup: ${createResult.error}`)
            }
          }

        } catch (error) {
          const errorMsg = `Error processing matchup ${freshMatchup.away_team} @ ${freshMatchup.home_team}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      const executionTime = Date.now() - startTime
      console.log(`Matchup update completed in ${executionTime}ms: ${processed} processed, ${updated} updated, ${created} created, ${errors.length} errors`)

      return { 
        processed, 
        updated, 
        created, 
        errors, 
        preservedUuids 
      }

    } catch (error) {
      const errorMsg = `Fatal error in updateMatchupsPreserveUuid: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(errorMsg)
      throw error
    }
  }

  /**
   * Find matching existing matchup based on teams and season/week
   */
  private findMatchingMatchup(existingMatchups: any[], freshMatchup: any): any | null { // eslint-disable-line @typescript-eslint/no-explicit-any
    return existingMatchups.find(existing => {
      // Match by teams (case-insensitive)
      const teamsMatch = (
        existing.away_team.toLowerCase() === freshMatchup.away_team.toLowerCase() &&
        existing.home_team.toLowerCase() === freshMatchup.home_team.toLowerCase()
      ) || (
        existing.away_team.toLowerCase() === freshMatchup.home_team.toLowerCase() &&
        existing.home_team.toLowerCase() === freshMatchup.away_team.toLowerCase()
      )

      // Match by season if available, otherwise by week
      const seasonMatch = existing.season === freshMatchup.season || 
                         existing.week === freshMatchup.week

      return teamsMatch && seasonMatch
    }) || null
  }

  /**
   * Update existing matchup with fresh data
   */
  private async updateExistingMatchup(existingMatchup: any, freshData: any): Promise<{ success: boolean, error?: string }> { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // Prepare update data (only update fields that should change)
      const updateData: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
        game_time: freshData.game_time,
        status: freshData.status,
        away_score: freshData.away_score,
        home_score: freshData.home_score,
        venue: freshData.venue,
        away_spread: freshData.away_spread,
        home_spread: freshData.home_spread,
        updated_at: new Date().toISOString()
      }

      // Only update season if it's different and the fresh data has a valid season
      if (freshData.season && existingMatchup.season !== freshData.season) {
        updateData.season = freshData.season
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      const { error } = await this.supabase
        .from('matchups')
        .update(updateData)
        .eq('id', existingMatchup.id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Create new matchup
   */
  private async createNewMatchup(freshData: any): Promise<{ success: boolean, uuid?: string, error?: string }> { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const insertData = {
        week: freshData.week,
        season: freshData.season,
        away_team: freshData.away_team,
        home_team: freshData.home_team,
        game_time: freshData.game_time,
        status: freshData.status || 'scheduled',
        away_score: freshData.away_score,
        home_score: freshData.home_score,
        venue: freshData.venue,
        away_spread: freshData.away_spread,
        home_spread: freshData.home_spread
      }

      const { data, error } = await this.supabase
        .from('matchups')
        .insert(insertData)
        .select('id')
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, uuid: data.id }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Fetch fresh matchup data from external sources
   * This should integrate with your existing data fetching logic
   */
  private async fetchFreshMatchupData(): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // Import and use your existing data fetching services
      const { MatchupDataService } = await import('./matchup-data-service')
      const matchupService = new MatchupDataService()
      
      // This should return the raw data from your external sources
      // You may need to modify this based on your actual data fetching logic
      const nflSchedule = await matchupService.fetchNFLSchedule()
      
      // Convert to your internal format
      const convertedData = nflSchedule.games?.map((game: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        // Convert game data to your internal format
        // This should match the format expected by your existing code
        return {
          week: game.week?.number || 1,
          season: this.determineSeason(game.week?.number || 1),
          away_team: game.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')?.team?.name || '', // eslint-disable-line @typescript-eslint/no-explicit-any
          home_team: game.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')?.team?.name || '', // eslint-disable-line @typescript-eslint/no-explicit-any
          game_time: game.competitions?.[0]?.date || new Date().toISOString(),
          status: game.competitions?.[0]?.status?.type?.state || 'scheduled',
          away_score: parseInt(game.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')?.score || '0'), // eslint-disable-line @typescript-eslint/no-explicit-any
          home_score: parseInt(game.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')?.score || '0'), // eslint-disable-line @typescript-eslint/no-explicit-any
          venue: game.competitions?.[0]?.venue?.fullName || '',
          away_spread: 0,
          home_spread: 0
        }
      }) || []

      return convertedData

    } catch (error) {
      console.error('Error fetching fresh matchup data:', error)
      return []
    }
  }

  /**
   * Determine season based on week number
   */
  private determineSeason(week: number): string {
    if (week <= 3) {
      return `PRE${week - 1}` // PRE0, PRE1, PRE2
    } else if (week <= 21) {
      return `REG${week - 3}` // REG1 through REG18
    } else if (week <= 24) {
      return `POST${week - 21}` // POST1 through POST4
    } else {
      return `REG${week}`
    }
  }
}
