// SportsData.io NFL API Service
// Documentation: https://sportsdata.io/developers/api-documentation/nfl

interface SportsDataGame {
  GameKey: string
  Season: number
  Week: number
  SeasonType: number
  Status: string
  Day: string
  DateTime: string
  AwayTeam: string
  HomeTeam: string
  AwayTeamID: number
  HomeTeamID: number
  AwayScore?: number
  HomeScore?: number
  AwayTeamMoneyLine?: number
  HomeTeamMoneyLine?: number
  PointSpread?: number
  OverUnder?: number
  StadiumID?: number
  StadiumDetails?: {
    StadiumID: number
    Name: string
    City: string
    State: string
    Country: string
    Capacity?: number
    PlayingSurface?: string
    GeoLat?: number
    GeoLong?: number
  }
  Channel?: string
  Attendance?: number
  AwayScoreQuarter1?: number
  AwayScoreQuarter2?: number
  AwayScoreQuarter3?: number
  AwayScoreQuarter4?: number
  AwayScoreOvertime?: number
  HomeScoreQuarter1?: number
  HomeScoreQuarter2?: number
  HomeScoreQuarter3?: number
  HomeScoreQuarter4?: number
  HomeScoreOvertime?: number
  LastPlay?: string
  IsClosed?: boolean
  LastUpdated?: string
  Quarter?: string
  TimeRemaining?: number
  GlobalGameID?: number
  GlobalAwayTeamID?: number
  GlobalHomeTeamID?: number
  ScoreID?: number
  HomeRotationNumber?: number
  AwayRotationNumber?: number
  NeutralVenue?: boolean
  OverPayout?: number
  UnderPayout?: number
  HomeTimeouts?: number
  AwayTimeouts?: number
  DateTimeUTC?: string
  GameEndDateTime?: string
  RefereeID?: number
  ForecastTempLow?: number
  ForecastTempHigh?: number
  ForecastDescription?: string
  ForecastWindChill?: number
  ForecastWindSpeed?: number
  Canceled?: boolean
  Closed?: boolean
  HasStarted?: boolean
  IsInProgress?: boolean
  IsOver?: boolean
  Has1stQuarterStarted?: boolean
  Has2ndQuarterStarted?: boolean
  Has3rdQuarterStarted?: boolean
  Has4thQuarterStarted?: boolean
  IsOvertime?: boolean
  DownAndDistance?: string
  QuarterDescription?: string
  GeoLat?: number
  GeoLong?: number
  Possession?: string
  Down?: number
  Distance?: string
  YardLine?: number
  YardLineTerritory?: string
  RedZone?: boolean
  PointSpreadAwayTeamMoneyLine?: number
  PointSpreadHomeTeamMoneyLine?: number
  OverUnderAwayTeamMoneyLine?: number
  OverUnderHomeTeamMoneyLine?: number
}

interface SportsDataResponse {
  GameID: number
  Season: number
  Week: number
  SeasonType: number
  Status: string
  Day: string
  DateTime: string
  AwayTeam: string
  HomeTeam: string
  AwayTeamID: number
  HomeTeamID: number
  AwayTeamScore?: number
  HomeTeamScore?: number
  AwayTeamMoneyLine?: number
  HomeTeamMoneyLine?: number
  AwayPointSpread?: number
  HomePointSpread?: number
  OverUnder?: number
  StadiumID?: number
  StadiumDetails?: {
    StadiumID: number
    Name: string
    City: string
    State: string
    Country: string
    Capacity?: number
    PlayingSurface?: string
    GeoLat?: number
    GeoLong?: number
  }
  Weather?: {
    Temperature?: number
    Humidity?: number
    WindSpeed?: number
    WindDirection?: number
    Description?: string
  }
  Channel?: string
  Attendance?: number
  AwayTeamScoreQuarter1?: number
  AwayTeamScoreQuarter2?: number
  AwayTeamScoreQuarter3?: number
  AwayTeamScoreQuarter4?: number
  AwayTeamScoreOvertime?: number
  HomeTeamScoreQuarter1?: number
  HomeTeamScoreQuarter2?: number
  HomeTeamScoreQuarter3?: number
  HomeTeamScoreQuarter4?: number
  HomeTeamScoreOvertime?: number
  LastPlay?: string
  IsClosed?: boolean
  Updated?: string
  Quarter?: string
  TimeRemainingMinutes?: number
  TimeRemainingSeconds?: number
  PointSpread?: number
  GlobalGameID?: number
  GlobalAwayTeamID?: number
  GlobalHomeTeamID?: number
  PointSpreadAwayTeamMoneyLine?: number
  PointSpreadHomeTeamMoneyLine?: number
  ScoreID?: number
  GameKey?: string
  HomeRotationNumber?: number
  AwayRotationNumber?: number
  NeutralVenue?: boolean
  OverPayout?: number
  UnderPayout?: number
  OverUnderLine?: number
  OverUnderAwayTeamMoneyLine?: number
  OverUnderHomeTeamMoneyLine?: number
}

export class SportsDataService {
  private apiKey: string
  private baseUrl = 'https://api.sportsdata.io/v3/nfl'

  constructor() {
    this.apiKey = process.env.SPORTSDATA_API_KEY || '3a12d524ec444d6f8efad7e833461d17'
    if (!this.apiKey) {
      console.warn('SPORTSDATA_API_KEY not found in environment variables')
    }
  }

  // Get NFL games for a specific season and week
  async getGames(season: number | string, week?: number): Promise<SportsDataGame[]> {
    try {
      let url: string
      if (week) {
        url = `${this.baseUrl}/scores/json/ScoresByWeek/${season}/${week}?key=${this.apiKey}`
      } else {
        url = `${this.baseUrl}/scores/json/Scores/${season}?key=${this.apiKey}`
      }

      console.log(`Fetching games from SportsData.io: ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`SportsData.io API error: ${response.status} ${response.statusText}`)
      }

      const data: SportsDataGame[] = await response.json()
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format from SportsData.io')
      }

      console.log(`Retrieved ${data.length} games from SportsData.io`)
      return data
    } catch (error) {
      console.error('Error fetching games from SportsData.io:', error)
      throw error
    }
  }

  // Get current week's games
  async getCurrentWeekGames(season: number): Promise<SportsDataGame[]> {
    try {
      // First get the current week
      const currentWeek = await this.getCurrentWeek(season)
      return await this.getGames(season, currentWeek)
    } catch (error) {
      console.error('Error fetching current week games:', error)
      throw error
    }
  }

  // Get next week's games
  async getNextWeekGames(season: number): Promise<SportsDataGame[]> {
    try {
      // First get the current week
      const currentWeek = await this.getCurrentWeek(season)
      const nextWeek = currentWeek + 1
      return await this.getGames(season, nextWeek)
    } catch (error) {
      console.error('Error fetching next week games:', error)
      throw error
    }
  }

  // Get the current week number
  async getCurrentWeek(_season: number): Promise<number> {
    try {
      const url = `${this.baseUrl}/scores/json/CurrentWeek?key=${this.apiKey}`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`SportsData.io API error: ${response.status} ${response.statusText}`)
      }

      const currentWeek = await response.json()
      console.log(`Current week from SportsData.io: ${currentWeek}`)
      return currentWeek
    } catch (error) {
      console.error('Error fetching current week:', error)
      throw error
    }
  }

  // Get team information
  async getTeams(): Promise<Record<string, unknown>[]> {
    try {
      const url = `${this.baseUrl}/scores/json/Teams?key=${this.apiKey}`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`SportsData.io API error: ${response.status} ${response.statusText}`)
      }

      const teams = await response.json()
      return teams
    } catch (error) {
      console.error('Error fetching teams:', error)
      throw error
    }
  }

  // Get odds for games
  async getOdds(season: number, week: number): Promise<Record<string, unknown>[]> {
    try {
      const url = `${this.baseUrl}/odds/json/GameOddsByWeek/${season}/${week}?key=${this.apiKey}`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`SportsData.io API error: ${response.status} ${response.statusText}`)
      }

      const odds = await response.json()
      return odds
    } catch (error) {
      console.error('Error fetching odds:', error)
      throw error
    }
  }

  // Convert SportsData game format to our internal format
  convertGameToMatchup(game: SportsDataGame): Record<string, unknown> {
    return {
      week: game.Week,
      away_team: game.AwayTeam,
      home_team: game.HomeTeam,
      game_time: game.DateTime,
      status: this.convertStatus(game.Status),
      away_score: game.AwayScore || null,
      home_score: game.HomeScore || null,
      away_spread: game.PointSpread ? -game.PointSpread : null, // Negative for away team
      home_spread: game.PointSpread || null, // Positive for home team
      over_under: game.OverUnder || null,
      venue: game.StadiumDetails?.Name || null,
      weather_forecast: game.ForecastDescription || null,
      temperature: game.ForecastTempHigh || null,
      wind_speed: game.ForecastWindSpeed || null,
      humidity: null, // Not available from SportsData
      is_dome: false, // Default value
      odds_last_updated: null,
      data_source: 'sportsdata.io',
      last_api_update: new Date().toISOString(),
      api_update_count: 1,
      winner: this.determineWinner(game),
      season: '' // This will be set by the calling function
    }
  }

  // Convert SportsData status to our internal status
  private convertStatus(apiStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'Scheduled': 'scheduled',
      'InProgress': 'live',
      'Final': 'final',
      'Postponed': 'postponed',
      'Cancelled': 'cancelled',
      'Suspended': 'delayed',
      'Delayed': 'delayed'
    }
    
    return statusMap[apiStatus] || 'scheduled'
  }

  // Determine winner based on scores
  private determineWinner(game: SportsDataGame): string | null {
    if (game.AwayScore === undefined || game.HomeScore === undefined) {
      return null
    }
    
    if (game.AwayScore > game.HomeScore) {
      return 'away'
    } else if (game.HomeScore > game.AwayScore) {
      return 'home'
    } else {
      return 'tie'
    }
  }

  // Test the API connection
  async testConnection(): Promise<boolean> {
    try {
      const currentWeek = await this.getCurrentWeek(2024)
      console.log(`SportsData.io connection test successful. Current week: ${currentWeek}`)
      return true
    } catch (error) {
      console.error('SportsData.io connection test failed:', error)
      return false
    }
  }

  // Get season schedule
  async getSeasonSchedule(season: number | string): Promise<SportsDataGame[]> {
    try {
      const url = `${this.baseUrl}/scores/json/Schedules/${season}?key=${this.apiKey}`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`SportsData.io API error: ${response.status} ${response.statusText}`)
      }

      const schedule = await response.json()
      return schedule
    } catch (error) {
      console.error('Error fetching season schedule:', error)
      throw error
    }
  }
}

// Export a singleton instance
export const sportsDataService = new SportsDataService()
