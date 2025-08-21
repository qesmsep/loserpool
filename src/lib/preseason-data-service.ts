// Preseason Data Service
// Provides current preseason week data based on date

interface PreseasonGame {
  id: string
  away_team: string
  home_team: string
  game_time: string
  day: string
  status: string
  venue?: string
  network?: string
}

interface PreseasonSchedule {
  current_week: string
  games: PreseasonGame[]
  last_updated: string
}

export class PreseasonDataService {
  // Get current preseason week based on date
  private getCurrentPreseasonWeek(): number {
    const now = new Date()
    const preseasonStart = new Date('2025-08-07T00:00:00')
    const daysSinceStart = Math.floor((now.getTime() - preseasonStart.getTime()) / (24 * 60 * 60 * 1000))
    
    // Based on NFL.com schedule
    if (daysSinceStart < 6) return 1      // Aug 7-12: Preseason Week 1
    if (daysSinceStart < 13) return 2     // Aug 13-19: Preseason Week 2  
    if (daysSinceStart < 20) return 3     // Aug 20-26: Preseason Week 3
    return 4                              // Aug 27+: Preseason Week 4
  }

  // Get current preseason week schedule from NFL.com
  async getCurrentWeekSchedule(): Promise<PreseasonSchedule> {
    try {
      // Use enhanced NFL scraper to get real-time data
      const { enhancedNFLScraperService } = await import('@/lib/nfl-scraper-enhanced')
      const scrapedSchedule = await enhancedNFLScraperService.getCurrentWeekSchedule()
      
      // Convert scraped data to our format
      const games: PreseasonGame[] = scrapedSchedule.games.map(game => ({
        id: game.id,
        away_team: game.away_team,
        home_team: game.home_team,
        game_time: game.game_time,
        day: game.day,
        status: game.status,
        venue: game.venue,
        network: game.network
      }))
      
      return {
        current_week: scrapedSchedule.current_week,
        games: games,
        last_updated: scrapedSchedule.last_updated
      }
    } catch (error) {
      console.error('Error getting current week schedule from NFL.com:', error)
      throw new Error(`Failed to fetch current week schedule: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get next week's preseason schedule from NFL.com
  async getNextWeekSchedule(): Promise<PreseasonSchedule> {
    try {
      // Use enhanced NFL scraper to get next week's data
      const { EnhancedNFLScraperService } = await import('@/lib/nfl-scraper-enhanced')
      const scraper = new EnhancedNFLScraperService()
      const scrapedSchedule = await scraper.getNextWeekSchedule()
      
      // Convert scraped data to our format
      const games: PreseasonGame[] = scrapedSchedule.games.map(game => ({
        id: game.id,
        away_team: game.away_team,
        home_team: game.home_team,
        game_time: game.game_time,
        day: game.day,
        status: game.status,
        venue: game.venue,
        network: game.network
      }))
      
      return {
        current_week: scrapedSchedule.current_week,
        games: games,
        last_updated: scrapedSchedule.last_updated
      }
    } catch (error) {
      console.error('Error getting next week schedule from NFL.com:', error)
      throw new Error(`Failed to fetch next week schedule: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Convert preseason game to our internal format
  convertToMatchupFormat(game: PreseasonGame): Record<string, unknown> {
    return {
      away_team: game.away_team,
      home_team: game.home_team,
      game_time: game.game_time,
      status: game.status,
      venue: game.venue,
      data_source: 'preseason-data',
      last_api_update: new Date().toISOString(),
      api_update_count: 1
    }
  }

  // Test the service
  async testService(): Promise<boolean> {
    try {
      const schedule = await this.getCurrentWeekSchedule()
      return schedule.games.length > 0
    } catch (error) {
      console.error('Preseason data service test failed:', error)
      return false
    }
  }
}

// Export a singleton instance
export const preseasonDataService = new PreseasonDataService()
