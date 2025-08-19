import { createServerSupabaseClient } from './supabase-server'

// Types for the data we'll be working with
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
      type: {
        id: string
        name: string
        state: string
      }
    }
    venue: {
      id: string
      fullName: string
      address: {
        city: string
        state: string
      }
    }
    competitors: Array<{
      id: string
      homeAway: 'home' | 'away'
      team: {
        name: string
        abbreviation: string
      }
      score: string
    }>
    odds?: Array<{
      details: string
      overUnder: number
    }>
  }>
}

export interface WeatherData {
  temperature: number
  windSpeed: number
  humidity: number
  description: string
  isDome: boolean
}

export interface OddsData {
  awaySpread: number
  homeSpread: number
  overUnder: number
  lastUpdated: Date
}

export interface MatchupUpdate {
  id: string
  venue?: string
  weatherForecast?: string
  temperature?: number
  windSpeed?: number
  humidity?: number
  isDome?: boolean
  awaySpread?: number
  homeSpread?: number
  overUnder?: number
  oddsLastUpdated?: Date
  status?: string
  awayScore?: number
  homeScore?: number
  winner?: string
  dataSource: string
  lastApiUpdate: Date
}

// Team name mapping for consistency (unused but kept for future reference)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TEAM_NAME_MAPPING: Record<string, string> = {
  'GB': 'Green Bay Packers',
  'CHI': 'Chicago Bears',
  'DAL': 'Dallas Cowboys',
  'NYG': 'New York Giants',
  'PHI': 'Philadelphia Eagles',
  'WAS': 'Washington Commanders',
  'DET': 'Detroit Lions',
  'KC': 'Kansas City Chiefs',
  'CAR': 'Carolina Panthers',
  'ATL': 'Atlanta Falcons',
  'HOU': 'Houston Texans',
  'BAL': 'Baltimore Ravens',
  'CIN': 'Cincinnati Bengals',
  'CLE': 'Cleveland Browns',
  'JAX': 'Jacksonville Jaguars',
  'IND': 'Indianapolis Colts',
  'TB': 'Tampa Bay Buccaneers',
  'MIN': 'Minnesota Vikings',
  'TEN': 'Tennessee Titans',
  'NO': 'New Orleans Saints',
  'SF': 'San Francisco 49ers',
  'PIT': 'Pittsburgh Steelers',
  'ARI': 'Arizona Cardinals',
  'LV': 'Las Vegas Raiders',
  'DEN': 'Denver Broncos',
  'MIA': 'Miami Dolphins',
  'LAC': 'Los Angeles Chargers',
  'LAR': 'Los Angeles Rams',
  'SEA': 'Seattle Seahawks',
  'BUF': 'Buffalo Bills',
  'NYJ': 'New York Jets',
  'NE': 'New England Patriots'
}

// Dome venues that don't need weather data
const DOME_VENUES = [
  'Mercedes-Benz Stadium',
  'NRG Stadium',
  'Lucas Oil Stadium',
  'U.S. Bank Stadium',
  'Caesars Superdome',
  'SoFi Stadium',
  'State Farm Stadium',
  'Allegiant Stadium',
  'Ford Field',
  'AT&T Stadium',
  'MetLife Stadium',
  'Hard Rock Stadium'
]

export class MatchupDataService {
  private supabase: any // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor() {
    // Will be initialized in methods
  }

  private async initSupabase() {
    if (!this.supabase) {
      this.supabase = await createServerSupabaseClient()
    }
  }

  // Fetch current NFL season data using Preseason Data Service (primary), ChatGPT (secondary), or Puppeteer (fallback)
  async fetchNFLSchedule(): Promise<any> {
    try {
      // Try Preseason Data Service first (most reliable for preseason)
      const { preseasonDataService } = await import('@/lib/preseason-data-service')
      return await preseasonDataService.getCurrentWeekSchedule()
    } catch (preseasonError) {
      console.error('Preseason data service failed:', preseasonError)
      
      // Fallback to ChatGPT
      try {
        const { chatgptNFLService } = await import('@/lib/chatgpt-nfl-service')
        return await chatgptNFLService.getCurrentWeekSchedule()
      } catch (chatgptError) {
        console.error('ChatGPT NFL service failed:', chatgptError)
        
        // Final fallback to Puppeteer scraping
        try {
          const { nflScraper } = await import('@/lib/nfl-scraper')
          return await nflScraper.getGamesFromAPI(2025, 3)
        } catch (scraperError) {
          console.error('Puppeteer scraping also failed:', scraperError)
          throw new Error(`Failed to fetch NFL schedule: Preseason error - ${preseasonError instanceof Error ? preseasonError.message : 'Unknown'}, ChatGPT error - ${chatgptError instanceof Error ? chatgptError.message : 'Unknown'}, Scraper error - ${scraperError instanceof Error ? scraperError.message : 'Unknown'}`)
        }
      }
    }
  }

  // Fetch next week's NFL schedule using Preseason Data Service (primary), ChatGPT (secondary), or Puppeteer (fallback)
  async fetchNextWeekNFLSchedule(): Promise<any> {
    try {
      // Try Preseason Data Service first (most reliable for preseason)
      const { preseasonDataService } = await import('@/lib/preseason-data-service')
      return await preseasonDataService.getNextWeekSchedule()
    } catch (preseasonError) {
      console.error('Preseason data service failed for next week:', preseasonError)
      
      // Fallback to ChatGPT
      try {
        const { chatgptNFLService } = await import('@/lib/chatgpt-nfl-service')
        return await chatgptNFLService.getNextWeekSchedule()
      } catch (chatgptError) {
        console.error('ChatGPT NFL service failed for next week:', chatgptError)
        
        // Final fallback to Puppeteer scraping
        try {
          const { nflScraper } = await import('@/lib/nfl-scraper')
          return await nflScraper.getGamesFromAPI(2025, 4)
        } catch (scraperError) {
          console.error('Puppeteer scraping also failed for next week:', scraperError)
          throw new Error(`Failed to fetch next week NFL schedule: Preseason error - ${preseasonError instanceof Error ? preseasonError.message : 'Unknown'}, ChatGPT error - ${chatgptError instanceof Error ? chatgptError.message : 'Unknown'}, Scraper error - ${scraperError instanceof Error ? scraperError.message : 'Unknown'}`)
        }
      }
    }
  }

  // Fetch weather data for a specific location using WeatherStack
  async fetchWeatherData(city: string, state: string): Promise<WeatherData> {
    try {
      const apiKey = process.env.WEATHERSTACK_API_KEY
      
      // WeatherStack API endpoint - supports both with and without API key
      let url: string
      if (apiKey) {
        // With API key (recommended for production)
        url = `http://api.weatherstack.com/current?access_key=${apiKey}&query=${city},${state},US&units=f`
      } else {
        // Without API key (free tier - limited features)
        url = `http://api.weatherstack.com/current?query=${city},${state},US&units=f`
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`WeatherStack API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(`WeatherStack API error: ${data.error.info}`)
      }

      return {
        temperature: Math.round(data.current.temperature),
        windSpeed: Math.round(data.current.wind_speed),
        humidity: data.current.humidity,
        description: data.current.weather_descriptions[0] || 'Unknown',
        isDome: false
      }
    } catch (error) {
      console.error('Error fetching weather data:', error)
      // Return default data if weather fetch fails
      return {
        temperature: 0,
        windSpeed: 0,
        humidity: 0,
        description: 'Weather data unavailable',
        isDome: false
      }
    }
  }

  // Fetch odds data from DraftKings Sportsbook
  async fetchOddsData(awayTeam: string, homeTeam: string): Promise<OddsData> {
    try {
      // DraftKings Sportsbook API endpoint
      const url = 'https://sportsbook.draftkings.com/api/v4/odds'
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; LoserPool/1.0)',
        },
        body: JSON.stringify({
          sport: 'football',
          league: 'nfl',
          region: 'US',
          mkt: 'h2h' // Head to head market
        })
      })

      if (!response.ok) {
        throw new Error(`DraftKings API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Parse the response to find the specific game
      const game = this.findGameInDraftKingsData(data, awayTeam, homeTeam)
      
      if (game) {
        return {
          awaySpread: game.awaySpread || 0,
          homeSpread: game.homeSpread || 0,
          overUnder: game.overUnder || 0,
          lastUpdated: new Date()
        }
      } else {
        // Fallback to simulated data if game not found
        const spreads = this.generateSimulatedSpreads(awayTeam, homeTeam)
        return {
          awaySpread: spreads.awaySpread,
          homeSpread: spreads.homeSpread,
          overUnder: spreads.overUnder,
          lastUpdated: new Date()
        }
      }
    } catch (error) {
      console.error('Error fetching DraftKings odds data:', error)
      // Fallback to simulated data on error
      const spreads = this.generateSimulatedSpreads(awayTeam, homeTeam)
      return {
        awaySpread: spreads.awaySpread,
        homeSpread: spreads.homeSpread,
        overUnder: spreads.overUnder,
        lastUpdated: new Date()
      }
    }
  }

  // Helper method to find specific game in DraftKings data
  private findGameInDraftKingsData(data: any, awayTeam: string, homeTeam: string): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // This is a simplified parser - you may need to adjust based on actual API response
      if (data && data.events) {
        for (const event of data.events) {
          const eventTeams = event.name?.toLowerCase() || ''
          const awayTeamLower = awayTeam.toLowerCase()
          const homeTeamLower = homeTeam.toLowerCase()
          
          if (eventTeams.includes(awayTeamLower) && eventTeams.includes(homeTeamLower)) {
            // Extract odds from the event
            const markets = event.markets || []
            for (const market of markets) {
              if (market.key === 'spread') {
                return {
                  awaySpread: market.outcomes?.[0]?.price || 0,
                  homeSpread: market.outcomes?.[1]?.price || 0,
                  overUnder: 0 // Would need to find over/under market
                }
              }
            }
          }
        }
      }
      return null
    } catch (error) {
      console.error('Error parsing DraftKings data:', error)
      return null
    }
  }

  // Generate simulated spreads for testing
  private generateSimulatedSpreads(_awayTeam: string, _homeTeam: string): { awaySpread: number, homeSpread: number, overUnder: number } {
    // Simple simulation - in production this would come from real odds data
    const baseSpread = Math.random() * 7 - 3.5 // Random spread between -3.5 and +3.5
    const overUnder = 40 + Math.random() * 20 // Random total between 40-60
    
    return {
      awaySpread: Math.round(baseSpread * 2) / 2, // Round to nearest 0.5
      homeSpread: Math.round(-baseSpread * 2) / 2,
      overUnder: Math.round(overUnder * 2) / 2
    }
  }

  // Convert ESPN game data to our format
  private convertESPNGameToMatchup(game: ESPNGame): Partial<MatchupUpdate> {
    const competition = game.competitions[0]
    if (!competition) return {}

    const awayTeam = competition.competitors.find(c => c.homeAway === 'away')
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home')
    
    if (!awayTeam || !homeTeam) return {}

    const venue = competition.venue?.fullName || 'TBD'
    const isDome = DOME_VENUES.some(dome => venue.includes(dome))

    return {
      venue,
      isDome,
      status: this.mapESPNStatus(competition.status.type.state),
      awayScore: awayTeam.score ? parseInt(awayTeam.score) : undefined,
      homeScore: homeTeam.score ? parseInt(homeTeam.score) : undefined,
      dataSource: 'espn',
      lastApiUpdate: new Date()
    }
  }

  // Map ESPN status to our status format
  private mapESPNStatus(espnStatus: string): string {
    switch (espnStatus) {
      case 'pre':
        return 'scheduled'
      case 'in':
        return 'live'
      case 'post':
        return 'final'
      case 'postponed':
        return 'postponed'
      case 'delayed':
        return 'delayed'
      default:
        return 'scheduled'
    }
  }

  // Determine winner based on scores
  private determineWinner(awayScore: number, homeScore: number): string | undefined {
    if (awayScore === null || homeScore === null) return undefined
    
    if (awayScore > homeScore) return 'away'
    if (homeScore > awayScore) return 'home'
    return 'tie'
  }

  // Get current NFL week based on actual game schedules
  async getCurrentWeek(): Promise<number> {
    try {
      const now = new Date()
      const preseasonStart = new Date('2025-08-07T00:00:00') // NFL 2025 preseason start
      const regularSeasonStart = new Date('2025-09-04T00:00:00') // NFL 2025 regular season start
      
      // If in preseason, calculate preseason week
      if (now < regularSeasonStart) {
        // NFL preseason weeks are typically:
        // Week 1: Aug 7-11 (first 5 days)
        // Week 2: Aug 14-18 (next 5 days)
        // Week 3: Aug 21-25 (next 5 days)
        // Week 4: Aug 28-Sep 1 (next 5 days)
        
        const daysSinceStart = Math.floor((now.getTime() - preseasonStart.getTime()) / (24 * 60 * 60 * 1000))
        
        // Calculate preseason week based on NFL schedule
        // NFL preseason typically starts the first full week after Aug 7
        let preseasonWeek = 1
        if (daysSinceStart >= 6) { // Aug 13+ is Week 2
          preseasonWeek = 2
        } else if (daysSinceStart >= 13) { // Aug 20+ is Week 3
          preseasonWeek = 3
        } else if (daysSinceStart >= 20) { // Aug 27+ is Week 4
          preseasonWeek = 4
        }
        
        return preseasonWeek
      }
      
      // For regular season, try to get week from actual game schedules first
      try {
        const { data: allMatchups, error } = await this.supabase
          .from('matchups')
          .select('game_time')
          .order('game_time', { ascending: true })
        
        if (!error && allMatchups && allMatchups.length > 0) {
          const gameDates = allMatchups.map((m: any) => new Date(m.game_time)) // eslint-disable-line @typescript-eslint/no-explicit-any
          const { getCurrentWeekFromGames } = await import('@/lib/week-utils')
          return getCurrentWeekFromGames(gameDates)
        }
      } catch (scheduleError) {
        console.log('Could not determine week from game schedules, using date-based calculation')
      }
      
      // Fallback to date-based calculation
      const regularSeasonWeeksSinceStart = Math.floor((now.getTime() - regularSeasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
      const regularSeasonWeek = Math.max(1, Math.min(18, regularSeasonWeeksSinceStart + 1))
      return regularSeasonWeek
    } catch (error) {
      console.error('Error calculating current week:', error)
      return 1 // Fallback to week 1
    }
  }

  // Get current NFL week display string (includes preseason)
  async getCurrentWeekDisplay(): Promise<string> {
    try {
      const now = new Date()
      const preseasonStart = new Date('2025-08-07T00:00:00') // NFL 2025 preseason start
      const regularSeasonStart = new Date('2025-09-04T00:00:00') // NFL 2025 regular season start (approximate)
      
      // If before regular season start, it's preseason
      if (now < regularSeasonStart) {
        // NFL preseason weeks are typically:
        // Week 1: Aug 7-11 (first 5 days)
        // Week 2: Aug 14-18 (next 5 days)
        // Week 3: Aug 21-25 (next 5 days)
        // Week 4: Aug 28-Sep 1 (next 5 days)
        
        const daysSinceStart = Math.floor((now.getTime() - preseasonStart.getTime()) / (24 * 60 * 60 * 1000))
        
        // Calculate preseason week based on NFL schedule
        // NFL preseason typically starts the first full week after Aug 7
        let preseasonWeek = 1
        if (daysSinceStart >= 6) { // Aug 13+ is Week 2
          preseasonWeek = 2
        } else if (daysSinceStart >= 13) { // Aug 20+ is Week 3
          preseasonWeek = 3
        } else if (daysSinceStart >= 20) { // Aug 27+ is Week 4
          preseasonWeek = 4
        }
        
        return `Preseason Week ${preseasonWeek}`
      }
      
      // For regular season, try to get week from actual game schedules first
      try {
        const { data: allMatchups, error } = await this.supabase
          .from('matchups')
          .select('game_time')
          .order('game_time', { ascending: true })
        
        if (!error && allMatchups && allMatchups.length > 0) {
          const gameDates = allMatchups.map((m: any) => new Date(m.game_time)) // eslint-disable-line @typescript-eslint/no-explicit-any
          const { getCurrentWeekFromGames } = await import('@/lib/week-utils')
          const weekNumber = getCurrentWeekFromGames(gameDates)
          return `Week ${weekNumber}`
        }
      } catch (scheduleError) {
        console.log('Could not determine week from game schedules, using date-based calculation')
      }
      
      // Fallback to date-based calculation
      const regularSeasonWeeksSinceStart = Math.floor((now.getTime() - regularSeasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
      const regularSeasonWeek = Math.max(1, Math.min(18, regularSeasonWeeksSinceStart + 1))
      return `Week ${regularSeasonWeek}`
    } catch (error) {
      console.error('Error calculating current week display:', error)
      return 'Week 1' // Fallback
    }
  }

  // Static method to get current NFL week display string (for client components)
  static getCurrentWeekDisplayStatic(): string {
    try {
      const now = new Date()
      const preseasonStart = new Date('2025-08-07T00:00:00') // NFL 2025 preseason start
      const regularSeasonStart = new Date('2025-09-04T00:00:00') // NFL 2025 regular season start (approximate)
      
      // If before regular season start, it's preseason
      if (now < regularSeasonStart) {
        // NFL preseason weeks are typically:
        // Week 1: Aug 7-11 (first 5 days)
        // Week 2: Aug 14-18 (next 5 days)
        // Week 3: Aug 21-25 (next 5 days)
        // Week 4: Aug 28-Sep 1 (next 5 days)
        
        const daysSinceStart = Math.floor((now.getTime() - preseasonStart.getTime()) / (24 * 60 * 60 * 1000))
        
        // Calculate preseason week based on NFL schedule
        // NFL preseason typically starts the first full week after Aug 7
        let preseasonWeek = 1
        if (daysSinceStart >= 6) { // Aug 13+ is Week 2
          preseasonWeek = 2
        } else if (daysSinceStart >= 13) { // Aug 20+ is Week 3
          preseasonWeek = 3
        } else if (daysSinceStart >= 20) { // Aug 27+ is Week 4
          preseasonWeek = 4
        }
        
        return `Preseason Week ${preseasonWeek}`
      }
      
      // Regular season - static method can't access database, so use date-based calculation
      const regularSeasonWeeksSinceStart = Math.floor((now.getTime() - regularSeasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
      const regularSeasonWeek = Math.max(1, Math.min(18, regularSeasonWeeksSinceStart + 1))
      return `Week ${regularSeasonWeek}`
    } catch (error) {
      console.error('Error calculating current week display:', error)
      return 'Week 1' // Fallback
    }
  }

  // Helper function to format week display
  static formatWeekDisplay(week: number, isPreseason: boolean = false): string {
    if (isPreseason) {
      return `Preseason Week ${week}`
    }
    return week === 0 ? 'Week Zero' : `Week ${week}`
  }

  // Main method to update all matchup data
  async updateAllMatchups(): Promise<{ processed: number, updated: number, errors: string[] }> {
    await this.initSupabase()
    
    const startTime = Date.now()
    const errors: string[] = []
    let processed = 0
    let updated = 0

    try {
      // Get current week
      const currentWeek = await this.getCurrentWeek()
      
      // Fetch NFL.com schedule data
      const nflSchedule = await this.fetchNFLSchedule()
      
      // Get existing matchups from database
      const { data: existingMatchups, error: fetchError } = await this.supabase
        .from('matchups')
        .select('*')
        .eq('week', currentWeek)

      if (fetchError) {
        throw new Error(`Database fetch error: ${fetchError.message}`)
      }

      // Process each NFL.com game
      for (const game of nflSchedule.games) {
        processed++
        
        try {
          // Convert game to our format
          const { chatgptNFLService } = await import('@/lib/chatgpt-nfl-service')
          const gameData: any = chatgptNFLService.convertToMatchupFormat(game)

          // Find matching matchup in database
          const existingMatchup = existingMatchups?.find((m: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            m.away_team === gameData.away_team && m.home_team === gameData.home_team
          )

          if (!existingMatchup) {
            console.log(`No existing matchup found for ${gameData.away_team} @ ${gameData.home_team}`)
            continue
          }

          // Prepare update data
          const updateData: Partial<MatchupUpdate> = {
            status: gameData.status,
            awayScore: gameData.away_score,
            homeScore: gameData.home_score,
            venue: gameData.venue,
            weatherForecast: gameData.weather_forecast,
            temperature: gameData.temperature,
            windSpeed: gameData.wind_speed,
            humidity: gameData.humidity,
            isDome: gameData.is_dome,
            awaySpread: gameData.away_spread,
            homeSpread: gameData.home_spread,
            overUnder: gameData.over_under,
            oddsLastUpdated: gameData.odds_last_updated,
            dataSource: gameData.data_source,
            lastApiUpdate: gameData.last_api_update,
            winner: gameData.winner
          }

          // Add weather data if not a dome (API-Sports doesn't provide venue info, so we'll skip for now)
          // TODO: Integrate with a venue database to get location info for weather
          if (updateData.isDome) {
            updateData.weatherForecast = 'Indoor Game'
            updateData.temperature = 72
            updateData.windSpeed = 0
            updateData.humidity = 50
          }

          // Add odds data
          const oddsData = await this.fetchOddsData(gameData.away_team, gameData.home_team)
          updateData.awaySpread = oddsData.awaySpread
          updateData.homeSpread = oddsData.homeSpread
          updateData.overUnder = oddsData.overUnder
          updateData.oddsLastUpdated = oddsData.lastUpdated

          // Determine winner if scores are available
          if (updateData.awayScore !== undefined && updateData.homeScore !== undefined) {
            updateData.winner = this.determineWinner(updateData.awayScore, updateData.homeScore)
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
            errors.push(`Update error for ${existingMatchup.id}: ${updateError.message}`)
          } else {
            updated++
          }

        } catch (error) {
          const errorMsg = `Error processing game ${game.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      // Log the update
      const executionTime = Date.now() - startTime
      await this.supabase.rpc('log_automated_update', {
        p_update_type: 'full',
        p_status: errors.length > 0 ? 'partial' : 'success',
        p_matchups_processed: processed,
        p_matchups_updated: updated,
        p_errors: errors.length > 0 ? errors : null,
        p_execution_time_ms: executionTime
      })

      return { processed, updated, errors }

    } catch (error) {
      const errorMsg = `Fatal error in updateAllMatchups: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      
      // Log the error
      await this.supabase.rpc('log_automated_update', {
        p_update_type: 'full',
        p_status: 'error',
        p_matchups_processed: processed,
        p_matchups_updated: updated,
        p_errors: errors,
        p_execution_time_ms: Date.now() - startTime
      })

      throw error
    }
  }

  // Send error notification email
  async sendErrorNotification(error: string): Promise<void> {
    try {
      const response = await fetch('/api/admin/send-immediate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'tim@828.life',
          subject: 'Loser Pool - Automated Update Error',
          template: 'error-notification',
          data: {
            error,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
          }
        })
      })

      if (!response.ok) {
        console.error('Failed to send error notification email')
      }
    } catch (emailError) {
      console.error('Error sending error notification:', emailError)
    }
  }

  // Update current week matchups only
  async updateCurrentWeekMatchups(): Promise<{ gamesFound: number, gamesUpdated: number }> {
    await this.initSupabase()
    
    const startTime = Date.now()
    let gamesFound = 0
    let gamesUpdated = 0

    try {
      // Get current week
      const currentWeek = await this.getCurrentWeek()
      console.log(`Updating current week (${currentWeek}) matchups...`)
      
      // Fetch current week NFL.com schedule data
      const nflSchedule = await this.fetchNFLSchedule()
      gamesFound = nflSchedule.games?.length || 0
      
      // Get existing matchups from database for current week
      const { data: existingMatchups, error: fetchError } = await this.supabase
        .from('matchups')
        .select('*')
        .eq('week', currentWeek)

      if (fetchError) {
        throw new Error(`Database fetch error: ${fetchError.message}`)
      }

      // Process each NFL.com game
      for (const game of nflSchedule.games || []) {
        try {
          // Convert game to our format
          let gameData: any
          try {
            const { preseasonDataService } = await import('@/lib/preseason-data-service')
            gameData = preseasonDataService.convertToMatchupFormat(game)
          } catch {
            try {
              const { chatgptNFLService } = await import('@/lib/chatgpt-nfl-service')
              gameData = chatgptNFLService.convertToMatchupFormat(game)
            } catch {
              const { enhancedNFLScraperService } = await import('@/lib/nfl-scraper-enhanced')
              gameData = enhancedNFLScraperService.convertToMatchupFormat(game)
            }
          }

          // Find matching matchup in database
          const existingMatchup = existingMatchups?.find((m: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
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
            status: gameData.status,
            venue: gameData.venue,
            dataSource: gameData.data_source || 'nfl-scraper',
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
          console.error(`Error processing current week game ${game.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  // Update next week matchups only
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
      
      // Fetch next week NFL.com schedule data
      const nflSchedule = await this.fetchNextWeekNFLSchedule()
      gamesFound = nflSchedule.games?.length || 0
      
      // Get existing matchups from database for next week
      const { data: existingMatchups, error: fetchError } = await this.supabase
        .from('matchups')
        .select('*')
        .eq('week', nextWeek)

      if (fetchError) {
        throw new Error(`Database fetch error: ${fetchError.message}`)
      }

      // Process each NFL.com game
      for (const game of nflSchedule.games || []) {
        try {
          // Convert game to our format
          let gameData: any
          try {
            const { preseasonDataService } = await import('@/lib/preseason-data-service')
            gameData = preseasonDataService.convertToMatchupFormat(game)
          } catch {
            try {
              const { chatgptNFLService } = await import('@/lib/chatgpt-nfl-service')
              gameData = chatgptNFLService.convertToMatchupFormat(game)
            } catch {
              const { enhancedNFLScraperService } = await import('@/lib/nfl-scraper-enhanced')
              gameData = enhancedNFLScraperService.convertToMatchupFormat(game)
            }
          }

          // Find matching matchup in database
          const existingMatchup = existingMatchups?.find((m: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
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
            status: gameData.status,
            venue: gameData.venue,
            dataSource: gameData.data_source || 'nfl-scraper',
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
          console.error(`Error processing next week game ${game.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
  private hasDataChanged(existingMatchup: any, newData: any): boolean { // eslint-disable-line @typescript-eslint/no-explicit-any
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
