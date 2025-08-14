import { createClient } from '@supabase/supabase-js'
import { sportsDataService } from './src/lib/sportsdata-service'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function importSeason2025Fixed() {
  console.log('Importing 2025 NFL season with correct season mapping...')
  
  const season = 2025
  
  // Define all weeks with correct season mapping
  const allWeeks = [
    // Preseason (Week 0-4)
    { week: 0, season: 'PRE0', description: 'Preseason Week 0' },
    { week: 1, season: 'PRE1', description: 'Preseason Week 1' },
    { week: 2, season: 'PRE2', description: 'Preseason Week 2' },
    { week: 3, season: 'PRE3', description: 'Preseason Week 3' },
    { week: 4, season: 'PRE4', description: 'Preseason Week 4' },
    // Regular Season (Week 1-18)
    { week: 1, season: 'REG1', description: 'Regular Season Week 1' },
    { week: 2, season: 'REG2', description: 'Regular Season Week 2' },
    { week: 3, season: 'REG3', description: 'Regular Season Week 3' },
    { week: 4, season: 'REG4', description: 'Regular Season Week 4' },
    { week: 5, season: 'REG5', description: 'Regular Season Week 5' },
    { week: 6, season: 'REG6', description: 'Regular Season Week 6' },
    { week: 7, season: 'REG7', description: 'Regular Season Week 7' },
    { week: 8, season: 'REG8', description: 'Regular Season Week 8' },
    { week: 9, season: 'REG9', description: 'Regular Season Week 9' },
    { week: 10, season: 'REG10', description: 'Regular Season Week 10' },
    { week: 11, season: 'REG11', description: 'Regular Season Week 11' },
    { week: 12, season: 'REG12', description: 'Regular Season Week 12' },
    { week: 13, season: 'REG13', description: 'Regular Season Week 13' },
    { week: 14, season: 'REG14', description: 'Regular Season Week 14' },
    { week: 15, season: 'REG15', description: 'Regular Season Week 15' },
    { week: 16, season: 'REG16', description: 'Regular Season Week 16' },
    { week: 17, season: 'REG17', description: 'Regular Season Week 17' },
    { week: 18, season: 'REG18', description: 'Regular Season Week 18' },
    // Postseason (Week 19-22)
    { week: 19, season: 'POST1', description: 'Wild Card Round' },
    { week: 20, season: 'POST2', description: 'Divisional Round' },
    { week: 21, season: 'POST3', description: 'Conference Championships' },
    { week: 22, season: 'POST4', description: 'Super Bowl' }
  ]
  
  let totalAdded = 0
  let totalSkipped = 0
  let totalErrors = 0
  
  for (const weekInfo of allWeeks) {
    console.log(`\n=== Processing ${weekInfo.description} (Week ${weekInfo.week}) ===`)
    
    try {
      // Get games from SportsData.io
      const games = await sportsDataService.getGames(season, weekInfo.week)
      console.log(`Retrieved ${games.length} games from SportsData.io for ${weekInfo.description}`)
      
      if (games.length === 0) {
        console.log(`No games found for ${weekInfo.description}, skipping...`)
        continue
      }
      
      let weekAdded = 0
      let weekSkipped = 0
      let weekErrors = 0
      
      for (const game of games) {
        try {
          const matchupData = sportsDataService.convertGameToMatchup(game)
          
          // Check if matchup already exists (don't overwrite)
          const { data: existingMatchup } = await supabase
            .from('matchups')
            .select('id')
            .eq('week', weekInfo.week)
            .eq('season', weekInfo.season) // Use the correct season type
            .eq('away_team', matchupData.away_team)
            .eq('home_team', matchupData.home_team)
            .single()
          
          if (existingMatchup) {
            console.log(`⏭️  Skipped (exists): ${matchupData.away_team} @ ${matchupData.home_team}`)
            weekSkipped++
            continue
          }
          
          // Insert new matchup with correct season type
          const { error: insertError } = await supabase
            .from('matchups')
            .insert({
              week: weekInfo.week,
              season: weekInfo.season, // Use the correct season type from weekInfo
              away_team: matchupData.away_team,
              home_team: matchupData.home_team,
              game_time: matchupData.game_time,
              status: matchupData.status,
              away_score: matchupData.away_score,
              home_score: matchupData.home_score,
              away_spread: matchupData.away_spread,
              home_spread: matchupData.home_spread,
              over_under: matchupData.over_under,
              venue: matchupData.venue,
              data_source: 'sportsdata.io',
              last_api_update: new Date().toISOString()
            })
          
          if (insertError) {
            console.error(`❌ Error: ${matchupData.away_team} @ ${matchupData.home_team} - ${insertError.message}`)
            weekErrors++
          } else {
            console.log(`✅ Added: ${matchupData.away_team} @ ${matchupData.home_team} → ${matchupData.venue} (${weekInfo.season})`)
            weekAdded++
          }
          
        } catch (gameError) {
          console.error(`❌ Game error: ${gameError}`)
          weekErrors++
        }
      }
      
      totalAdded += weekAdded
      totalSkipped += weekSkipped
      totalErrors += weekErrors
      
      console.log(`${weekInfo.description} Summary: ${weekAdded} added, ${weekSkipped} skipped, ${weekErrors} errors`)
      
      // Small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (weekError) {
      console.error(`❌ ${weekInfo.description} error:`, weekError)
      totalErrors++
    }
  }
  
  console.log('\n=== COMPLETE SEASON 2025 IMPORT SUMMARY ===')
  console.log(`✅ Total games added: ${totalAdded}`)
  console.log(`⏭️  Total games skipped (already exist): ${totalSkipped}`)
  console.log(`❌ Total errors: ${totalErrors}`)
  console.log(`📊 Total processed: ${totalAdded + totalSkipped + totalErrors}`)
  
  // Final verification by season type
  const { data: allMatchups } = await supabase
    .from('matchups')
    .select('week, season')
    .order('week')
  
  const bySeason = allMatchups?.reduce((acc, m) => {
    const seasonType = m.season.substring(0, 3) // PRE, REG, or POST
    if (!acc[seasonType]) acc[seasonType] = []
    acc[seasonType].push(m)
    return acc
  }, {} as Record<string, any[]>)
  
  console.log('\n=== FINAL DATABASE STATUS BY SEASON TYPE ===')
  Object.entries(bySeason || {}).forEach(([seasonType, games]) => {
    const byWeek = games.reduce((acc, g) => {
      acc[g.week] = (acc[g.week] || 0) + 1
      return acc
    }, {} as Record<number, number>)
    
    console.log(`\n${seasonType} (${games.length} total games):`)
    Object.entries(byWeek).forEach(([week, count]) => {
      console.log(`  Week ${week}: ${count} games`)
    })
  })
  
  console.log(`\nTotal matchups in database: ${allMatchups?.length || 0}`)
}

importSeason2025Fixed().catch(console.error)
