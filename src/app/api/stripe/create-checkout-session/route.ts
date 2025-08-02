import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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

    // Check if pool has started (purchases should be locked)
    const poolStartDate = new Date(process.env.POOL_START_DATE || '2024-09-05')
    if (new Date() >= poolStartDate) {
      return NextResponse.json({ error: 'Purchases are locked - pool has started' }, { status: 400 })
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
            unit_amount: 2100, // $21.00 in cents
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
        amount: picks_count * 21,
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