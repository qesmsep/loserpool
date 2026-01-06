/**
 * Script to check what matchups exist in the database
 * Run this to diagnose matchup issues
 */

import { createServiceRoleClient } from './src/lib/supabase-server'
import { getCurrentSeasonInfo } from './src/lib/season-detection'

async function checkMatchups() {
  try {
    const supabase = createServiceRoleClient()
    
    // Get current season info
    const seasonInfo = await getCurrentSeasonInfo()
    console.log('Current Season Info:', {
      seasonDisplay: seasonInfo.seasonDisplay,
      currentWeek: seasonInfo.currentWeek,
      seasonYear: seasonInfo.seasonYear,
      isPreseason: seasonInfo.isPreseason,
      isRegularSeason: seasonInfo.isRegularSeason
    })
    
    // Check matchups by season
    const { data: matchupsBySeason, error: seasonError } = await supabase
      .from('matchups')
      .select('season, week, COUNT(*)')
      .group('season, week')
      .order('season', { ascending: true })
      .order('week', { ascending: true })
    
    if (seasonError) {
      console.error('Error fetching matchups by season:', seasonError)
    } else {
      console.log('\nMatchups by Season/Week:')
      console.table(matchupsBySeason)
    }
    
    // Check matchups for current season
    const { data: currentMatchups, error: currentError } = await supabase
      .from('matchups')
      .select('*')
      .eq('season', seasonInfo.seasonDisplay)
      .order('game_time', { ascending: true })
    
    if (currentError) {
      console.error('Error fetching current matchups:', currentError)
    } else {
      console.log(`\nCurrent Season Matchups (${seasonInfo.seasonDisplay}):`, currentMatchups?.length || 0)
      if (currentMatchups && currentMatchups.length > 0) {
        console.table(currentMatchups.map(m => ({
          id: m.id.substring(0, 8) + '...',
          away_team: m.away_team,
          home_team: m.home_team,
          game_time: m.game_time,
          status: m.status
        })))
      } else {
        console.log('⚠️  No matchups found for current season!')
      }
    }
    
    // Check recent matchups
    const { data: recentMatchups, error: recentError } = await supabase
      .from('matchups')
      .select('season, week, away_team, home_team, game_time, status')
      .gte('game_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('game_time', { ascending: true })
      .limit(20)
    
    if (recentError) {
      console.error('Error fetching recent matchups:', recentError)
    } else {
      console.log(`\nRecent Matchups (last 7 days):`, recentMatchups?.length || 0)
      if (recentMatchups && recentMatchups.length > 0) {
        console.table(recentMatchups)
      }
    }
    
  } catch (error) {
    console.error('Error checking matchups:', error)
  }
}

checkMatchups()

