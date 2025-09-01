import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yvgcrzmriygcnuhlyrcr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Z2Nyem1yaXlnY251aGx5cmNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNTMwODQsImV4cCI6MjA2OTcyOTA4NH0.JXH8Enbnm-K0Uaco2MrUav9FCRUqOB2Molz345ItUmI'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Z2Nyem1yaXlnY251aGx5cmNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1MzA4NCwiZXhwIjoyMDY5NzI5MDg0fQ.w9HeUNHJTxJlSc3WGx_3Bime6hA3V9QqRu2bZ3Y0qq4'

async function testAdminAuth() {
  console.log('🔍 Testing admin authentication...')
  
  // Test 1: Try to get user by email
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Find the user by email
    console.log('\n1. Looking for user: tim@828.life')
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'tim@828.life')
      .single()

    if (userError) {
      console.error('❌ Error finding user:', userError)
      return
    }

    console.log('✅ User found:', {
      id: userData.id,
      email: userData.email,
      is_admin: userData.is_admin,
      username: userData.username
    })

    // Test 2: Check if user is admin
    if (!userData.is_admin) {
      console.log('❌ User is not admin')
      return
    }

    console.log('✅ User is admin')

    // Test 3: Try the exact query from requireAdmin
    console.log('\n2. Testing requireAdmin query...')
    const { data: adminCheck, error: adminCheckError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', userData.id)
      .single()

    if (adminCheckError) {
      console.error('❌ Error checking admin status:', adminCheckError)
      return
    }

    console.log('✅ Admin check successful:', adminCheck)

    // Test 4: Simulate the full admin users API query
    console.log('\n3. Testing full admin users API query...')
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        purchases(
          picks_count,
          status
        )
      `)

    if (usersError) {
      console.error('❌ Error fetching users with purchases:', usersError)
      return
    }

    console.log('✅ Users with purchases query successful')
    console.log(`Found ${usersData?.length || 0} users`)

    // Test 5: Get current week
    console.log('\n4. Testing current week query...')
    const { data: settings } = await supabaseAdmin
      .from('global_settings')
      .select('key, value')
      .in('key', ['current_week'])

    const weekSetting = settings?.find(s => s.key === 'current_week')
    const currentWeek = weekSetting ? parseInt(weekSetting.value) : 1
    console.log('Current week:', currentWeek)

    // Test 6: Test picks query
    console.log('\n5. Testing picks query...')
    let weekColumn: string
    if (currentWeek <= 3) {
      weekColumn = `pre${currentWeek}_team_matchup_id`
    } else if (currentWeek <= 20) {
      weekColumn = `reg${currentWeek - 3}_team_matchup_id`
    } else {
      weekColumn = `post${currentWeek - 20}_team_matchup_id`
    }

    const { data: picks, error: picksError } = await supabaseAdmin
      .from('picks')
      .select(`user_id, status, picks_count, pick_name, ${weekColumn}`)

    if (picksError) {
      console.error('❌ Error fetching picks:', picksError)
      return
    }

    console.log('✅ Picks query successful')
    console.log(`Found ${picks?.length || 0} picks`)

    console.log('\n✅ All admin authentication tests passed!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testAdminAuth()

