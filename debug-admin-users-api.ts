import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yvgcrzmriygcnuhlyrcr.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Z2Nyem1yaXlnY251aGx5cmNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1MzA4NCwiZXhwIjoyMDY5NzI5MDg0fQ.w9HeUNHJTxJlSc3WGx_3Bime6hA3V9QqRu2bZ3Y0qq4'

async function debugAdminUsersAPI() {
  console.log('🔍 Starting admin users API debug...')
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Test 1: Check if we can connect to the database
    console.log('\n1. Testing database connection...')
    const { data: testData, error: testError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database connection failed:', testError)
      return
    }
    console.log('✅ Database connection successful')

    // Test 2: Check users table structure
    console.log('\n2. Checking users table structure...')
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(5)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return
    }
    console.log('✅ Users table accessible')
    console.log('Sample user data:', usersData?.[0])

    // Test 3: Check purchases table
    console.log('\n3. Checking purchases table...')
    const { data: purchasesData, error: purchasesError } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .limit(5)

    if (purchasesError) {
      console.error('❌ Error fetching purchases:', purchasesError)
      return
    }
    console.log('✅ Purchases table accessible')
    console.log('Sample purchase data:', purchasesData?.[0])

    // Test 4: Check global_settings table
    console.log('\n4. Checking global_settings table...')
    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from('global_settings')
      .select('*')

    if (settingsError) {
      console.error('❌ Error fetching global_settings:', settingsError)
      return
    }
    console.log('✅ Global settings table accessible')
    console.log('Settings data:', settingsData)

    // Test 5: Check picks table
    console.log('\n5. Checking picks table...')
    const { data: picksData, error: picksError } = await supabaseAdmin
      .from('picks')
      .select('*')
      .limit(5)

    if (picksError) {
      console.error('❌ Error fetching picks:', picksError)
      return
    }
    console.log('✅ Picks table accessible')
    console.log('Sample pick data:', picksData?.[0])

    // Test 6: Try the exact query from the admin users API
    console.log('\n6. Testing the exact admin users API query...')
    const { data: usersWithPurchases, error: usersWithPurchasesError } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        purchases(
          picks_count,
          status
        )
      `)
      .limit(5)

    if (usersWithPurchasesError) {
      console.error('❌ Error with users + purchases query:', usersWithPurchasesError)
      return
    }
    console.log('✅ Users + purchases query successful')
    console.log('Sample user with purchases:', usersWithPurchases?.[0])

    // Test 7: Check current week logic
    console.log('\n7. Testing current week logic...')
    const weekSetting = settingsData?.find(s => s.key === 'current_week')
    const currentWeek = weekSetting ? parseInt(weekSetting.value) : 1
    console.log('Current week:', currentWeek)

    let weekColumn: string
    if (currentWeek <= 3) {
      weekColumn = `pre${currentWeek}_team_matchup_id`
    } else if (currentWeek <= 20) {
      weekColumn = `reg${currentWeek - 3}_team_matchup_id`
    } else {
      weekColumn = `post${currentWeek - 20}_team_matchup_id`
    }
    console.log('Week column:', weekColumn)

    // Test 8: Try the picks query with dynamic column
    console.log('\n8. Testing picks query with dynamic column...')
    const { data: picksWithWeek, error: picksWithWeekError } = await supabaseAdmin
      .from('picks')
      .select(`user_id, status, picks_count, pick_name, ${weekColumn}`)
      .limit(5)

    if (picksWithWeekError) {
      console.error('❌ Error with picks + week column query:', picksWithWeekError)
      return
    }
    console.log('✅ Picks + week column query successful')
    console.log('Sample pick with week data:', picksWithWeek?.[0])

    console.log('\n✅ All tests passed! The admin users API should work.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

debugAdminUsersAPI()

