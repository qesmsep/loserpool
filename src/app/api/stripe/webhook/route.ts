import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { sendAdminPurchaseNotification, sendUserPurchaseConfirmation } from '@/lib/email'
import { PickNamesServiceServer } from '@/lib/pick-names-service-server'

export async function POST(request: NextRequest) {
  // Check if Stripe is properly configured
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_dummy') {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session
      
      try {
        // Update purchase status to completed
        const { error } = await supabase
          .from('purchases')
          .update({ status: 'completed' })
          .eq('stripe_session_id', session.id)

        if (error) {
          console.error('Error updating purchase status:', error)
          return NextResponse.json({ error: 'Failed to update purchase' }, { status: 500 })
        }

        console.log('Purchase completed successfully:', session.id)

        // Get purchase details for email notification
        const { data: purchase, error: purchaseError } = await supabase
          .from('purchases')
          .select('user_id, picks_count, amount_paid, id')
          .eq('stripe_session_id', session.id)
          .single()

        if (purchaseError) {
          console.error('Error fetching purchase details for notification:', purchaseError)
        } else if (purchase) {
          // Update user type to 'active' when purchase is completed
          const { error: userUpdateError } = await supabase
            .from('users')
            .update({ user_type: 'active' })
            .eq('id', purchase.user_id)
            .eq('user_type', 'registered')

          if (userUpdateError) {
            console.error('Error updating user type to active:', userUpdateError)
          } else {
            console.log('User type updated to active for user:', purchase.user_id)
          }

          // Get user details
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('email, username')
            .eq('id', purchase.user_id)
            .single()

          if (userError) {
            console.error('Error fetching user details for notification:', userError)
          } else if (user) {
            // Send admin notification
            await sendAdminPurchaseNotification({
              userEmail: user.email,
              username: user.username || 'Unknown',
              picksCount: purchase.picks_count,
              amount: purchase.amount_paid,
              purchaseId: purchase.id
            })

            // Send user confirmation email
            await sendUserPurchaseConfirmation({
              userEmail: user.email,
              username: user.username || 'Unknown',
              picksCount: purchase.picks_count,
              amount: purchase.amount_paid,
              purchaseId: purchase.id
            })
          }
        }

        return NextResponse.json({ received: true })

      } catch (error) {
        console.error('Error processing checkout.session.completed:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }

    case 'checkout.session.expired':
      const expiredSession = event.data.object as Stripe.Checkout.Session
      
      try {
        // Update purchase status to failed
        const { error } = await supabase
          .from('purchases')
          .update({ status: 'failed' })
          .eq('stripe_session_id', expiredSession.id)

        if (error) {
          console.error('Error updating expired purchase status:', error)
        } else {
          console.log('Purchase marked as failed:', expiredSession.id)
        }

        return NextResponse.json({ received: true })

      } catch (error) {
        console.error('Error processing checkout.session.expired:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }

    default:
      console.log(`Unhandled event type: ${event.type}`)
      return NextResponse.json({ received: true })
  }
} 