import { sportsDataService } from './sportsdata-service'
import { createServerSupabaseClient } from './supabase-server'

interface SportsDataTeam {
  TeamID: number
  Key: string
  City: string
  Name: string
  Conference: string
  Division: string
  PrimaryColor: string
  SecondaryColor: string
  WikipediaLogoUrl: string
  StadiumDetails?: {
    StadiumID: number
    Name: string
    City: string
    State: string
    Country: string
    Capacity?: number
  }
}

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
  Touchdowns: number
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
  InterceptionReturnTouchdowns: number
  BlockedKicks: number
  PuntReturnTouchdowns: number
  PuntReturnLong: number
  KickReturnTouchdowns: number
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
  SeasonType: number
  Updated: string
  Created: string
}

export class TeamUpdateService {
  private supabase: any

  constructor() {
    this.supabase = createServerSupabaseClient()
  }

  // Update all team data from SportsData.io
  async updateAllTeams(season: number = 2024): Promise<{ success: boolean; message: string; teamsUpdated: number }> {
    try {
      console.log(`Starting team data update for season ${season}`)
      
      // Get teams from SportsData.io
      const teams = await sportsDataService.getTeams()
      console.log(`Retrieved ${teams.length} teams from SportsData.io`)

      // Get team stats for the current season
      const teamStats = await this.getTeamStats(season)
      console.log(`Retrieved stats for ${teamStats.length} teams`)

      let teamsUpdated = 0

      for (const team of teams) {
        try {
          const teamStatsData = teamStats.find(stat => stat.TeamID === team.TeamID)
          const record = teamStatsData ? `${teamStatsData.Wins}-${teamStatsData.Losses}${teamStatsData.Ties > 0 ? `-${teamStatsData.Ties}` : ''}` : '0-0'
          
          const teamData = {
            team_id: team.TeamID,
            name: `${team.City} ${team.Name}`,
            abbreviation: team.Key,
            city: team.City,
            mascot: team.Name,
            conference: team.Conference,
            division: team.Division,
            primary_color: team.PrimaryColor,
            secondary_color: team.SecondaryColor,
            logo_url: team.WikipediaLogoUrl,
            stadium_name: team.StadiumDetails?.Name || null,
            stadium_city: team.StadiumDetails?.City || null,
            stadium_state: team.StadiumDetails?.State || null,
            stadium_capacity: team.StadiumDetails?.Capacity || null,
            current_record: record,
            wins: teamStatsData?.Wins || 0,
            losses: teamStatsData?.Losses || 0,
            ties: teamStatsData?.Ties || 0,
            season: season,
            rank: null, // Will be calculated separately if needed
            last_api_update: new Date().toISOString()
          }

          // Upsert team data
          const { error } = await this.supabase
            .from('teams')
            .upsert(teamData, { 
              onConflict: 'team_id,season',
              ignoreDuplicates: false 
            })

          if (error) {
            console.error(`Error updating team ${team.Key}:`, error)
          } else {
            teamsUpdated++
          }
        } catch (error) {
          console.error(`Error processing team ${team.Key}:`, error)
        }
      }

      console.log(`Successfully updated ${teamsUpdated} teams`)
      return {
        success: true,
        message: `Successfully updated ${teamsUpdated} teams`,
        teamsUpdated
      }

    } catch (error) {
      console.error('Error updating teams:', error)
      return {
        success: false,
        message: `Error updating teams: ${error}`,
        teamsUpdated: 0
      }
    }
  }

  // Get team stats from SportsData.io
  private async getTeamStats(season: number): Promise<TeamStats[]> {
    try {
      const url = `https://api.sportsdata.io/v3/nfl/stats/json/TeamSeasonStats/${season}?key=${process.env.SPORTSDATA_API_KEY || '3a12d524ec444d6f8efad7e833461d17'}`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`SportsData.io API error: ${response.status} ${response.statusText}`)
      }

      const stats = await response.json()
      return stats || []
    } catch (error) {
      console.error('Error fetching team stats:', error)
      return []
    }
  }

  // Get team data from database
  async getTeamData(teamName: string, season: number = 2024): Promise<any> {
    try {
      const { data, error } = await this.supabase
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
  async getAllTeams(season: number = 2024): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
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
      const result = await this.updateAllTeams(2024)
      return result.success
    } catch (error) {
      console.error('Team update service test failed:', error)
      return false
    }
  }
}

// Export a singleton instance
export const teamUpdateService = new TeamUpdateService()
