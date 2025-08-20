import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { sendAdminPurchaseNotification, sendUserPurchaseConfirmation } from '@/lib/email'
import { PickNamesServiceServer } from '@/lib/pick-names-service-server'

export async function POST(request: NextRequest) {
  console.log('🔔 WEBHOOK RECEIVED - Starting webhook processing')
  console.log('📅 Timestamp:', new Date().toISOString())
  console.log('🌐 Environment:', process.env.NODE_ENV || 'unknown')
  
  // Check if Stripe is properly configured
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_dummy') {
    console.error('❌ Stripe not configured - missing or dummy secret key')
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    )
  }

  console.log('✅ Stripe secret key configured')

  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  console.log('📋 Request headers:', Object.fromEntries(headersList.entries()))
  console.log('🔑 Stripe signature present:', !!sig)
  console.log('📄 Request body length:', body.length)

  if (!sig) {
    console.error('❌ No Stripe signature found in headers')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    console.log('🔐 Attempting to verify webhook signature...')
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    console.log('✅ Webhook signature verified successfully')
    console.log('📦 Event type:', event.type)
    console.log('📦 Event ID:', event.id)
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err)
    console.error('🔑 Webhook secret configured:', !!process.env.STRIPE_WEBHOOK_SECRET)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      console.log('🎉 Processing checkout.session.completed event')
      const session = event.data.object as Stripe.Checkout.Session
      
      console.log('💳 Session details:')
      console.log('  - Session ID:', session.id)
      console.log('  - Amount total:', session.amount_total)
      console.log('  - Currency:', session.currency)
      console.log('  - Customer email:', session.customer_details?.email)
      console.log('  - Metadata:', session.metadata)
      
      try {
        console.log('🔄 Step 1: Updating purchase status to completed')
        console.log('🔍 Looking for purchase with session ID:', session.id)
        
        // Update purchase status to completed
        const { data: updateResult, error } = await supabase
          .from('purchases')
          .update({ status: 'completed' })
          .eq('stripe_session_id', session.id)
          .select()

        if (error) {
          console.error('❌ Error updating purchase status:', error)
          console.error('❌ Error details:', JSON.stringify(error, null, 2))
          return NextResponse.json({ error: 'Failed to update purchase' }, { status: 500 })
        }

        console.log('✅ Purchase status updated successfully')
        console.log('📊 Rows updated:', updateResult?.length || 0)
        if (updateResult && updateResult.length > 0) {
          console.log('📋 Updated purchase:', updateResult[0])
        }

        // Get purchase details for email notification
        console.log('🔄 Step 2: Fetching purchase details for processing')
        let purchase = null
        
        // First, let's check if there are any purchases with this session ID (without .single())
        console.log('🔍 Checking for purchases with session ID:', session.id)
        const { data: allPurchases, error: allPurchasesError } = await supabase
          .from('purchases')
          .select('user_id, picks_count, amount_paid, id, status, created_at')
          .eq('stripe_session_id', session.id)

        console.log('📋 All purchases found:', allPurchases?.length || 0)
        if (allPurchases && allPurchases.length > 0) {
          console.log('📋 Purchase details:', allPurchases[0])
        }
        if (allPurchasesError) {
          console.error('❌ Error fetching all purchases:', allPurchasesError)
        }

        const { data: purchaseData, error: purchaseError } = await supabase
          .from('purchases')
          .select('user_id, picks_count, amount_paid, id')
          .eq('stripe_session_id', session.id)
          .single()

        if (purchaseError) {
          console.error('❌ Error fetching purchase details for notification:', purchaseError)
          console.error('❌ Purchase error code:', purchaseError.code)
          console.error('❌ Purchase error message:', purchaseError.message)
          
          // If purchase record doesn't exist, try to create it from session metadata
          if (purchaseError.code === 'PGRST116') {
            console.log('🔄 Purchase record not found, attempting to create from session metadata')
            console.log('📋 Session metadata:', session.metadata)
            console.log('💰 Session amount_total:', session.amount_total)
            console.log('🆔 Session ID:', session.id)
            
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
          console.log('✅ Purchase found, proceeding with processing')
          console.log('👤 User ID:', purchase.user_id)
          console.log('🎯 Picks count:', purchase.picks_count)
          console.log('💰 Amount paid:', purchase.amount_paid)
          
          // Update user type to 'active' when purchase is completed
          console.log('🔄 Step 3: Updating user type to active')
          const { error: userUpdateError } = await supabase
            .from('users')
            .update({ user_type: 'active' })
            .eq('id', purchase.user_id)
            .eq('user_type', 'registered')

          if (userUpdateError) {
            console.error('❌ Error updating user type to active:', userUpdateError)
          } else {
            console.log('✅ User type updated to active for user:', purchase.user_id)
          }

          // Create pick records for the purchased picks
          console.log('🔄 Step 4: Creating pick records')
          console.log('🎯 Creating pick records for purchase:', purchase.id, 'picks_count:', purchase.picks_count)
          
          const pickRecords = []
          for (let i = 0; i < purchase.picks_count; i++) {
            const pickRecord = {
              user_id: purchase.user_id,
              picks_count: 1,
              status: 'pending',
              pick_name: `Pick ${i + 1}`,
              notes: `Auto-generated from purchase ${purchase.id}`
            }
            pickRecords.push(pickRecord)
            console.log(`📝 Pick ${i + 1} record:`, pickRecord)
          }

          console.log('💾 Inserting pick records into database...')
          const { data: createdPicks, error: picksError } = await supabase
            .from('picks')
            .insert(pickRecords)
            .select('id, user_id, picks_count, status, pick_name')

          if (picksError) {
            console.error('❌ Error creating pick records:', picksError)
            console.error('❌ Pick creation error details:', JSON.stringify(picksError, null, 2))
          } else {
            console.log('✅ Successfully created pick records:', createdPicks?.length, 'picks')
            if (createdPicks && createdPicks.length > 0) {
              console.log('📋 Created picks:', createdPicks)
            }
          }

          // Get user details for email notifications
          console.log('🔄 Step 5: Sending email notifications')
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('email, username')
            .eq('id', purchase.user_id)
            .single()

          if (userError) {
            console.error('❌ Error fetching user details for notification:', userError)
          } else if (user) {
            console.log('📧 User details for notifications:', { email: user.email, username: user.username })
            
            // Send admin notification
            console.log('📧 Sending admin notification...')
            try {
              await sendAdminPurchaseNotification({
                userEmail: user.email,
                username: user.username || 'Unknown',
                picksCount: purchase.picks_count,
                amount: purchase.amount_paid,
                purchaseId: purchase.id
              })
              console.log('✅ Admin notification sent successfully')
            } catch (emailError) {
              console.error('❌ Error sending admin notification:', emailError)
            }

            // Send user confirmation email
            console.log('📧 Sending user confirmation email...')
            try {
              await sendUserPurchaseConfirmation({
                userEmail: user.email,
                username: user.username || 'Unknown',
                picksCount: purchase.picks_count,
                amount: purchase.amount_paid,
                purchaseId: purchase.id
              })
              console.log('✅ User confirmation email sent successfully')
            } catch (emailError) {
              console.error('❌ Error sending user confirmation email:', emailError)
            }
          } else {
            console.log('⚠️ No user found for notifications')
          }
        } else {
          console.log('⚠️ No purchase found, skipping email notifications')
        }

        console.log('🎉 Webhook processing completed successfully')
        return NextResponse.json({ received: true })

      } catch (error) {
        console.error('❌ Error processing checkout.session.completed:', error)
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
        console.error('❌ Error details:', JSON.stringify(error, null, 2))
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
      console.log(`⚠️ Unhandled event type: ${event.type}`)
      console.log(`📦 Event ID: ${event.id}`)
      return NextResponse.json({ received: true })
  }
} 