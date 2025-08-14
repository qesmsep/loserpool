import { createServiceRoleClient } from './supabase-server'
import { NFLScheduleScraper } from './nfl-schedule-scraper'

export class MatchupUpdateService {
  // Update matchups for ALL weeks (preseason, regular season, postseason)
  async updateAllMatchups(): Promise<{ total_games: number; weeks_updated: number; errors: string[] }> {
    const errors: string[] = []
    let totalGames = 0
    let weeksUpdated = 0

    try {
      console.log('Starting comprehensive matchup update for all weeks...')

      // Get the current year from admin settings (default to 2025 for 2025-2026 season)
      const supabase = createServiceRoleClient()
      const { data: yearSetting } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'current_season_year')
        .single()
      
      const currentYear = yearSetting?.value || '2025'
      console.log(`Using year: ${currentYear} for ${currentYear}-${parseInt(currentYear) + 1} season`)

      // Ensure the current_season_year setting exists
      if (!yearSetting) {
        await supabase
          .from('global_settings')
          .upsert({ key: 'current_season_year', value: '2025' })
        console.log('Created current_season_year setting with default value 2025')
      }

      // Define all 25 weeks to scrape with exact NFL.com URLs
      const weeksToScrape: Array<{ week: number; seasonType: 'PRE' | 'REG' | 'POST'; url: string }> = [
        // Preseason weeks (3 weeks)
        { week: 1, seasonType: 'PRE', url: `https://www.nfl.com/schedules/${currentYear}/PRE1/` },
        { week: 2, seasonType: 'PRE', url: `https://www.nfl.com/schedules/${currentYear}/PRE2/` },
        { week: 3, seasonType: 'PRE', url: `https://www.nfl.com/schedules/${currentYear}/PRE3/` },
        
        // Regular season weeks (18 weeks)
        { week: 1, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG1/` },
        { week: 2, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG2/` },
        { week: 3, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG3/` },
        { week: 4, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG4/` },
        { week: 5, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG5/` },
        { week: 6, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG6/` },
        { week: 7, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG7/` },
        { week: 8, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG8/` },
        { week: 9, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG9/` },
        { week: 10, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG10/` },
        { week: 11, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG11/` },
        { week: 12, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG12/` },
        { week: 13, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG13/` },
        { week: 14, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG14/` },
        { week: 15, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG15/` },
        { week: 16, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG16/` },
        { week: 17, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG17/` },
        { week: 18, seasonType: 'REG', url: `https://www.nfl.com/schedules/${currentYear}/REG18/` },
        
        // Postseason weeks (4 weeks)
        { week: 1, seasonType: 'POST', url: `https://www.nfl.com/schedules/${currentYear}/POST1/` },
        { week: 2, seasonType: 'POST', url: `https://www.nfl.com/schedules/${currentYear}/POST2/` },
        { week: 3, seasonType: 'POST', url: `https://www.nfl.com/schedules/${currentYear}/POST3/` },
        { week: 4, seasonType: 'POST', url: `https://www.nfl.com/schedules/${currentYear}/POST4/` } // Super Bowl
      ]

      console.log(`Scraping ${weeksToScrape.length} weeks for ${currentYear}-${parseInt(currentYear) + 1} season`)

      // Process weeks in parallel with concurrency control
      const CONCURRENCY_LIMIT = 5 // Process 5 weeks simultaneously to avoid overwhelming NFL.com servers
      const results: Array<{ success: boolean; week: string; games: number; error?: string }> = []

      // Process weeks in batches
      for (let i = 0; i < weeksToScrape.length; i += CONCURRENCY_LIMIT) {
        const batch = weeksToScrape.slice(i, i + CONCURRENCY_LIMIT)
        console.log(`Processing batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}: ${batch.map(w => `${w.seasonType}${w.week}`).join(', ')}`)

        const batchPromises = batch.map(async (weekInfo) => {
          try {
            console.log(`=== SCRAPING ${weekInfo.seasonType}${weekInfo.week} from ${weekInfo.url} ===`)
            const scraper = new NFLScheduleScraper()
            const schedule = await scraper.scrapeWeekSchedule(weekInfo.week, weekInfo.seasonType)
            
            console.log(`Schedule result for ${weekInfo.seasonType}${weekInfo.week}:`, {
              week_number: schedule.week_number,
              season_type: schedule.season_type,
              games_count: schedule.games?.length || 0,
              has_games: schedule.games && schedule.games.length > 0
            })
            
            if (schedule.games && schedule.games.length > 0) {
              console.log(`Found ${schedule.games.length} games for ${weekInfo.seasonType}${weekInfo.week} - attempting database update...`)
              await this.updateMatchupsForWeek(schedule)
              console.log(`✅ SUCCESS: Updated ${schedule.games.length} games for ${weekInfo.seasonType}${weekInfo.week}`)
              return { success: true, week: `${weekInfo.seasonType}${weekInfo.week}`, games: schedule.games.length }
            } else {
              console.log(`⚠️ No games found for ${weekInfo.seasonType}${weekInfo.week} (likely not scheduled yet)`)
              return { success: true, week: `${weekInfo.seasonType}${weekInfo.week}`, games: 0 }
            }
          } catch (error) {
            const errorMsg = `❌ Error updating ${weekInfo.seasonType}${weekInfo.week}: ${error instanceof Error ? error.message : 'Unknown error'}`
            console.error(errorMsg)
            console.error('Full error details:', error)
            return { success: false, week: `${weekInfo.seasonType}${weekInfo.week}`, games: 0, error: errorMsg }
          }
        })

        // Wait for current batch to complete
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)

        // Add a delay between batches to be respectful to NFL.com servers
        if (i + CONCURRENCY_LIMIT < weeksToScrape.length) {
          console.log('Waiting 8 seconds before next batch...')
          await new Promise(resolve => setTimeout(resolve, 8000))
        }
      }

      // Process results
      for (const result of results) {
        if (result.success) {
          totalGames += result.games
          if (result.games > 0) {
            weeksUpdated++
          }
        } else {
          errors.push(result.error || 'Unknown error')
        }
      }

    } catch (error) {
      const errorMsg = `Error in comprehensive update process: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(errorMsg)
    }

    console.log(`Comprehensive update completed: ${totalGames} total games across ${weeksUpdated} weeks`)
    return {
      total_games: totalGames,
      weeks_updated: weeksUpdated,
      errors: errors
    }
  }

  // Update matchups for a specific week
  async updateMatchupsForWeek(schedule: any): Promise<void> {
    try {
      const supabase = createServiceRoleClient()
      const weekNumber = schedule.week_number.toString()

      console.log(`Starting update for week ${weekNumber} (season: ${schedule.season_type}${weekNumber}) with ${schedule.games.length} games`)

      // Delete existing matchups for this season (to avoid unique constraint violations)
      const season = `${schedule.season_type}${weekNumber}`
      const { error: deleteError } = await supabase
        .from('matchups')
        .delete()
        .eq('season', season)

      if (deleteError) {
        console.error(`Error deleting existing matchups for season ${season}:`, deleteError)
        throw deleteError
      }

      console.log(`Deleted existing matchups for season ${season}`)

      // Insert new matchups
      const matchupsToInsert = schedule.games.map((game: any) => 
        NFLScheduleScraper.convertToMatchupFormat(game, schedule.week_number, schedule.season_type)
      )

      console.log(`Prepared ${matchupsToInsert.length} matchups to insert`)
      console.log('DEBUG: First matchup data:', JSON.stringify(matchupsToInsert[0], null, 2))

      if (matchupsToInsert.length > 0) {
        console.log('DEBUG: Attempting to insert matchups...')
        const { data: insertData, error: insertError } = await supabase
          .from('matchups')
          .insert(matchupsToInsert)
          .select()

        if (insertError) {
          console.error(`Error inserting matchups for week ${weekNumber}:`, insertError)
          console.error('DEBUG: Insert error details:', JSON.stringify(insertError, null, 2))
          throw insertError
        }

        console.log(`Inserted ${matchupsToInsert.length} matchups for week ${weekNumber}`)
        console.log('DEBUG: Insert result data:', JSON.stringify(insertData, null, 2))
      }
    } catch (error) {
      console.error(`Error in updateMatchupsForWeek for week ${schedule.week_number}:`, error)
      throw error
    }
  }

  // Get current week matchups from database
  async getCurrentWeekMatchups(): Promise<any[]> {
    const supabase = createServiceRoleClient()
    
    try {
      // Get current week from database instead of scraping NFL website
      const { data: weekSetting } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'current_week')
        .single()

      const weekNumber = weekSetting?.value || '1'
      console.log(`Getting current week matchups for week ${weekNumber} from database`)

      // Determine current season type based on week
      let currentSeason = 'REG'
      if (parseInt(weekNumber) <= 4) {
        currentSeason = 'PRE'
      } else if (parseInt(weekNumber) > 21) {
        currentSeason = 'POST'
      }

      const { data, error } = await supabase
        .from('matchups')
        .select('*')
        .eq('week', weekNumber)
        .order('game_time')

      if (error) {
        console.error('Error fetching current week matchups:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error getting current week matchups:', error)
      return []
    }
  }

  // Get next week matchups from database
  async getNextWeekMatchups(): Promise<any[]> {
    const supabase = createServiceRoleClient()
    
    try {
      // Get current week from database and calculate next week
      const { data: weekSetting } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'current_week')
        .single()

      const currentWeekNumber = parseInt(weekSetting?.value || '1')
      const nextWeekNumber = (currentWeekNumber + 1).toString()
      
      console.log(`Getting next week matchups for week ${nextWeekNumber} from database`)

      // Determine next week season type based on week
      let nextSeason = 'REG'
      if (parseInt(nextWeekNumber) <= 4) {
        nextSeason = 'PRE'
      } else if (parseInt(nextWeekNumber) > 21) {
        nextSeason = 'POST'
      }

      const { data, error } = await supabase
        .from('matchups')
        .select('*')
        .eq('week', nextWeekNumber)
        .order('game_time')

      if (error) {
        console.error('Error fetching next week matchups:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error getting next week matchups:', error)
      return []
    }
  }

  // Get current week display string
  async getCurrentWeekDisplay(): Promise<string> {
    try {
      const supabase = createServiceRoleClient()
      const { data: weekSetting } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'current_week')
        .single()

      const weekNumber = parseInt(weekSetting?.value || '1')
      
      // Determine season type for display
      let seasonType = 'Regular Season'
      if (weekNumber <= 4) {
        seasonType = 'Preseason'
      } else if (weekNumber > 21) {
        seasonType = 'Postseason'
      }
      
      return `${seasonType} Week ${weekNumber}`
    } catch (error) {
      console.error('Error getting current week display:', error)
      return 'Unknown Week'
    }
  }

  // Get next week display string
  async getNextWeekDisplay(): Promise<string> {
    try {
      const supabase = createServiceRoleClient()
      const { data: weekSetting } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'current_week')
        .single()

      const currentWeekNumber = parseInt(weekSetting?.value || '1')
      const nextWeekNumber = currentWeekNumber + 1
      
      // Determine next week season type for display
      let seasonType = 'Regular Season'
      if (nextWeekNumber <= 4) {
        seasonType = 'Preseason'
      } else if (nextWeekNumber > 21) {
        seasonType = 'Postseason'
      }
      
      return `${seasonType} Week ${nextWeekNumber}`
    } catch (error) {
      console.error('Error getting next week display:', error)
      return 'Next Week'
    }
  }
}
