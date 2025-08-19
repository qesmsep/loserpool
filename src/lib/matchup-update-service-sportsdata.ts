import { MatchupUpdateService } from './matchup-update-service'

// Stub implementation that uses the existing MatchupUpdateService
// This is a temporary fix until the actual sportsdata-specific implementation is created
export const matchupUpdateServiceSportsData = {
  async updateCurrentWeekMatchups(season: number) {
    const service = new MatchupUpdateService()
    return await service.updateCurrentWeekMatchups(season)
  },

  async updateNextWeekMatchups(season: number) {
    const service = new MatchupUpdateService()
    return await service.updateNextWeekMatchups(season)
  },

  async updateWeekMatchups(season: number, week: number) {
    const service = new MatchupUpdateService()
    return await service.updateWeekMatchups(season, week)
  },

  async updateSeasonSchedule(season: number) {
    const service = new MatchupUpdateService()
    return await service.updateAllMatchups()
  },

  async syncCurrentWeek(season: number) {
    const service = new MatchupUpdateService()
    return await service.syncCurrentWeek(season)
  },

  async testService() {
    return {
      success: true,
      message: 'SportsData matchup update service test endpoint',
      timestamp: new Date().toISOString()
    }
  }
}
