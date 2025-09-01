'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, CreditCard } from 'lucide-react'
import { checkPoolLockForPurchase } from '@/lib/pool-status-client'
import { isUserTester } from '@/lib/user-types-client'

interface PurchaseSettings {
  pickPrice: number
  maxTotalEntries: number
  entriesPerUser: number
  totalPicksPurchased: number
}

export default function PurchasePage() {
  const [picksCount, setPicksCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState<PurchaseSettings>({
    pickPrice: 21,
    maxTotalEntries: 2100,
    entriesPerUser: 10,
    totalPicksPurchased: 0
  })
  const [userPicksPurchased, setUserPicksPurchased] = useState(0)
  const [userIsTester, setUserIsTester] = useState(false)
  const [userLoading, setUserLoading] = useState(true)
  const router = useRouter()

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is a tester
    try {
      const testerStatus = await isUserTester(user.id)
      setUserIsTester(testerStatus)
    } catch (error) {
      console.error('Error checking tester status:', error)
      setUserIsTester(false)
    }
    setUserLoading(false)
  }, [router])

  const loadSettings = useCallback(async () => {
    try {
      // Get admin settings from global_settings
      const { data: settingsData } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', ['pick_price', 'max_total_entries', 'entries_per_user'])

      // Get total picks purchased
      const { data: purchases } = await supabase
        .from('purchases')
        .select('picks_count')
        .eq('status', 'completed')

      // Get current user's picks purchased
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userPurchases } = await supabase
          .from('purchases')
          .select('picks_count')
          .eq('user_id', user.id)
          .eq('status', 'completed')

        const userTotal = userPurchases?.reduce((sum, p) => sum + p.picks_count, 0) || 0
        setUserPicksPurchased(userTotal)
      }

      const totalPicksPurchased = purchases?.reduce((sum, p) => sum + p.picks_count, 0) || 0

      // Create settings map
      const settingsMap = settingsData?.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as Record<string, string>) || {}

      setSettings({
        pickPrice: parseInt(settingsMap.pick_price || '21'),
        maxTotalEntries: parseInt(settingsMap.max_total_entries || '2100'),
        entriesPerUser: parseInt(settingsMap.entries_per_user || '10'),
        totalPicksPurchased
      })
    } catch (error) {
      console.error('Error loading settings:', error)
      setError('Failed to load pool settings')
    }
  }, [])

  useEffect(() => {
    checkUser()
    loadSettings()
  }, [checkUser, loadSettings])

  const handlePurchase = async () => {
    setLoading(true)
    setError('')

    try {
      // Check pool lock status
      const poolStatus = await checkPoolLockForPurchase()
      if (!poolStatus.allowed) {
        setError(poolStatus.message)
        setLoading(false)
        return
      }

      // Check if user has reached their limit
      if (userPicksPurchased + picksCount > settings.entriesPerUser) {
        setError(`You can only purchase up to ${settings.entriesPerUser} picks total. You already have ${userPicksPurchased} picks.`)
        setLoading(false)
        return
      }

      // Check if pool has reached capacity
      if (settings.totalPicksPurchased + picksCount > settings.maxTotalEntries) {
        setError(`Pool has reached maximum capacity of ${settings.maxTotalEntries} picks.`)
        setLoading(false)
        return
      }

      // Get current user to check tester status
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      // Check if user is a tester
      const userIsTester = await isUserTester(user.id)

      // If user is a tester or price is $0, create free purchase
      if (userIsTester || settings.pickPrice === 0) {
        // Get the access token from Supabase
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token
        
        const response = await fetch('/api/purchases/free', {
          method: 'POST',
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify({
            picks_count: picksCount,
          }),
        })

        const result = await response.json()

        if (result.error) {
          setError(result.error)
          setLoading(false)
          return
        }

        // Redirect to dashboard with success message
        const message = userIsTester 
          ? 'Free picks added successfully for tester!'
          : 'Free picks added successfully!'
        router.push(`/dashboard?success=true&message=${encodeURIComponent(message)}`)
        return
      }

      // Otherwise, proceed with Stripe checkout
      // Get the access token from Supabase
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
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

  const userRemaining = settings.entriesPerUser - userPicksPurchased
  const poolRemaining = settings.maxTotalEntries - settings.totalPicksPurchased
  const maxPicksAllowed = Math.min(userRemaining, poolRemaining)

  // Calculate the actual price for this user (testers get $0)
  const actualPickPrice = userIsTester ? 0 : settings.pickPrice
  const totalPrice = picksCount * actualPickPrice

  // Debug logging
  console.log('Purchase page debug:', {
    pickPrice: settings.pickPrice,
    actualPickPrice,
    userIsTester,
    entriesPerUser: settings.entriesPerUser,
    maxTotalEntries: settings.maxTotalEntries,
    totalPicksPurchased: settings.totalPicksPurchased,
    userPicksPurchased,
    userRemaining,
    poolRemaining,
    maxPicksAllowed,
    picksCount
  })

  if (userLoading) {
    return (
      <div className="app-bg">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-8 text-center">
            <div className="text-white">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-bg">
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
            {userIsTester ? (
              <p className="text-blue-100">
                As a tester, you get picks for free! More picks = more chances to survive!
              </p>
            ) : (
              <p className="text-blue-100">
                Each pick costs ${settings.pickPrice}. More picks = more chances to survive!
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {userRemaining === 0 && (
            <div className="bg-blue-500/20 border border-blue-500/30 text-blue-200 px-4 py-3 rounded mb-6">
              You have already purchased the maximum number of picks ({settings.entriesPerUser}). You cannot purchase any more picks.
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
                  disabled={picksCount <= 1}
                  className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <span className="text-2xl font-bold text-white min-w-[3rem] text-center">
                  {picksCount}
                </span>
                <button
                  onClick={() => setPicksCount(Math.min(maxPicksAllowed, picksCount + 1))}
                  disabled={picksCount >= maxPicksAllowed}
                  className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              <div className="mt-2 text-sm text-blue-200">
                You can purchase up to {userRemaining} more picks (you have {userPicksPurchased} already)
              </div>
              <div className="mt-1 text-sm text-blue-200">
                Pool has {poolRemaining} picks remaining out of {settings.maxTotalEntries} total
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex justify-between items-center">
                <span className="text-blue-200">Price per pick:</span>
                <span className="font-medium text-white">
                  {userIsTester ? 'FREE' : `$${settings.pickPrice.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-blue-200">Quantity:</span>
                <span className="font-medium text-white">{picksCount}</span>
              </div>
              <div className="border-t border-white/20 mt-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Total:</span>
                  <span className="text-2xl font-bold text-blue-300">
                    {userIsTester ? 'FREE' : `$${totalPrice.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePurchase}
              disabled={loading || picksCount > maxPicksAllowed}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {loading ? 'Processing...' : 
               userRemaining === 0 ? 'Maximum Picks Reached' :
               userIsTester ? `Add ${picksCount} Free Pick${picksCount > 1 ? 's' : ''}` :
               actualPickPrice === 0 ? `Add ${picksCount} Free Pick${picksCount > 1 ? 's' : ''}` : 
               `Pay $${totalPrice.toFixed(2)}`}
            </button>
          </div>

          <div className="mt-8 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">How it works:</h3>
            <ul className="text-blue-200 space-y-1 text-sm">
              <li>• Pick teams you think will LOSE each week</li>
              <li>• If your pick wins, you&apos;re eliminated</li>
              <li>• If your pick loses, you survive to next week</li>
              <li>• Last person standing wins the pool!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 