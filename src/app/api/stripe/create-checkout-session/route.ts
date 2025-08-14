import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPoolStatus } from '@/lib/pool-status'

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is properly configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_dummy') {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${picks_count} Pick${picks_count > 1 ? 's' : ''} - The Loser Pool`,
              description: `Purchase ${picks_count} pick${picks_count > 1 ? 's' : ''} for The Loser Pool`,
            },
            unit_amount: pickPrice * 100, // Convert to cents
          },
          quantity: picks_count,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/purchase?canceled=true`,
      metadata: {
        user_id: user.id,
        picks_count: picks_count.toString(),
      },
    })

    // Create pending purchase record
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: user.id,
        stripe_session_id: session.id,
        amount: picks_count * pickPrice,
        picks_count: picks_count,
        status: 'pending',
      })

    if (purchaseError) {
      console.error('Error creating purchase record:', purchaseError)
      // Continue anyway - the webhook will handle it
    }

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 