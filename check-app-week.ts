/**
 * Check what week the app is currently detecting
 * Run with: npx tsx check-app-week.ts
 */

// Load environment variables
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Try multiple env file locations
const envPaths = ['.env.local', '.env']
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}

import { createServiceRoleClient } from './src/lib/supabase-server'
import { getCurrentSeasonInfo } from './src/lib/season-detection'

async function checkAppWeek() {
  try {
    const supabase = createServiceRoleClient()
    
    console.log('🔍 Checking what week the app is detecting...\n')
    
    // 1. Get season detection (what the app uses)
    console.log('1️⃣ Season Detection Results:')
    const seasonInfo = await getCurrentSeasonInfo()
    console.log('   Current Season:', seasonInfo.currentSeason)
    console.log('   Current Week:', seasonInfo.currentWeek)
    console.log('   Season Display:', seasonInfo.seasonDisplay)
    console.log('   Is Postseason:', seasonInfo.isPostseason)
    console.log('   Season Year:', seasonInfo.seasonYear)
    console.log('')
    
    // 2. Check all matchups by season
    console.log('2️⃣ All Matchups by Season/Week:')
    const { data: matchupsBySeason, error: seasonError } = await supabase
      .from('matchups')
      .select('season, week')
      .order('season', { ascending: true })
      .order('week', { ascending: true })
    
    if (seasonError) {
      console.error('   ❌ Error:', seasonError.message)
    } else if (matchupsBySeason) {
      const grouped = matchupsBySeason.reduce((acc: Record<string, { count: number; weeks: Set<number> }>, m: any) => {
        const key = m.season || 'UNKNOWN'
        if (!acc[key]) {
          acc[key] = { count: 0, weeks: new Set() }
        }
        acc[key].count++
        acc[key].weeks.add(m.week)
        return acc
      }, {})
      
      Object.entries(grouped).forEach(([season, data]) => {
        const weeks = Array.from(data.weeks).sort((a, b) => a - b)
        console.log(`   ${season}: ${data.count} games, weeks: ${weeks.join(', ')}`)
      })
    }
    console.log('')
    
    // 3. Check what matchups exist for the detected season
    console.log(`3️⃣ Matchups for Detected Season (${seasonInfo.seasonDisplay}):`)
    const { data: currentMatchups, error: currentError } = await supabase
      .from('matchups')
      .select('id, season, week, away_team, home_team, game_time, status')
      .eq('season', seasonInfo.seasonDisplay)
      .order('game_time', { ascending: true })
    
    if (currentError) {
      console.error('   ❌ Error:', currentError.message)
    } else if (currentMatchups && currentMatchups.length > 0) {
      console.log(`   ✅ Found ${currentMatchups.length} matchups:`)
      currentMatchups.forEach((m, i) => {
        const gameTime = new Date(m.game_time).toLocaleString()
        console.log(`      ${i + 1}. ${m.away_team} @ ${m.home_team}`)
        console.log(`         Week: ${m.week}, Status: ${m.status}, Time: ${gameTime}`)
      })
    } else {
      console.log(`   ⚠️  NO MATCHUPS FOUND for ${seasonInfo.seasonDisplay}!`)
      console.log('   This is why the app is not showing matchups.')
    }
    console.log('')
    
    // 4. Check for non-final games (what determines current week)
    console.log('4️⃣ Non-Final Games (Determines Current Week):')
    const { data: nonFinal, error: nonFinalError } = await supabase
      .from('matchups')
      .select('season, week, COUNT(*)')
      .neq('status', 'final')
      .order('season', { ascending: true })
      .order('week', { ascending: true })
    
    if (nonFinalError) {
      console.error('   ❌ Error:', nonFinalError.message)
    } else if (nonFinal && nonFinal.length > 0) {
      console.log('   Games with non-final status:')
      // Group by season and week
      const grouped = nonFinal.reduce((acc: Record<string, number>, m: any) => {
        const key = `${m.season}-W${m.week}`
        acc[key] = (acc[key] || 0) + parseInt(m.count)
        return acc
      }, {})
      
      Object.entries(grouped).forEach(([key, count]) => {
        console.log(`      ${key}: ${count} games`)
      })
    } else {
      console.log('   ⚠️  No non-final games found')
    }
    console.log('')
    
    // 5. Check recent matchups (last 7 days)
    console.log('5️⃣ Recent Matchups (Last 7 Days):')
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recent, error: recentError } = await supabase
      .from('matchups')
      .select('season, week, away_team, home_team, game_time, status')
      .gte('game_time', sevenDaysAgo)
      .order('game_time', { ascending: true })
      .limit(20)
    
    if (recentError) {
      console.error('   ❌ Error:', recentError.message)
    } else if (recent && recent.length > 0) {
      console.log(`   Found ${recent.length} recent games:`)
      recent.forEach((m, i) => {
        const gameTime = new Date(m.game_time).toLocaleString()
        console.log(`      ${i + 1}. ${m.season} W${m.week}: ${m.away_team} @ ${m.home_team} (${m.status}) - ${gameTime}`)
      })
    } else {
      console.log('   No recent games found')
    }
    console.log('')
    
    // 6. Check playoff matchups specifically
    console.log('6️⃣ Playoff Matchups:')
    const { data: playoff, error: playoffError } = await supabase
      .from('matchups')
      .select('season, week, away_team, home_team, game_time, status')
      .like('season', 'POST%')
      .order('season', { ascending: true })
      .order('game_time', { ascending: true })
    
    if (playoffError) {
      console.error('   ❌ Error:', playoffError.message)
    } else if (playoff && playoff.length > 0) {
      console.log(`   Found ${playoff.length} playoff games:`)
      playoff.forEach((m, i) => {
        const gameTime = new Date(m.game_time).toLocaleString()
        console.log(`      ${i + 1}. ${m.season} (Week ${m.week}): ${m.away_team} @ ${m.home_team} (${m.status}) - ${gameTime}`)
      })
    } else {
      console.log('   ⚠️  No playoff matchups found in database')
    }
    console.log('')
    
    // Summary
    console.log('📊 SUMMARY:')
    console.log(`   App is detecting: ${seasonInfo.seasonDisplay} (Week ${seasonInfo.currentWeek})`)
    console.log(`   Matchups for this season: ${currentMatchups?.length || 0}`)
    if (currentMatchups && currentMatchups.length === 0) {
      console.log('   ⚠️  PROBLEM: No matchups found for detected season!')
      console.log('   💡 Solution: Run the cron job to fetch matchups from ESPN API')
    } else {
      console.log('   ✅ Matchups exist for detected season')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkAppWeek()

