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
      console.error('Auth error in create-checkout-session:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Creating checkout session for user:', user.email, 'picks_count:', picks_count)

    // Check pool lock status
    const poolStatus = await getPoolStatus()
    if (poolStatus.isLocked) {
      return NextResponse.json({ error: 'Pool is locked - no new purchases allowed' }, { status: 400 })
    }

    // Get admin settings
    const { data: settings, error: settingsError } = await supabase
      .from('global_settings')
      .select('key, value')
      .in('key', ['pick_price', 'max_total_entries', 'entries_per_user'])

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
    }

    // Get total picks purchased
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('picks_count')
      .eq('status', 'completed')

    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError)
      return NextResponse.json({ error: 'Failed to load purchase data' }, { status: 500 })
    }

    // Get current user's picks purchased
    const { data: userPurchases, error: userPurchasesError } = await supabase
      .from('purchases')
      .select('picks_count')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    if (userPurchasesError) {
      console.error('Error fetching user purchases:', userPurchasesError)
      return NextResponse.json({ error: 'Failed to load user purchase data' }, { status: 500 })
    }

    // Create settings map
    const settingsMap = settings?.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>) || {}

    console.log('Raw settings from database:', settings)
    console.log('Settings map:', settingsMap)

    const pickPrice = parseInt(settingsMap.pick_price || '21')
    const maxTotalEntries = parseInt(settingsMap.max_total_entries || '2100')
    const entriesPerUser = parseInt(settingsMap.entries_per_user || '10')
    const totalPicksPurchased = purchases?.reduce((sum, p) => sum + p.picks_count, 0) || 0
    const userPicksPurchased = userPurchases?.reduce((sum, p) => sum + p.picks_count, 0) || 0

    console.log('Purchase validation:', {
      pickPrice,
      maxTotalEntries,
      entriesPerUser,
      totalPicksPurchased,
      userPicksPurchased,
      requestedPicks: picks_count
    })

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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/purchase?canceled=true`,
      metadata: {
        user_id: user.id,
        picks_count: picks_count.toString(),
      },
    })

    console.log('Stripe session created:', session.id)

    // Create pending purchase record
    const purchaseData = {
      user_id: user.id,
      stripe_session_id: session.id,
      amount_paid: picks_count * pickPrice * 100, // Convert to cents
      picks_count: picks_count,
      status: 'pending',
    }

    console.log('Creating purchase record with data:', purchaseData)

    const { data: insertedPurchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert(purchaseData)
      .select('id, user_id, stripe_session_id, amount_paid, picks_count, status')

    if (purchaseError) {
      console.error('Error creating purchase record:', purchaseError)
      console.error('Purchase data that failed:', purchaseData)
      console.error('Full error details:', JSON.stringify(purchaseError, null, 2))
      // Don't fail the entire request - the webhook will handle it
      // But log the error for debugging
    } else {
      console.log('Purchase record created successfully:', insertedPurchase)
      
      // Verify the record was actually created by fetching it back
      const { data: verifyPurchase, error: verifyError } = await supabase
        .from('purchases')
        .select('*')
        .eq('stripe_session_id', session.id)
        .single()
      
      if (verifyError) {
        console.error('Error verifying purchase record was created:', verifyError)
      } else {
        console.log('Purchase record verified in database:', verifyPurchase)
      }
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