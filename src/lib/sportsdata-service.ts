import { APISportsService } from './api-sports'

// Stub implementation that uses the existing APISportsService
// This is a temporary fix until the actual sportsdata-specific implementation is created
export const sportsDataService = {
  async getGames(season: number, week?: number) {
    const service = new APISportsService()
    return await service.getGames(season, week)
  },

  async getVenues(season: number) {
    // Stub implementation - return empty array for now
    return []
  },

  async getWeatherData(gameId: string) {
    // Stub implementation - return empty object for now
    return {}
  },

  async getScores(season: number, week?: number) {
    const service = new APISportsService()
    return await service.getGames(season, week)
  },

  async testConnection() {
    return {
      success: true,
      message: 'SportsData service test endpoint',
      timestamp: new Date().toISOString()
    }
  }
}
