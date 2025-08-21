'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Trophy, Calendar, Users, Star } from 'lucide-react'

interface PurchaseSuccessData {
  picksCount: number
  amount: number
  purchaseId: string
  userEmail: string
}

function PurchaseSuccessContent() {
  const [loading, setLoading] = useState(true)
  const [purchaseData, setPurchaseData] = useState<PurchaseSuccessData | null>(null)
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get user profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        setUserProfile(profile)

        // Get purchase data from URL params or recent purchase
        const sessionId = searchParams.get('session_id')
        if (sessionId) {
          // Get purchase details from session ID
          const { data: purchase } = await supabase
            .from('purchases')
            .select('picks_count, amount_paid, id')
            .eq('stripe_session_id', sessionId)
            .single()

          if (purchase) {
            setPurchaseData({
              picksCount: purchase.picks_count,
              amount: purchase.amount_paid,
              purchaseId: purchase.id,
              userEmail: user.email || ''
            })
          }
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading purchase success data:', error)
        setLoading(false)
      }
    }

    checkAuthAndLoadData()
  }, [router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
          <p className="mt-4 text-blue-200">Loading your purchase details...</p>
        </div>
      </div>
    )
  }

  if (!purchaseData) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-4">Purchase Not Found</h1>
          <p className="text-blue-200 mb-6">We couldn&apos;t find your purchase details.</p>
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold mb-4">Purchase Complete!</h1>
          <p className="text-xl opacity-90">Your picks have been added to your account</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Processed Successfully</h2>
            <p className="text-blue-200">Your payment has been confirmed and your picks are ready to use!</p>
          </div>

          {/* Purchase Summary */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">📊 Purchase Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{purchaseData.picksCount}</div>
                <div className="text-blue-200">Picks Purchased</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">${(purchaseData.amount / 100).toFixed(2)}</div>
                <div className="text-blue-200">Amount Paid</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{purchaseData.purchaseId.slice(-8)}</div>
                <div className="text-blue-200">Purchase ID</div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">🚀 What&apos;s Next?</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <div>
                  <p className="text-white font-medium">Go to your dashboard to see your new picks</p>
                  <p className="text-blue-200 text-sm">Your picks are ready and waiting for you!</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <div>
                  <p className="text-white font-medium">Allocate your picks to specific weeks</p>
                  <p className="text-blue-200 text-sm">Choose which weeks you want to use your picks</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <div>
                  <p className="text-white font-medium">Make your selections for upcoming games</p>
                  <p className="text-blue-200 text-sm">Pick teams that you think will LOSE!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center space-y-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Go to Your Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            
            <div className="text-blue-200 text-sm">
              A payment receipt has been sent to <span className="font-semibold text-white">{purchaseData.userEmail}</span>
            </div>
          </div>
        </div>

        {/* Pool Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center">
            <div className="text-3xl mb-3">🏈</div>
            <h3 className="text-lg font-semibold text-white mb-2">Weekly Elimination</h3>
            <p className="text-blue-200 text-sm">Pick teams to LOSE each week. Last person standing wins!</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-white mb-2">Real-time Leaderboards</h3>
            <p className="text-blue-200 text-sm">Track your progress and see how you stack up against others</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="text-lg font-semibold text-white mb-2">Exciting Prizes</h3>
            <p className="text-blue-200 text-sm">Compete for amazing prizes and bragging rights</p>
          </div>
        </div>

        {/* Important Reminders */}
        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-xl border border-yellow-500/30 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">⏰ Important Reminders</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Picks lock on Thursday nights</p>
                <p className="text-blue-200 text-sm">Make sure to submit your picks before the deadline</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Star className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">You&apos;re picking teams to LOSE</p>
                <p className="text-blue-200 text-sm">Remember, you want your picks to lose, not win!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
          <p className="mt-4 text-blue-200">Loading...</p>
        </div>
      </div>
    }>
      <PurchaseSuccessContent />
    </Suspense>
  )
}
