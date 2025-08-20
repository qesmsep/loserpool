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
        let purchase = null
        
        // First, let's check if there are any purchases with this session ID (without .single())
        const { data: allPurchases, error: allPurchasesError } = await supabase
          .from('purchases')
          .select('user_id, picks_count, amount_paid, id, status, created_at')
          .eq('stripe_session_id', session.id)

        console.log('All purchases with session ID:', session.id, ':', allPurchases)
        console.log('All purchases error:', allPurchasesError)

        const { data: purchaseData, error: purchaseError } = await supabase
          .from('purchases')
          .select('user_id, picks_count, amount_paid, id')
          .eq('stripe_session_id', session.id)
          .single()

        if (purchaseError) {
          console.error('Error fetching purchase details for notification:', purchaseError)
          // If purchase record doesn't exist, try to create it from session metadata
          if (purchaseError.code === 'PGRST116') {
            console.log('Purchase record not found, attempting to create from session metadata')
            console.log('Session metadata:', session.metadata)
            console.log('Session amount_total:', session.amount_total)
            console.log('Session ID:', session.id)
            
            const { data: newPurchase, error: createError } = await supabase
              .from('purchases')
              .insert({
                user_id: session.metadata?.user_id,
                stripe_session_id: session.id,
                amount_paid: session.amount_total || 0,
                picks_count: parseInt(session.metadata?.picks_count || '0'),
                status: 'completed',
              })
              .select('user_id, picks_count, amount_paid, id')
              .single()
            
            if (createError) {
              console.error('Error creating purchase record from session:', createError)
              // Try to get more details about the session
              console.log('Full session object:', JSON.stringify(session, null, 2))
            } else {
              console.log('Purchase record created from session metadata:', newPurchase)
              purchase = newPurchase
            }
          }
        } else {
          purchase = purchaseData
        }
        
        if (purchase) {
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

          // Create pick records for the purchased picks
          console.log('Creating pick records for purchase:', purchase.id, 'picks_count:', purchase.picks_count)
          
          const pickRecords = []
          for (let i = 0; i < purchase.picks_count; i++) {
            pickRecords.push({
              user_id: purchase.user_id,
              picks_count: 1,
              status: 'pending',
              pick_name: `Pick ${i + 1}`,
              notes: `Auto-generated from purchase ${purchase.id}`
            })
          }

          const { data: createdPicks, error: picksError } = await supabase
            .from('picks')
            .insert(pickRecords)
            .select('id, user_id, picks_count, status, pick_name')

          if (picksError) {
            console.error('Error creating pick records:', picksError)
          } else {
            console.log('Successfully created pick records:', createdPicks?.length, 'picks')
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