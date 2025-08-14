import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { sendAdminPurchaseNotification } from '@/lib/email'
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

            // Get existing picks to determine the next sequential number
            const { data: existingPicks } = await supabase
              .from('picks')
              .select('pick_name')
              .eq('user_id', purchase.user_id)
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
            try {
              const pickRecords = []
              
              for (let i = 0; i < purchase.picks_count; i++) {
                pickRecords.push({
                  user_id: purchase.user_id,
                  picks_count: 1,
                  status: 'pending' as const,
                  pick_name: `Pick ${nextPickNumber + i}` // Sequential naming starting from next available number
                })
              }

              const { error: picksError } = await supabase
                .from('picks')
                .insert(pickRecords)

              if (picksError) {
                console.error('Error creating pick records:', picksError)
              } else {
                console.log(`Created ${pickRecords.length} default pick records for user ${purchase.user_id}`)
              }
            } catch (pickCreationError) {
              console.error('Error creating default pick records:', pickCreationError)
            }
          }
        }
      } catch (error) {
        console.error('Error processing webhook:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
      }
      break

    case 'checkout.session.expired':
      const expiredSession = event.data.object as Stripe.Checkout.Session
      
      try {
        // Update purchase status to failed
        const { error } = await supabase
          .from('purchases')
          .update({ status: 'failed' })
          .eq('stripe_session_id', expiredSession.id)

        if (error) {
          console.error('Error updating expired purchase:', error)
        }
      } catch (error) {
        console.error('Error processing expired session:', error)
      }
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
} 