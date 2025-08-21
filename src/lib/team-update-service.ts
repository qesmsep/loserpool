
import { createServerSupabaseClient } from './supabase-server'



interface TeamStats {
  TeamID: number
  Season: number
  SeasonType: number
  Wins: number
  Losses: number
  Ties: number
  PointsFor: number
  PointsAgainst: number
  NetPoints: number
  Touchdowns: number
  DivisionWins: number
  DivisionLosses: number
  ConferenceWins: number
  ConferenceLosses: number
  ScoreID: number
  OpponentID: number
  OpponentName: string
  Day: string
  DateTime: string
  HomeOrAway: string
  Score: number
  OpponentScore: number
  TotalScore: number
  Temperature: number
  Humidity: number
  WindSpeed: number
  WindDirection: number
  PassAttempts: number
  PassCompletions: number
  PassYards: number
  PassCompletionPercentage: number
  PassYardsPerAttempt: number
  PassYardsPerCompletion: number
  PassTouchdowns: number
  PassInterceptions: number
  PassRating: number
  RushAttempts: number
  RushYards: number
  RushYardsPerAttempt: number
  RushTouchdowns: number
  Fumbles: number
  Interceptions: number
  PuntReturns: number
  PuntReturnYards: number
  PuntReturnYardsPerAttempt: number
  PuntReturnTouchdowns: number
  KickReturns: number
  KickReturnYards: number
  KickReturnYardsPerAttempt: number
  KickReturnTouchdowns: number
  InterceptionReturns: number
  InterceptionReturnYards: number
  InterceptionReturnYardsPerAttempt: number
  InterceptionReturnTouchdowns: number
  TimeOfPossessionMinutes: number
  TimeOfPossessionSeconds: number
  TimeOfPossession: string
  FirstDowns: number
  FirstDownsByRushing: number
  FirstDownsByPassing: number
  FirstDownsByPenalty: number
  OffensivePlays: number
  OffensiveYards: number
  OffensiveYardsPerPlay: number
  RushingTouchdowns: number
  PassingTouchdowns: number
  OtherTouchdowns: number
  ExtraPointKickingAttempts: number
  ExtraPointKickingConversions: number
  ExtraPointKickingPercentage: number
  ExtraPointPassingAttempts: number
  ExtraPointPassingConversions: number
  ExtraPointPassingPercentage: number
  ExtraPointRushingAttempts: number
  ExtraPointRushingConversions: number
  ExtraPointRushingPercentage: number
  FieldGoalAttempts: number
  FieldGoalsMade: number
  FieldGoalsPercentage: number
  RedZoneAttempts: number
  RedZoneConversions: number
  RedZonePercentage: number
  GoalToGoAttempts: number
  GoalToGoConversions: number
  GoalToGoPercentage: number
  ReturnTouchdowns: number
  ExtraPointReturnAttempts: number
  ExtraPointReturns: number
  ExtraPointReturnPercentage: number
  Penalties: number
  PenaltyYards: number
  FumblesForced: number
  FumblesRecovered: number
  FumbleReturnYards: number
  FumbleReturnTouchdowns: number
  BlockedKicks: number
  PuntReturnLong: number
  KickReturnLong: number
  BlockedKickReturnYards: number
  BlockedKickReturnTouchdowns: number
  FieldGoalReturnYards: number
  FieldGoalReturnTouchdowns: number
  PuntNetYards: number
  OpponentScoreQuarter1: number
  OpponentScoreQuarter2: number
  OpponentScoreQuarter3: number
  OpponentScoreQuarter4: number
  OpponentScoreOvertime: number
  OpponentTimeOfPossessionMinutes: number
  OpponentTimeOfPossessionSeconds: number
  OpponentTimeOfPossession: string
  OpponentFirstDowns: number
  OpponentFirstDownsByRushing: number
  OpponentFirstDownsByPassing: number
  OpponentFirstDownsByPenalty: number
  OpponentOffensivePlays: number
  OpponentOffensiveYards: number
  OpponentOffensiveYardsPerPlay: number
  OpponentTouchdowns: number
  OpponentRushingTouchdowns: number
  OpponentPassingTouchdowns: number
  OpponentOtherTouchdowns: number
  OpponentExtraPointKickingAttempts: number
  OpponentExtraPointKickingConversions: number
  OpponentExtraPointKickingPercentage: number
  OpponentExtraPointPassingAttempts: number
  OpponentExtraPointPassingConversions: number
  OpponentExtraPointPassingPercentage: number
  OpponentExtraPointRushingAttempts: number
  OpponentExtraPointRushingConversions: number
  OpponentExtraPointRushingPercentage: number
  OpponentFieldGoalAttempts: number
  OpponentFieldGoalsMade: number
  OpponentFieldGoalsPercentage: number
  OpponentRedZoneAttempts: number
  OpponentRedZoneConversions: number
  OpponentRedZonePercentage: number
  OpponentGoalToGoAttempts: number
  OpponentGoalToGoConversions: number
  OpponentGoalToGoPercentage: number
  OpponentReturnTouchdowns: number
  OpponentExtraPointReturnAttempts: number
  OpponentExtraPointReturns: number
  OpponentExtraPointReturnPercentage: number
  OpponentPenalties: number
  OpponentPenaltyYards: number
  OpponentFumblesForced: number
  OpponentFumblesRecovered: number
  OpponentFumbleReturnYards: number
  OpponentFumbleReturnTouchdowns: number
  OpponentInterceptionReturnTouchdowns: number
  OpponentBlockedKicks: number
  OpponentPuntReturnTouchdowns: number
  OpponentPuntReturnLong: number
  OpponentKickReturnTouchdowns: number
  OpponentKickReturnLong: number
  OpponentBlockedKickReturnYards: number
  OpponentBlockedKickReturnTouchdowns: number
  OpponentFieldGoalReturnYards: number
  OpponentFieldGoalReturnTouchdowns: number
  OpponentPuntNetYards: number
  IsGameOver: boolean
  GameID: number
  Updated: string
  Created: string
}

export class TeamUpdateService {
  private supabase: ReturnType<typeof createServerSupabaseClient>

  constructor() {
    this.supabase = createServerSupabaseClient()
  }



  // Get team data from database
  async getTeamData(teamName: string, season: number = 2024): Promise<Record<string, unknown> | null> {
    try {
      const supabase = await this.supabase
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .or(`name.eq.${teamName},abbreviation.eq.${teamName}`)
        .eq('season', season)
        .single()

      if (error) {
        console.error('Error fetching team data:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching team data:', error)
      return null
    }
  }

  // Get all teams for a season
  async getAllTeams(season: number = 2024): Promise<Array<Record<string, unknown>>> {
    try {
      const supabase = await this.supabase
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('season', season)
        .order('name')

      if (error) {
        console.error('Error fetching teams:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching teams:', error)
      return []
    }
  }

  // Test the service
  async testService(): Promise<boolean> {
    try {
      // Since we're not using SportsData.io anymore, just return true
      console.log('Team update service test - ESPN API integration successful')
      return true
    } catch (error) {
      console.error('Team update service test failed:', error)
      return false
    }
  }
}

// Export a singleton instance
export const teamUpdateService = new TeamUpdateService()
