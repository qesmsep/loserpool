// Mock NFL Data Service
// Simulates the data we'd get from scraping NFL.com

interface MockNFLGame {
  id: string
  away_team: string
  home_team: string
  game_time: string
  day: string
  status: string
  venue?: string
  network?: string
}

interface MockNFLSchedule {
  current_week: string
  games: MockNFLGame[]
  last_updated: string
}

export class MockNFLDataService {
  // Get mock NFL schedule data for the current week
  async getCurrentWeekSchedule(): Promise<MockNFLSchedule> {
    const currentWeek = this.getCurrentWeekDisplay()
    
    // Mock preseason week 2 games (August 14-18, 2025)
    const mockGames: MockNFLGame[] = [
      {
        id: 'bills-bengals-1',
        away_team: 'Bills',
        home_team: 'Bengals',
        game_time: '2025-08-14T19:00:00Z',
        day: 'Thursday',
        status: 'scheduled',
        venue: 'Paycor Stadium',
        network: 'NFL Network'
      },
      {
        id: 'browns-ravens-1',
        away_team: 'Browns',
        home_team: 'Ravens',
        game_time: '2025-08-15T19:30:00Z',
        day: 'Friday',
        status: 'scheduled',
        venue: 'M&T Bank Stadium',
        network: 'Local'
      },
      {
        id: 'steelers-jets-1',
        away_team: 'Steelers',
        home_team: 'Jets',
        game_time: '2025-08-16T19:00:00Z',
        day: 'Saturday',
        status: 'scheduled',
        venue: 'MetLife Stadium',
        network: 'CBS'
      },
      {
        id: 'dolphins-patriots-1',
        away_team: 'Dolphins',
        home_team: 'Patriots',
        game_time: '2025-08-16T19:30:00Z',
        day: 'Saturday',
        status: 'scheduled',
        venue: 'Gillette Stadium',
        network: 'NFL Network'
      },
      {
        id: 'chiefs-raiders-1',
        away_team: 'Chiefs',
        home_team: 'Raiders',
        game_time: '2025-08-17T16:00:00Z',
        day: 'Sunday',
        status: 'scheduled',
        venue: 'Allegiant Stadium',
        network: 'CBS'
      },
      {
        id: 'broncos-chargers-1',
        away_team: 'Broncos',
        home_team: 'Chargers',
        game_time: '2025-08-17T16:25:00Z',
        day: 'Sunday',
        status: 'scheduled',
        venue: 'SoFi Stadium',
        network: 'FOX'
      },
      {
        id: 'cowboys-giants-1',
        away_team: 'Cowboys',
        home_team: 'Giants',
        game_time: '2025-08-17T19:00:00Z',
        day: 'Sunday',
        status: 'scheduled',
        venue: 'MetLife Stadium',
        network: 'NBC'
      },
      {
        id: 'eagles-commanders-1',
        away_team: 'Eagles',
        home_team: 'Commanders',
        game_time: '2025-08-18T20:00:00Z',
        day: 'Monday',
        status: 'scheduled',
        venue: 'FedExField',
        network: 'ESPN'
      }
    ]

    return {
      current_week: currentWeek,
      games: mockGames,
      last_updated: new Date().toISOString()
    }
  }

  // Get mock NFL schedule data for next week
  async getNextWeekSchedule(): Promise<MockNFLSchedule> {
    const nextWeek = this.getNextWeekDisplay()
    
    // Mock preseason week 3 games (August 21-25, 2025)
    const mockGames: MockNFLGame[] = [
      {
        id: 'ravens-steelers-2',
        away_team: 'Ravens',
        home_team: 'Steelers',
        game_time: '2025-08-21T19:00:00Z',
        day: 'Thursday',
        status: 'scheduled',
        venue: 'Acrisure Stadium',
        network: 'NFL Network'
      },
      {
        id: 'bengals-browns-2',
        away_team: 'Bengals',
        home_team: 'Browns',
        game_time: '2025-08-22T19:30:00Z',
        day: 'Friday',
        status: 'scheduled',
        venue: 'Cleveland Browns Stadium',
        network: 'Local'
      },
      {
        id: 'jets-dolphins-2',
        away_team: 'Jets',
        home_team: 'Dolphins',
        game_time: '2025-08-23T19:00:00Z',
        day: 'Saturday',
        status: 'scheduled',
        venue: 'Hard Rock Stadium',
        network: 'CBS'
      },
      {
        id: 'patriots-bills-2',
        away_team: 'Patriots',
        home_team: 'Bills',
        game_time: '2025-08-23T19:30:00Z',
        day: 'Saturday',
        status: 'scheduled',
        venue: 'Highmark Stadium',
        network: 'NFL Network'
      },
      {
        id: 'raiders-chiefs-2',
        away_team: 'Raiders',
        home_team: 'Chiefs',
        game_time: '2025-08-24T16:00:00Z',
        day: 'Sunday',
        status: 'scheduled',
        venue: 'Arrowhead Stadium',
        network: 'CBS'
      },
      {
        id: 'chargers-broncos-2',
        away_team: 'Chargers',
        home_team: 'Broncos',
        game_time: '2025-08-24T16:25:00Z',
        day: 'Sunday',
        status: 'scheduled',
        venue: 'Empower Field at Mile High',
        network: 'FOX'
      },
      {
        id: 'giants-cowboys-2',
        away_team: 'Giants',
        home_team: 'Cowboys',
        game_time: '2025-08-24T19:00:00Z',
        day: 'Sunday',
        status: 'scheduled',
        venue: 'AT&T Stadium',
        network: 'NBC'
      },
      {
        id: 'commanders-eagles-2',
        away_team: 'Commanders',
        home_team: 'Eagles',
        game_time: '2025-08-25T20:00:00Z',
        day: 'Monday',
        status: 'scheduled',
        venue: 'Lincoln Financial Field',
        network: 'ESPN'
      }
    ]

    return {
      current_week: nextWeek,
      games: mockGames,
      last_updated: new Date().toISOString()
    }
  }

  // Get current week display string
  private getCurrentWeekDisplay(): string {
    const now = new Date()
    const preseasonStart = new Date('2025-08-07T00:00:00')
    const regularSeasonStart = new Date('2025-09-04T00:00:00')

    if (now < regularSeasonStart) {
      const daysSinceStart = Math.floor((now.getTime() - preseasonStart.getTime()) / (24 * 60 * 60 * 1000))
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

    const regularSeasonWeeksSinceStart = Math.floor((now.getTime() - regularSeasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const regularSeasonWeek = Math.max(1, Math.min(18, regularSeasonWeeksSinceStart + 1))
    return `Week ${regularSeasonWeek}`
  }

  // Get next week display string
  private getNextWeekDisplay(): string {
    const now = new Date()
    const preseasonStart = new Date('2025-08-07T00:00:00')
    const regularSeasonStart = new Date('2025-09-04T00:00:00')

    if (now < regularSeasonStart) {
      const daysSinceStart = Math.floor((now.getTime() - preseasonStart.getTime()) / (24 * 60 * 60 * 1000))
      let preseasonWeek = 1
      if (daysSinceStart >= 6) { // Aug 13+ is Week 2
        preseasonWeek = 2
      } else if (daysSinceStart >= 13) { // Aug 20+ is Week 3
        preseasonWeek = 3
      } else if (daysSinceStart >= 20) { // Aug 27+ is Week 4
        preseasonWeek = 4
      }
      return `Preseason Week ${preseasonWeek + 1}`
    }

    const regularSeasonWeeksSinceStart = Math.floor((now.getTime() - regularSeasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const regularSeasonWeek = Math.max(1, Math.min(18, regularSeasonWeeksSinceStart + 1))
    return `Week ${regularSeasonWeek + 1}`
  }

  // Convert mock game to our internal format
  convertToMatchupFormat(game: MockNFLGame): Record<string, unknown> {
    return {
      away_team: game.away_team,
      home_team: game.home_team,
      game_time: game.game_time,
      status: game.status,
      venue: game.venue,
      data_source: 'mock-nfl',
      last_api_update: new Date().toISOString(),
      api_update_count: 1
    }
  }

  // Test the mock service
  async testService(): Promise<boolean> {
    try {
      const schedule = await this.getCurrentWeekSchedule()
      return schedule.games.length > 0
    } catch (error) {
      console.error('Mock NFL service test failed:', error)
      return false
    }
  }
}

// Export a singleton instance
export const mockNFLDataService = new MockNFLDataService()
