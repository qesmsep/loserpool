import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkSeasonData() {
  console.log('Checking season data...')
  
  // Check all unique season types
  const { data: seasonTypes } = await supabase
    .from('matchups')
    .select('season')
    .order('season')
  
  const uniqueSeasons = [...new Set(seasonTypes?.map(s => s.season) || [])]
  console.log('Unique season types:', uniqueSeasons)
  
  // Check week distribution
  const { data: weekDistribution } = await supabase
    .from('matchups')
    .select('week, season')
    .order('week')
  
  const byWeek = weekDistribution?.reduce((acc, m) => {
    if (!acc[m.week]) acc[m.week] = []
    acc[m.week].push(m.season)
    return acc
  }, {} as Record<number, string[]>)
  
  console.log('\nWeek distribution:')
  Object.entries(byWeek || {}).forEach(([week, seasons]) => {
    const uniqueSeasons = [...new Set(seasons)]
    console.log(`Week ${week}: ${uniqueSeasons.join(', ')} (${seasons.length} games)`)
  })
  
  // Check specific issue with PRE0
  const { data: pre0Games } = await supabase
    .from('matchups')
    .select('week, season, away_team, home_team')
    .eq('season', 'PRE0')
    .order('week')
  
  console.log(`\nPRE0 games (${pre0Games?.length || 0}):`)
  pre0Games?.forEach((game, i) => {
    console.log(`${i + 1}. Week ${game.week}: ${game.away_team} @ ${game.home_team}`)
  })
  
  // Check what should be PRE2
  const { data: week2Games } = await supabase
    .from('matchups')
    .select('week, season, away_team, home_team')
    .eq('week', 2)
    .order('season')
  
  console.log(`\nWeek 2 games (${week2Games?.length || 0}):`)
  week2Games?.forEach((game, i) => {
    console.log(`${i + 1}. ${game.season}: ${game.away_team} @ ${game.home_team}`)
  })
}

checkSeasonData().catch(console.error)
