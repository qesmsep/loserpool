import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

/**
 * Force logout all users every Tuesday at 8am
 * This ensures users must re-authenticate weekly
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN

    if (!expectedToken) {
      console.error('CRON_SECRET_TOKEN not configured')
      return NextResponse.json({ error: 'Cron token not configured' }, { status: 500 })
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      console.error('Invalid cron authentication for force-logout')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    console.log(`Force logout cron triggered at: ${now.toISOString()}`)
    
    // Only run on Tuesdays to be safe (Vercel cron should already enforce)
    if (now.getDay() !== 2) {
      console.log('Not Tuesday; skipping force logout')
      return NextResponse.json({ message: 'Not Tuesday; skipped' })
    }

    const supabase = createServiceRoleClient()

    // Get all users from auth with pagination
    let allUsers = []
    let page = 1
    const perPage = 1000
    let hasMore = true

    console.log('Fetching all users with pagination...')
    
    while (hasMore) {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
        page,
        perPage
      })
      
      if (listError) {
        console.error('Error listing users for force logout:', listError)
        return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
      }

      if (!users || users.length === 0) {
        hasMore = false
        break
      }

      allUsers = allUsers.concat(users)
      console.log(`Fetched page ${page}: ${users.length} users (total so far: ${allUsers.length})`)
      
      // If we got fewer users than perPage, we're done
      if (users.length < perPage) {
        hasMore = false
      } else {
        page++
      }
    }

    if (allUsers.length === 0) {
      console.log('No users to log out')
      return NextResponse.json({ message: 'No users found' })
    }

    console.log(`Attempting to force logout ${allUsers.length} users...`)

    // Sign out all users by invalidating their sessions
    const signOutResults = await Promise.allSettled(
      allUsers.map(user => 
        supabase.auth.admin.signOut(user.id)
      )
    )

    // Count successes and failures
    const successful = signOutResults.filter(r => r.status === 'fulfilled').length
    const failed = signOutResults.filter(r => r.status === 'rejected').length

    if (failed > 0) {
      console.warn(`Force logout completed with ${failed} failures out of ${allUsers.length} users`)
      signOutResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to logout user ${allUsers[index].email}:`, result.reason)
        }
      })
    }

    // Store timestamp of last weekly logout for reference
    const { error: settingsError } = await supabase
      .from('global_settings')
      .upsert({
        key: 'last_weekly_logout',
        value: now.toISOString()
      })

    if (settingsError) {
      console.error('Error storing last_weekly_logout timestamp:', settingsError)
    }

    const logMessage = `Force logged out ${successful} users at Tuesday 8am (${failed} failures)`
    console.log(logMessage)

    return NextResponse.json({ 
      message: logMessage,
      timestamp: now.toISOString(),
      total: allUsers.length,
      successful,
      failed
    })
  } catch (error) {
    console.error('Error in force-logout cron:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Allow GET for manual testing/verification
export async function GET() {
  const supabase = createServiceRoleClient()
  
  try {
    // Get last logout timestamp
    const { data, error } = await supabase
      .from('global_settings')
      .select('key, value, updated_at')
      .eq('key', 'last_weekly_logout')
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get current user count
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      lastLogout: data || null,
      currentUserCount: users?.length || 0,
      nextScheduledLogout: 'Every Tuesday at 8:00 AM'
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

