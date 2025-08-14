import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkAndFixCurrentWeek() {
  console.log('Checking current week setting...')
  
  // Check current week setting
  const { data: weekSetting } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'current_week')
    .single()
  
  const currentWeek = weekSetting?.value || '1'
  console.log(`Current week setting: ${currentWeek}`)
  
  // Update to week 2 (preseason week 2)
  const { error: updateError } = await supabase
    .from('global_settings')
    .update({ value: '2' })
    .eq('key', 'current_week')
  
  if (updateError) {
    console.error('Error updating current week:', updateError)
  } else {
    console.log('✅ Updated current week to 2 (Preseason Week 2)')
  }
  
  // Verify the update
  const { data: newWeekSetting } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'current_week')
    .single()
  
  console.log(`New current week setting: ${newWeekSetting?.value}`)
  
  // Check what games should be showing for week 2
  const { data: week2Games } = await supabase
    .from('matchups')
    .select('*')
    .eq('week', 2)
    .order('game_time')
  
  console.log(`\nGames for Week 2: ${week2Games?.length || 0}`)
  
  if (week2Games && week2Games.length > 0) {
    console.log('\nFirst few games:')
    week2Games.slice(0, 5).forEach(game => {
      console.log(`- ${game.away_team} @ ${game.home_team} (${game.season}) - ${game.venue}`)
    })
  }
}

checkAndFixCurrentWeek().catch(console.error)
