// API-Sports NFL API Service
// Documentation: https://api-sports.io/documentation/nfl/v1#section/Introduction

interface APISportsGame {
  fixture: {
    id: number
    date: string
    timestamp: number
    timezone: string
    status: {
      long: string
      short: string
      elapsed: number
    }
  }
  teams: {
    home: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
    away: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: {
      home: number | null
      away: number | null
    }
    fulltime: {
      home: number | null
      away: number | null
    }
    extratime: {
      home: number | null
      away: number | null
    }
    penalty: {
      home: number | null
      away: number | null
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    season: number
    round: string
  }
}

interface APISportsResponse {
  get: string
  parameters: {
    league: string
    season: string
    week?: string
  }
  errors: string[]
  results: number
  paging: {
    current: number
    total: number
  }
  response: APISportsGame[]
}

export class APISportsService {
  private apiKey: string
  private baseUrl = 'https://v3.football.api-sports.io'

  constructor() {
    this.apiKey = process.env.API_SPORTS_KEY || ''
    if (!this.apiKey) {
      console.warn('API_SPORTS_KEY not found in environment variables')
    }
  }

  // Get NFL games for a specific season and week
  async getGames(season: number, week?: number): Promise<APISportsGame[]> {
    try {
      const url = new URL(`${this.baseUrl}/fixtures`)
      url.searchParams.append('league', '1') // NFL league ID
      url.searchParams.append('season', season.toString())
      if (week) {
        url.searchParams.append('round', `Regular Season - ${week}`)
      }

      const response = await fetch(url.toString(), {
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': this.apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`API-Sports API error: ${response.status} ${response.statusText}`)
      }

      const data: APISportsResponse = await response.json()
      
      if (data.errors && data.errors.length > 0) {
        throw new Error(`API-Sports API errors: ${data.errors.join(', ')}`)
      }

      return data.response || []
    } catch (error) {
      console.error('Error fetching games from API-Sports:', error)
      throw error
    }
  }

  // Get all NFL games for a season
  async getAllGames(season: number): Promise<APISportsGame[]> {
    try {
      const url = new URL(`${this.baseUrl}/fixtures`)
      url.searchParams.append('league', '1') // NFL league ID
      url.searchParams.append('season', season.toString())

      const response = await fetch(url.toString(), {
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': this.apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`API-Sports API error: ${response.status} ${response.statusText}`)
      }

      const data: APISportsResponse = await response.json()
      
      if (data.errors && data.errors.length > 0) {
        throw new Error(`API-Sports API errors: ${data.errors.join(', ')}`)
      }

      return data.response || []
    } catch (error) {
      console.error('Error fetching all games from API-Sports:', error)
      throw error
    }
  }

  // Get team statistics
  async getTeamStats(season: number, teamId: number): Promise<any> {
    try {
      const url = new URL(`${this.baseUrl}/teams/statistics`)
      url.searchParams.append('league', '1') // NFL league ID
      url.searchParams.append('season', season.toString())
      url.searchParams.append('team', teamId.toString())

      const response = await fetch(url.toString(), {
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': this.apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`API-Sports API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.response
    } catch (error) {
      console.error('Error fetching team stats from API-Sports:', error)
      throw error
    }
  }

  // Get standings/league table
  async getStandings(season: number): Promise<any> {
    try {
      const url = new URL(`${this.baseUrl}/standings`)
      url.searchParams.append('league', '1') // NFL league ID
      url.searchParams.append('season', season.toString())

      const response = await fetch(url.toString(), {
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': this.apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`API-Sports API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.response
    } catch (error) {
      console.error('Error fetching standings from API-Sports:', error)
      throw error
    }
  }

  // Convert API-Sports game format to our internal format
  convertGameToMatchup(game: APISportsGame): any {
    return {
      id: game.fixture.id.toString(),
      away_team: game.teams.away.name,
      home_team: game.teams.home.name,
      game_time: game.fixture.date,
      status: this.convertStatus(game.fixture.status.short),
      away_score: game.goals.away,
      home_score: game.goals.home,
      venue: null, // API-Sports doesn't provide venue info
      weather_forecast: null, // Would need separate weather API
      temperature: null,
      wind_speed: null,
      humidity: null,
      is_dome: false,
      away_spread: null, // Would need separate odds API
      home_spread: null,
      over_under: null,
      odds_last_updated: null,
      data_source: 'api-sports',
      last_api_update: new Date().toISOString(),
      api_update_count: 1,
      winner: game.teams.home.winner === true ? 'home' : 
              game.teams.away.winner === true ? 'away' : null
    }
  }

  // Convert API-Sports status to our internal status
  private convertStatus(apiStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'NS': 'scheduled', // Not Started
      '1H': 'live', // First Half
      'HT': 'live', // Half Time
      '2H': 'live', // Second Half
      'FT': 'final', // Full Time
      'AET': 'final', // After Extra Time
      'PEN': 'final', // Penalties
      'BT': 'live', // Break Time
      'SUSP': 'delayed', // Suspended
      'INT': 'delayed', // Interrupted
      'PST': 'postponed', // Postponed
      'CANC': 'cancelled', // Cancelled
      'ABD': 'cancelled', // Abandoned
      'AWD': 'final', // Technical Loss
      'WO': 'final', // Walkover
      'LIVE': 'live' // Live
    }
    
    return statusMap[apiStatus] || 'scheduled'
  }

  // Test the API connection
  async testConnection(): Promise<boolean> {
    try {
      const games = await this.getGames(2024, 1)
      return games.length > 0
    } catch (error) {
      console.error('API-Sports connection test failed:', error)
      return false
    }
  }
}

// Export a singleton instance
export const apiSportsService = new APISportsService()
