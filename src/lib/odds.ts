import { supabase } from './supabase'

export interface TeamOdds {
  id?: string
  matchup_id: string
  team: string
  opponent: string
  week: number
  odds_to_win: number
  odds_to_lose: number
  is_locked: boolean
  locked_at?: string
  created_at?: string
  updated_at?: string
}

export interface DraftKingsOdds {
  gameId: string
  homeTeam: string
  awayTeam: string
  homeOdds: number
  awayOdds: number
  gameTime: string
}

// DraftKings API endpoint (this would need to be updated with actual API)
const DRAFTKINGS_API_BASE = 'https://api.draftkings.com/sports/v1'

export async function fetchDraftKingsOdds(week: number): Promise<DraftKingsOdds[]> {
  try {
    console.log(`Fetching DraftKings odds for week ${week}`)
    
    // TODO: Replace with actual DraftKings API integration
    // This would require:
    // 1. DraftKings API credentials
    // 2. Proper API endpoint for NFL odds
    // 3. Authentication headers
    
    // For now, return realistic mock data based on typical NFL odds
    const mockOdds: DraftKingsOdds[] = [
      {
        gameId: 'game1',
        homeTeam: 'Kansas City Chiefs',
        awayTeam: 'Baltimore Ravens',
        homeOdds: -150, // Chiefs favored by 1.5 points
        awayOdds: +130, // Ravens underdog
        gameTime: '2025-09-04T20:20:00Z'
      },
      {
        gameId: 'game2',
        homeTeam: 'Buffalo Bills',
        awayTeam: 'New York Jets',
        homeOdds: -200, // Bills heavily favored
        awayOdds: +170, // Jets underdog
        gameTime: '2025-09-07T17:00:00Z'
      },
      {
        gameId: 'game3',
        homeTeam: 'Dallas Cowboys',
        awayTeam: 'New York Giants',
        homeOdds: -180, // Cowboys favored
        awayOdds: +155, // Giants underdog
        gameTime: '2025-09-07T20:20:00Z'
      },
      {
        gameId: 'game4',
        homeTeam: 'Green Bay Packers',
        awayTeam: 'Chicago Bears',
        homeOdds: -120, // Packers slightly favored
        awayOdds: +100, // Bears even odds
        gameTime: '2025-09-08T13:00:00Z'
      }
    ]
    
    return mockOdds
  } catch (error) {
    console.error('Error fetching DraftKings odds:', error)
    throw new Error('Failed to fetch odds from DraftKings')
  }
}

export async function saveOddsToDatabase(odds: DraftKingsOdds[], week: number): Promise<void> {
  try {
    // Convert DraftKings odds to our format
    const teamOdds: Omit<TeamOdds, 'id' | 'created_at' | 'updated_at'>[] = []
    
    for (const game of odds) {
      // Calculate odds to lose (inverse of odds to win)
      const homeOddsToLose = 100 / (1 + Math.abs(game.homeOdds) / 100)
      const awayOddsToLose = 100 / (1 + Math.abs(game.awayOdds) / 100)
      
      // Find matchup in database
      const { data: matchup } = await supabase
        .from('matchups')
        .select('id')
        .eq('week', week)
        .or(`home_team.eq.${game.homeTeam},away_team.eq.${game.homeTeam}`)
        .single()
      
      if (matchup) {
        // Home team odds
        teamOdds.push({
          matchup_id: matchup.id,
          team: game.homeTeam,
          opponent: game.awayTeam,
          week,
          odds_to_win: Math.abs(game.homeOdds),
          odds_to_lose: homeOddsToLose,
          is_locked: false
        })
        
        // Away team odds
        teamOdds.push({
          matchup_id: matchup.id,
          team: game.awayTeam,
          opponent: game.homeTeam,
          week,
          odds_to_win: Math.abs(game.awayOdds),
          odds_to_lose: awayOddsToLose,
          is_locked: false
        })
      }
    }
    
    // Save to database
    const { error } = await supabase
      .from('team_odds')
      .upsert(teamOdds, { onConflict: 'matchup_id,team,week' })
    
    if (error) {
      throw error
    }
    
    console.log(`Saved ${teamOdds.length} odds records for week ${week}`)
  } catch (error) {
    console.error('Error saving odds to database:', error)
    throw new Error('Failed to save odds to database')
  }
}

export async function lockOddsForWeek(week: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('team_odds')
      .update({ 
        is_locked: true, 
        locked_at: new Date().toISOString() 
      })
      .eq('week', week)
      .eq('is_locked', false)
    
    if (error) {
      throw error
    }
    
    console.log(`Locked odds for week ${week}`)
  } catch (error) {
    console.error('Error locking odds:', error)
    throw new Error('Failed to lock odds')
  }
}

export async function getLockedOddsForWeek(week: number): Promise<TeamOdds[]> {
  try {
    const { data, error } = await supabase
      .from('team_odds')
      .select('*')
      .eq('week', week)
      .eq('is_locked', true)
      .order('odds_to_lose', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Error fetching locked odds:', error)
    throw new Error('Failed to fetch locked odds')
  }
}

export async function assignRandomPicksForUser(
  userId: string, 
  week: number, 
  strategy: 'best_odds_losing' | 'best_odds_winning'
): Promise<void> {
  try {
    // Get user's current picks for the week
    const { data: existingPicks } = await supabase
      .from('picks')
      .select('matchup_id, team_picked')
      .eq('user_id', userId)
      .eq('week', week)
    
    if (existingPicks && existingPicks.length > 0) {
      console.log(`User ${userId} already has picks for week ${week}`)
      return
    }
    
    // Get locked odds for the week
    const odds = await getLockedOddsForWeek(week)
    
    if (odds.length === 0) {
      console.log(`No locked odds found for week ${week}`)
      return
    }
    
    // Get user's available picks
    const { data: userProfile } = await supabase
      .from('users')
      .select('picks_remaining')
      .eq('id', userId)
      .single()
    
    if (!userProfile || userProfile.picks_remaining <= 0) {
      console.log(`User ${userId} has no picks remaining`)
      return
    }
    
    // Sort odds based on strategy
    const sortedOdds = strategy === 'best_odds_losing' 
      ? odds.sort((a, b) => b.odds_to_lose - a.odds_to_lose) // Higher odds to lose first
      : odds.sort((a, b) => a.odds_to_win - b.odds_to_win)   // Lower odds to win first
    
    // Assign random picks (weighted by odds)
    const picksToAssign = Math.min(userProfile.picks_remaining, sortedOdds.length)
    const selectedOdds = weightedRandomSelection(sortedOdds, picksToAssign, strategy)
    
    // Create pick records
    const picks = selectedOdds.map(odd => ({
      user_id: userId,
      matchup_id: odd.matchup_id,
      team_picked: odd.team,
      picks_count: 1,
      week,
      status: 'active',
      is_random: true
    }))
    
    // Save picks to database
    const { error } = await supabase
      .from('picks')
      .insert(picks)
    
    if (error) {
      throw error
    }
    
    console.log(`Assigned ${picks.length} random picks to user ${userId} for week ${week}`)
  } catch (error) {
    console.error('Error assigning random picks:', error)
    throw new Error('Failed to assign random picks')
  }
}

function weightedRandomSelection(
  odds: TeamOdds[], 
  count: number, 
  strategy: 'best_odds_losing' | 'best_odds_winning'
): TeamOdds[] {
  const selected: TeamOdds[] = []
  const available = [...odds]
  
  for (let i = 0; i < count && available.length > 0; i++) {
    // Calculate weights based on strategy
    const weights = available.map(odd => {
      const weight = strategy === 'best_odds_losing' 
        ? odd.odds_to_lose 
        : (100 - odd.odds_to_win)
      return Math.max(weight, 1) // Ensure minimum weight of 1
    })
    
    // Select random item based on weights
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let random = Math.random() * totalWeight
    
    for (let j = 0; j < available.length; j++) {
      random -= weights[j]
      if (random <= 0) {
        selected.push(available[j])
        available.splice(j, 1)
        break
      }
    }
  }
  
  return selected
}

export async function processAutoRandomPicks(week: number): Promise<void> {
  try {
    // Check if auto random picks is enabled
    const { data: settings } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'auto_random_picks')
      .single()
    
    if (!settings || settings.value !== 'true') {
      console.log('Auto random picks is disabled')
      return
    }
    
    // Get strategy
    const { data: strategySetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'random_pick_strategy')
      .single()
    
    const strategy = (strategySetting?.value as 'best_odds_losing' | 'best_odds_winning') || 'best_odds_losing'
    
    // Get all users who haven't made picks for this week
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .gt('picks_remaining', 0)
    
    if (!users) {
      console.log('No users found for auto random picks')
      return
    }
    
    // Assign random picks to each user
    for (const user of users) {
      await assignRandomPicksForUser(user.id, week, strategy)
    }
    
    console.log(`Processed auto random picks for week ${week}`)
  } catch (error) {
    console.error('Error processing auto random picks:', error)
    throw new Error('Failed to process auto random picks')
  }
}
