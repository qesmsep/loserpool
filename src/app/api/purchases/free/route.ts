import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPoolStatus } from '@/lib/pool-status'

export async function POST(request: NextRequest) {
  try {
    const { picks_count } = await request.json()
    const supabase = await createServerSupabaseClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      .eq('user_id', user.id)
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

    // Double-check that price is actually $0
    if (pickPrice !== 0) {
      return NextResponse.json({ 
        error: 'Free purchases are only allowed when pick price is set to $0' 
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
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: user.id,
        stripe_session_id: `free_${Date.now()}_${user.id}`, // Generate unique ID for free purchases
        amount: 0, // $0 for free picks
        picks_count: picks_count,
        status: 'completed',
      })

    if (purchaseError) {
      console.error('Error creating free purchase record:', purchaseError)
      return NextResponse.json({ 
        error: 'Failed to create purchase record' 
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
