/**
 * Diagnostic script to check what week the app is currently detecting
 * Run this to see what week/season the app thinks we're in
 */

import { getCurrentSeasonInfo } from './src/lib/season-detection'
import { createServiceRoleClient } from './src/lib/supabase-server'

async function checkCurrentWeek() {
  try {
    console.log('🔍 Checking what week the app is detecting...\n')
    
    // Get season detection (what the app uses)
    const seasonInfo = await getCurrentSeasonInfo()
    
    console.log('📊 Season Detection Results:')
    console.log('  Current Season:', seasonInfo.currentSeason)
    console.log('  Current Week:', seasonInfo.currentWeek)
    console.log('  Season Display:', seasonInfo.seasonDisplay)
    console.log('  Is Preseason:', seasonInfo.isPreseason)
    console.log('  Is Regular Season:', seasonInfo.isRegularSeason)
    console.log('  Is Postseason:', seasonInfo.isPostseason)
    console.log('  Season Year:', seasonInfo.seasonYear)
    console.log('')
    
    // Check what matchups exist for this season
    const supabase = createServiceRoleClient()
    const { data: matchups, error } = await supabase
      .from('matchups')
      .select('id, season, week, away_team, home_team, game_time, status')
      .eq('season', seasonInfo.seasonDisplay)
      .order('game_time', { ascending: true })
    
    if (error) {
      console.error('❌ Error fetching matchups:', error)
    } else {
      console.log(`📋 Matchups for ${seasonInfo.seasonDisplay}:`, matchups?.length || 0)
      if (matchups && matchups.length > 0) {
        console.log('  Games:')
        matchups.forEach((m, i) => {
          console.log(`    ${i + 1}. ${m.away_team} @ ${m.home_team} (Week ${m.week}, Status: ${m.status})`)
          console.log(`       Game Time: ${m.game_time}`)
        })
      } else {
        console.log('  ⚠️  No matchups found for this season!')
      }
    }
    
    console.log('')
    console.log('🎯 What the app will show:')
    console.log(`  Week Display: ${seasonInfo.seasonDisplay.startsWith('POST') ? `Post Season : Week ${seasonInfo.currentWeek}` : seasonInfo.seasonDisplay.startsWith('PRE') ? `Pre Season : Week ${seasonInfo.currentWeek}` : `Regular Season : Week ${seasonInfo.currentWeek}`}`)
    console.log(`  Matchups Query: season = '${seasonInfo.seasonDisplay}'`)
    console.log(`  Database Week Column: ${seasonInfo.isPostseason ? 18 + seasonInfo.currentWeek : seasonInfo.currentWeek}`)
    
    // Check all recent matchups to see what's in the database
    console.log('')
    console.log('📊 All Recent Matchups in Database:')
    const { data: allRecent, error: recentError } = await supabase
      .from('matchups')
      .select('season, week, COUNT(*) as count')
      .gte('game_time', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('season', { ascending: true })
      .order('week', { ascending: true })
    
    if (!recentError && allRecent) {
      const grouped = allRecent.reduce((acc: Record<string, number>, m: any) => {
        const key = `${m.season}-W${m.week}`
        acc[key] = (acc[key] || 0) + parseInt(m.count)
        return acc
      }, {})
      
      Object.entries(grouped).forEach(([key, count]) => {
        console.log(`  ${key}: ${count} games`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkCurrentWeek()

