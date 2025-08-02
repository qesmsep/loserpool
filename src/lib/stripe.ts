import Stripe from 'stripe'

// Server-side Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

// Client-side Stripe configuration
export const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!

// Stripe types
export interface StripeSession {
  id: string
  amount_total: number
  currency: string
  status: string
  metadata: {
    picks_count: string
    user_id: string
  }
} 