'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, CreditCard } from 'lucide-react'

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

  const totalPrice = picksCount * 10

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Purchase Picks</h1>
                <p className="text-gray-600">Buy picks before the season starts</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Buy Your Picks</h2>
            <p className="text-gray-600">
              Each pick costs $10. More picks = more chances to survive!
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Picks
              </label>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setPicksCount(Math.max(1, picksCount - 1))}
                  className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  -
                </button>
                <span className="text-2xl font-bold text-gray-900 min-w-[3rem] text-center">
                  {picksCount}
                </span>
                <button
                  onClick={() => setPicksCount(picksCount + 1)}
                  className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Price per pick:</span>
                <span className="font-medium">$10.00</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{picksCount}</span>
              </div>
              <div className="border-t border-gray-200 mt-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">${totalPrice.toFixed(2)}</span>
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

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Important Notes:</h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• Picks can only be purchased before the season starts</li>
              <li>• Each pick costs $10</li>
              <li>• You can buy multiple picks</li>
              <li>• Picks are used to make selections each week</li>
              <li>• Unused picks carry over to future weeks</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 