// Matchup Update Service using SportsData.io
// This service updates matchups in the database using SportsData.io API

import { createClient } from '@supabase/supabase-js'
import { sportsDataService } from '@/lib/sportsdata-service'

interface UpdateResult {
  success: boolean
  gamesUpdated: number
  gamesAdded: number
  gamesSkipped: number
  errors: string[]
  details: {
    week: number
    season: number
    timestamp: string
  }
}

export class MatchupUpdateServiceSportsData {
  private supabase: any

  constructor() {
    this.supabase = null
  }

  private async getSupabase() {
    if (!this.supabase) {
      // Use service role key to bypass RLS for admin operations
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      
      this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    }
    return this.supabase
  }

  // Update matchups for a specific week
  async updateWeekMatchups(season: number | string, week: number, seasonType?: string): Promise<UpdateResult> {
    const result: UpdateResult = {
      success: false,
      gamesUpdated: 0,
      gamesAdded: 0,
      gamesSkipped: 0,
      errors: [],
      details: {
        week,
        season,
        timestamp: new Date().toISOString()
      }
    }

    try {
      console.log(`Updating matchups for ${season} Week ${week} using SportsData.io...`)
      
      const supabase = await this.getSupabase()
      
      // Get games from SportsData.io
      const games = await sportsDataService.getGames(season, week)
      console.log(`Retrieved ${games.length} games from SportsData.io for Week ${week}`)

      if (games.length === 0) {
        result.errors.push(`No games found for ${season} Week ${week}`)
        return result
      }

      // Determine season format based on week or provided seasonType
      let seasonFormat: string
      if (seasonType) {
        seasonFormat = seasonType
      } else if (week <= 4) {
        seasonFormat = `PRE${week}`
      } else if (week <= 21) {
        seasonFormat = `REG${week - 4}`
      } else {
        seasonFormat = `POST${week - 21}`
      }

      console.log(`Using season format: ${seasonFormat}`)

      // Process each game
      for (const game of games) {
        try {
          const matchupData = sportsDataService.convertGameToMatchup(game)
          
          // Check if matchup already exists
          const { data: existingMatchup } = await supabase
            .from('matchups')
            .select('id')
            .eq('week', week)
            .eq('season', seasonFormat)
            .eq('away_team', matchupData.away_team)
            .eq('home_team', matchupData.home_team)
            .single()

          if (existingMatchup) {
            // Update existing matchup
            const { error: updateError } = await supabase
              .from('matchups')
              .update({
                game_time: matchupData.game_time,
                status: matchupData.status,
                away_score: matchupData.away_score,
                home_score: matchupData.home_score,
                away_spread: matchupData.away_spread,
                home_spread: matchupData.home_spread,
                over_under: matchupData.over_under,
                data_source: 'sportsdata.io',
                last_api_update: new Date().toISOString()
              })
              .eq('id', existingMatchup.id)

            if (updateError) {
              result.errors.push(`Failed to update matchup ${existingMatchup.id}: ${updateError.message}`)
            } else {
              result.gamesUpdated++
              console.log(`Updated matchup: ${matchupData.away_team} @ ${matchupData.home_team}`)
            }
          } else {
            // Insert new matchup
            const { error: insertError } = await supabase
              .from('matchups')
              .insert({
                week: week,
                season: seasonFormat,
                away_team: matchupData.away_team,
                home_team: matchupData.home_team,
                game_time: matchupData.game_time,
                status: matchupData.status,
                away_score: matchupData.away_score,
                home_score: matchupData.home_score,
                away_spread: matchupData.away_spread,
                home_spread: matchupData.home_spread,
                over_under: matchupData.over_under,
                data_source: 'sportsdata.io',
                last_api_update: new Date().toISOString()
              })

            if (insertError) {
              result.errors.push(`Failed to insert matchup ${matchupData.away_team} @ ${matchupData.home_team}: ${insertError.message}`)
            } else {
              result.gamesAdded++
              console.log(`Added new matchup: ${matchupData.away_team} @ ${matchupData.home_team}`)
            }
          }
        } catch (gameError) {
          result.errors.push(`Error processing game ${game.GameKey}: ${gameError instanceof Error ? gameError.message : 'Unknown error'}`)
          result.gamesSkipped++
        }
      }

      result.success = result.errors.length === 0
      console.log(`Week ${week} update complete: ${result.gamesUpdated} updated, ${result.gamesAdded} added, ${result.gamesSkipped} skipped`)

    } catch (error) {
      result.errors.push(`Service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('Matchup update service error:', error)
    }

    return result
  }

  // Update current week matchups
  async updateCurrentWeekMatchups(season: number): Promise<UpdateResult> {
    try {
      const currentWeek = await sportsDataService.getCurrentWeek(season)
      return await this.updateWeekMatchups(season, currentWeek)
    } catch (error) {
      return {
        success: false,
        gamesUpdated: 0,
        gamesAdded: 0,
        gamesSkipped: 0,
        errors: [`Failed to get current week: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details: {
          week: 0,
          season,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  // Update next week matchups
  async updateNextWeekMatchups(season: number): Promise<UpdateResult> {
    try {
      const currentWeek = await sportsDataService.getCurrentWeek(season)
      const nextWeek = currentWeek + 1
      return await this.updateWeekMatchups(season, nextWeek)
    } catch (error) {
      return {
        success: false,
        gamesUpdated: 0,
        gamesAdded: 0,
        gamesSkipped: 0,
        errors: [`Failed to get next week: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details: {
          week: 0,
          season,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  // Update multiple weeks
  async updateMultipleWeeks(season: number, weeks: number[]): Promise<UpdateResult[]> {
    const results: UpdateResult[] = []
    
    for (const week of weeks) {
      console.log(`Updating Week ${week}...`)
      const result = await this.updateWeekMatchups(season, week)
      results.push(result)
      
      // Add a small delay between requests to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return results
  }

  // Update entire season schedule
  async updateSeasonSchedule(season: number): Promise<UpdateResult[]> {
    try {
      console.log(`Updating entire season schedule for ${season}...`)
      
      // Get the full season schedule
      const schedule = await sportsDataService.getSeasonSchedule(season)
      
      // Group games by week
      const gamesByWeek = new Map<number, any[]>()
      schedule.forEach(game => {
        if (!gamesByWeek.has(game.Week)) {
          gamesByWeek.set(game.Week, [])
        }
        gamesByWeek.get(game.Week)!.push(game)
      })
      
      // Update each week
      const weeks = Array.from(gamesByWeek.keys()).sort((a, b) => a - b)
      return await this.updateMultipleWeeks(season, weeks)
      
    } catch (error) {
      console.error('Error updating season schedule:', error)
      return [{
        success: false,
        gamesUpdated: 0,
        gamesAdded: 0,
        gamesSkipped: 0,
        errors: [`Failed to update season schedule: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details: {
          week: 0,
          season,
          timestamp: new Date().toISOString()
        }
      }]
    }
  }

  // Sync current week with database
  async syncCurrentWeek(season: number): Promise<{ success: boolean; currentWeek: number; error?: string }> {
    try {
      const supabase = await this.getSupabase()
      
      // Get current week from SportsData.io
      const sportsDataWeek = await sportsDataService.getCurrentWeek(season)
      
      // Update global settings
      const { error } = await supabase
        .from('global_settings')
        .upsert({
          key: 'current_week',
          value: sportsDataWeek.toString()
        }, {
          onConflict: 'key'
        })

      if (error) {
        return {
          success: false,
          currentWeek: sportsDataWeek,
          error: `Failed to update current week in database: ${error.message}`
        }
      }

      console.log(`Synced current week: ${sportsDataWeek}`)
      return {
        success: true,
        currentWeek: sportsDataWeek
      }
      
    } catch (error) {
      return {
        success: false,
        currentWeek: 0,
        error: `Failed to sync current week: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Test the service
  async testService(): Promise<{ success: boolean; details: any }> {
    try {
      // Test SportsData.io connection
      const connectionTest = await sportsDataService.testConnection()
      if (!connectionTest) {
        return {
          success: false,
          details: { error: 'SportsData.io connection failed' }
        }
      }

      // Test database connection
      const supabase = await this.getSupabase()
      const { error: dbError } = await supabase
        .from('global_settings')
        .select('key')
        .limit(1)

      if (dbError) {
        return {
          success: false,
          details: { error: `Database connection failed: ${dbError.message}` }
        }
      }

      // Test getting current week
      const currentWeek = await sportsDataService.getCurrentWeek(2024)
      
      return {
        success: true,
        details: {
          sportsDataConnection: true,
          databaseConnection: true,
          currentWeek
        }
      }
      
    } catch (error) {
      return {
        success: false,
        details: { error: `Service test failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
      }
    }
  }
}

// Export a singleton instance
export const matchupUpdateServiceSportsData = new MatchupUpdateServiceSportsData()
