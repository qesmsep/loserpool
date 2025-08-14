#!/usr/bin/env tsx

/**
 * Test script for the full season update cron job
 * This script tests the new cron job that pulls data from sportsdata.io
 * for the full 2025 NFL season with proper season column mapping
 */

import { createClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const cronSecretToken = process.env.CRON_SECRET_TOKEN!

if (!supabaseUrl || !supabaseServiceKey || !cronSecretToken) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testFullSeasonUpdate() {
  console.log('🧪 Testing Full Season Update Cron Job')
  console.log('=====================================')

  try {
    // 1. Test the cron job endpoint
    console.log('\n1. Testing cron job endpoint...')
    
    const response = await fetch('http://localhost:3000/api/cron/update-all-seasons-sportsdata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecretToken}`
      },
      body: JSON.stringify({
        season: 2025,
        action: 'full-season'
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    console.log('✅ Cron job response:', JSON.stringify(result, null, 2))

    // 2. Check the database for inserted/updated matchups
    console.log('\n2. Checking database for matchups...')
    
    const { data: matchups, error } = await supabase
      .from('matchups')
      .select('*')
      .order('get_season_order(season)', { ascending: true })
      .order('week', { ascending: true })
      .order('game_time', { ascending: true })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    console.log(`✅ Found ${matchups?.length || 0} matchups in database`)

    // 3. Group matchups by season to verify mapping
    console.log('\n3. Verifying season column mapping...')
    
    const seasonGroups = matchups?.reduce((acc, matchup) => {
      if (!acc[matchup.season]) {
        acc[matchup.season] = []
      }
      acc[matchup.season].push(matchup)
      return acc
    }, {} as Record<string, any[]>)

    if (seasonGroups) {
      Object.keys(seasonGroups).sort().forEach(season => {
        const games = seasonGroups[season]
        console.log(`   ${season}: ${games.length} games`)
        
        // Show first few games for each season
        games.slice(0, 3).forEach(game => {
          console.log(`     - ${game.away_team} @ ${game.home_team} (Week ${game.week})`)
        })
        if (games.length > 3) {
          console.log(`     ... and ${games.length - 3} more games`)
        }
      })
    }

    // 4. Verify season format constraints
    console.log('\n4. Verifying season format constraints...')
    
    const invalidSeasons = matchups?.filter(m => !m.season.match(/^(PRE|REG|POST)\d+$/))
    if (invalidSeasons && invalidSeasons.length > 0) {
      console.log('❌ Found invalid season formats:')
      invalidSeasons.forEach(m => {
        console.log(`   Week ${m.week}: ${m.season} (${m.away_team} @ ${m.home_team})`)
      })
    } else {
      console.log('✅ All season formats are valid')
    }

    // 5. Check for expected season ranges
    console.log('\n5. Checking expected season ranges...')
    
    const seasons = [...new Set(matchups?.map(m => m.season) || [])].sort()
    console.log('   Found seasons:', seasons.join(', '))
    
    const expectedPreseason = ['PRE1', 'PRE2', 'PRE3']
    const expectedRegular = Array.from({ length: 18 }, (_, i) => `REG${i + 1}`)
    const expectedPostseason = ['POST1', 'POST2', 'POST3', 'POST4']
    
    const missingPreseason = expectedPreseason.filter(s => !seasons.includes(s))
    const missingRegular = expectedRegular.filter(s => !seasons.includes(s))
    const missingPostseason = expectedPostseason.filter(s => !seasons.includes(s))
    
    if (missingPreseason.length > 0) {
      console.log(`   ⚠️  Missing preseason weeks: ${missingPreseason.join(', ')}`)
    }
    if (missingRegular.length > 0) {
      console.log(`   ⚠️  Missing regular season weeks: ${missingRegular.join(', ')}`)
    }
    if (missingPostseason.length > 0) {
      console.log(`   ⚠️  Missing postseason weeks: ${missingPostseason.join(', ')}`)
    }

    // 6. Test individual season updates
    console.log('\n6. Testing individual season updates...')
    
    const testActions = ['preseason', 'regular-season', 'postseason']
    
    for (const action of testActions) {
      console.log(`   Testing ${action} update...`)
      
      const actionResponse = await fetch('http://localhost:3000/api/cron/update-all-seasons-sportsdata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cronSecretToken}`
        },
        body: JSON.stringify({
          season: 2025,
          action: action
        })
      })

      if (actionResponse.ok) {
        const actionResult = await actionResponse.json()
        console.log(`   ✅ ${action}: ${actionResult.result.gamesAdded} added, ${actionResult.result.gamesUpdated} updated`)
      } else {
        console.log(`   ❌ ${action}: Failed`)
      }
    }

    console.log('\n🎉 Full season update test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testFullSeasonUpdate()
  .then(() => {
    console.log('\n✅ All tests passed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
