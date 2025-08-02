'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, CreditCard } from 'lucide-react'
import { checkPoolLock } from '@/lib/pool-status-client'

export default function PurchasePage() {
  const [picksCount, setPicksCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
  }, [router])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  const handlePurchase = async () => {
    setLoading(true)
    setError('')

    try {
      // Check pool lock status
      const poolStatus = await checkPoolLock()
      if (!poolStatus.allowed) {
        setError(poolStatus.message)
        setLoading(false)
        return
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          picks_count: picksCount,
        }),
      })

      const { sessionId, error } = await response.json()

      if (error) {
        setError(error)
        setLoading(false)
        return
      }

      // Redirect to Stripe Checkout
      const stripe = await import('@stripe/stripe-js')
      const stripeInstance = await stripe.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      
      if (stripeInstance) {
        const { error } = await stripeInstance.redirectToCheckout({
          sessionId,
        })
        
        if (error) {
          setError(error.message || 'Failed to redirect to checkout')
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      setError('Failed to create checkout session')
      setLoading(false)
    }
  }

  const totalPrice = picksCount * 21

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-blue-100 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Purchase Picks</h1>
                <p className="text-blue-100">Buy picks before the season starts</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-blue-200" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Buy Your Picks</h2>
            <p className="text-blue-100">
              Each pick costs $21. More picks = more chances to survive!
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Number of Picks
              </label>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setPicksCount(Math.max(1, picksCount - 1))}
                  className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 text-white"
                >
                  -
                </button>
                <span className="text-2xl font-bold text-white min-w-[3rem] text-center">
                  {picksCount}
                </span>
                <button
                  onClick={() => setPicksCount(Math.min(10, picksCount + 1))}
                  className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 text-white"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex justify-between items-center">
                <span className="text-blue-200">Price per pick:</span>
                <span className="font-medium text-white">$21.00</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-blue-200">Quantity:</span>
                <span className="font-medium text-white">{picksCount}</span>
              </div>
              <div className="border-t border-white/20 mt-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Total:</span>
                  <span className="text-2xl font-bold text-blue-300">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePurchase}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {loading ? 'Processing...' : `Pay $${totalPrice.toFixed(2)}`}
            </button>
          </div>

          <div className="mt-8 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Important Notes:</h3>
            <ul className="text-blue-200 space-y-1 text-sm">
              <li>• Picks can only be purchased before the season starts</li>
              <li>• Each pick costs $21 ($20 to pool, $1 for fees)</li>
              <li>• Maximum 10 picks per purchase</li>
              <li>• Picks are used to make selections each week</li>
              <li>• Unused picks are given the default pick</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 