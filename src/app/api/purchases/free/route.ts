import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { getPoolStatus } from '@/lib/pool-status'
import { isUserTester } from '@/lib/user-types'
import { sendAdminPurchaseNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { picks_count } = await request.json()

    // Get headers
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    const hasBearer = !!authHeader && authHeader.toLowerCase().startsWith('bearer ')

    // Build the right client
    const supabase = hasBearer
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: authHeader! } }
        })
      : await createServerSupabaseClient()

    // Authenticate
    let userId: string
    
    if (hasBearer) {
      // Bearer Token
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log({ authMethod: 'bearer', hasUser: !!user, error: error?.message })
      
      if (error || !user) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
      }
      userId = user.id
    } else {
      // Cookie Session
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log({ authMethod: 'cookie', hasSession: !!session, error: error?.message })
      
      if (error || !session) {
        return NextResponse.json({ error: 'No session found' }, { status: 401 })
      }
      userId = session.user.id
    }

    // Check pool lock status
    const poolStatus = await getPoolStatus()
    if (poolStatus.isLocked) {
      return NextResponse.json({ error: 'Pool is locked - no new purchases allowed' }, { status: 400 })
    }

    // Get admin settings
    const { data: settings } = await supabase
      .from('global_settings')
      .select('key, value')
      .in('key', ['pick_price', 'max_total_entries', 'entries_per_user'])

    // Get total picks purchased
    const { data: purchases } = await supabase
      .from('purchases')
      .select('picks_count')
      .eq('status', 'completed')

    // Get current user's picks purchased
    const { data: userPurchases } = await supabase
      .from('purchases')
      .select('picks_count')
      .eq('user_id', userId)
      .eq('status', 'completed')

    // Create settings map
    const settingsMap = settings?.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>) || {}

    const pickPrice = parseInt(settingsMap.pick_price || '21')
    const maxTotalEntries = parseInt(settingsMap.max_total_entries || '2100')
    const entriesPerUser = parseInt(settingsMap.entries_per_user || '10')
    const totalPicksPurchased = purchases?.reduce((sum, p) => sum + p.picks_count, 0) || 0
    const userPicksPurchased = userPurchases?.reduce((sum, p) => sum + p.picks_count, 0) || 0

    // Check if user is a tester
    const userIsTester = await isUserTester(userId)

    // Only allow free purchases if user is a tester OR if global price is $0
    if (!userIsTester && pickPrice !== 0) {
      return NextResponse.json({ 
        error: 'Free purchases are only allowed for testers or when pick price is set to $0' 
      }, { status: 400 })
    }

    // Validate limits
    if (userPicksPurchased + picks_count > entriesPerUser) {
      return NextResponse.json({ 
        error: `You can only purchase up to ${entriesPerUser} picks total. You already have ${userPicksPurchased} picks.` 
      }, { status: 400 })
    }

    if (totalPicksPurchased + picks_count > maxTotalEntries) {
      return NextResponse.json({ 
        error: `Pool has reached maximum capacity of ${maxTotalEntries} picks.` 
      }, { status: 400 })
    }

    // Create completed purchase record for free picks
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        stripe_session_id: null, // Free purchases don't need a Stripe session ID
        amount_paid: 0, // $0 for free picks
        picks_count: picks_count,
        status: 'completed',
      })
      .select('id')
      .single()

    if (purchaseError) {
      console.error('Error creating free purchase record:', purchaseError)
      return NextResponse.json({ 
        error: 'Failed to create purchase record' 
      }, { status: 500 })
    }

    // Send admin notification for free purchase
    try {
      const { data: userDetails } = await supabase
        .from('users')
        .select('email, username, first_name, last_name')
        .eq('id', userId)
        .single()

      if (userDetails) {
        await sendAdminPurchaseNotification({
          userEmail: userDetails.email,
          username: userDetails.username || userDetails.first_name || 'Unknown',
          picksCount: picks_count,
          amount: 0, // $0 for free picks
          purchaseId: purchaseData.id
        })
        console.log('✅ Admin notification sent for free purchase')
      }
    } catch (emailError) {
      console.error('❌ Error sending admin notification for free purchase:', emailError)
      // Don't fail the purchase if email fails
    }

    // Create default pick records in the picks table with sequential names
    try {
      // Get existing picks to determine the next sequential number
      const { data: existingPicks } = await supabase
        .from('picks')
        .select('pick_name')
        .eq('user_id', userId)
        .not('pick_name', 'is', null)

      // Find the highest existing pick number
      let nextPickNumber = 1
      if (existingPicks && existingPicks.length > 0) {
        const pickNumbers = existingPicks
          .map(pick => {
            const match = pick.pick_name?.match(/^Pick (\d+)$/)
            return match ? parseInt(match[1]) : 0
          })
          .filter(num => num > 0)
        
        if (pickNumbers.length > 0) {
          nextPickNumber = Math.max(...pickNumbers) + 1
        }
      }

      // Create default pick records in the picks table with sequential names
      const pickRecords = []
      
      for (let i = 0; i < picks_count; i++) {
        pickRecords.push({
          user_id: userId,
          picks_count: 1,
          status: 'pending' as const,
          pick_name: `Pick ${nextPickNumber + i}` // Sequential naming starting from next available number
          // Note: matchup_id, team_picked, week columns removed from schema
        })
      }

      const { error: picksError } = await supabase
        .from('picks')
        .insert(pickRecords)

      if (picksError) {
        console.error('Error creating pick records for free picks:', picksError)
        return NextResponse.json({ 
          error: 'Failed to create pick records' 
        }, { status: 500 })
      }

      console.log(`Created ${pickRecords.length} default pick records for free picks for user ${userId}`)
    } catch (pickCreationError) {
      console.error('Error creating default pick records for free picks:', pickCreationError)
      return NextResponse.json({ 
        error: 'Failed to create pick records' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully added ${picks_count} free pick${picks_count > 1 ? 's' : ''}`,
      picks_count: picks_count
    })

  } catch (error) {
    console.error('Error creating free purchase:', error)
    return NextResponse.json(
      { error: 'Failed to create free purchase' },
      { status: 500 }
    )
  }
}
