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
      linescores?: Array<{
        value: number
      }>
    }>
    venue: {
      id: string
      fullName: string
    }
    broadcasts?: Array<{
      market: string
      names: string[]
    }>
    odds?: Array<{
      details: string
      overUnder: number
      spread: number
      pointSpread: {
        home: {
          close: {
            line: string
          }
        }
        away: {
          close: {
            line: string
          }
        }
      }
    }>
  }>
}

export interface ESPNSchedule {
  events: ESPNGame[]
}

export class ESPNService {
  private baseUrl = 'https://site.api.espn.com/apis/site/v2/sports'

  // Get NFL schedule for a specific season and week
  async getNFLSchedule(season: number, week: number, seasonType: string = '2'): Promise<ESPNGame[]> {
    try {
      // ESPN API season types:
      // 1 = Preseason
      // 2 = Regular Season  
      // 3 = Postseason
      const seasonTypeMap: { [key: string]: string } = {
        'PRE': '1',
        'REG': '2', 
        'POST': '3'
      }
      
      const espnSeasonType = seasonTypeMap[seasonType] || '2'
      
      const url = `${this.baseUrl}/football/nfl/scoreboard?week=${week}&year=${season}&seasontype=${espnSeasonType}`
      
      console.log(`Fetching ESPN NFL schedule: ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })

      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status} ${response.statusText}`)
      }

      const data: ESPNSchedule = await response.json()
      
      if (!data.events) {
        throw new Error('Invalid response format from ESPN API')
      }

      console.log(`Retrieved ${data.events.length} games from ESPN API`)
      return data.events
    } catch (error) {
      console.error('Error fetching NFL schedule from ESPN:', error)
      throw error
    }
  }

  // Get current NFL week
  async getCurrentNFLWeek(season: number): Promise<number> {
    try {
      const url = `${this.baseUrl}/football/nfl/scoreboard?year=${season}`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })

      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status} ${response.statusText}`)
      }

      const data: ESPNSchedule = await response.json()
      
      // Find the current week from the events
      if (data.events && data.events.length > 0) {
        return data.events[0].week.number
      }
      
      throw new Error('No events found to determine current week')
    } catch (error) {
      console.error('Error getting current NFL week from ESPN:', error)
      throw error
    }
  }

  // Convert ESPN game to our internal format
  convertToMatchupFormat(espnGame: ESPNGame): Record<string, unknown> | null {
    if (!espnGame.competitions || espnGame.competitions.length === 0) {
      return null
    }

    const competition = espnGame.competitions[0]
    const awayTeam = competition.competitors.find(c => c.homeAway === 'away')
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home')

    if (!awayTeam || !homeTeam) {
      return null
    }

    // Determine game status
    let status = 'scheduled'
    if (competition.status.type.state === 'post') {
      status = 'final'
    } else if (competition.status.type.state === 'in') {
      status = 'live'
    }

    // Parse scores
    const awayScore = awayTeam.score ? parseInt(awayTeam.score) : null
    const homeScore = homeTeam.score ? parseInt(homeTeam.score) : null

    // Determine winner
    let winner = null
    if (awayScore !== null && homeScore !== null) {
      if (awayScore > homeScore) {
        winner = 'away'
      } else if (homeScore > awayScore) {
        winner = 'home'
      } else {
        winner = 'tie'
      }
    }

    // Parse spreads from odds data
    let awaySpread = null
    let homeSpread = null
    let overUnder = null
    
    if (competition.odds && competition.odds.length > 0) {
      const odds = competition.odds[0]
      if (odds.pointSpread && odds.pointSpread.home && odds.pointSpread.away) {
        // Parse home spread (e.g., "-6.5" -> -6.5)
        const homeLine = odds.pointSpread.home.close?.line
        if (homeLine) {
          homeSpread = parseFloat(homeLine)
        }
        
        // Parse away spread (e.g., "+6.5" -> 6.5)
        const awayLine = odds.pointSpread.away.close?.line
        if (awayLine) {
          awaySpread = parseFloat(awayLine)
        }
        
        overUnder = odds.overUnder
      }
    }

    // Get quarter information
    const period = competition.status.period || 0
    const displayClock = competition.status.displayClock || ''
    let quarterInfo = ''
    if (status === 'live' && period > 0) {
      if (period <= 4) {
        quarterInfo = `Q${period}`
      } else {
        quarterInfo = `OT${period - 4}`
      }
      if (displayClock) {
        quarterInfo += ` ${displayClock}`
      }
    }

    // Get broadcast information
    let broadcastInfo = ''
    if (competition.broadcasts && competition.broadcasts.length > 0) {
      const broadcast = competition.broadcasts[0]
      if (broadcast.names && broadcast.names.length > 0) {
        broadcastInfo = broadcast.names[0]
      }
    }

    return {
      id: espnGame.id,
      away_team: awayTeam.team.abbreviation,
      home_team: homeTeam.team.abbreviation,
      away_score: awayScore,
      home_score: homeScore,
      away_spread: awaySpread,
      home_spread: homeSpread,
      over_under: overUnder,
      status: status,
      winner: winner,
      game_time: competition.date,
      venue: competition.venue?.fullName,
      quarter_info: quarterInfo,
      broadcast_info: broadcastInfo,
      data_source: 'espn',
      last_api_update: new Date().toISOString(),
      api_update_count: 1
    }
  }
}

export const espnService = new ESPNService()
