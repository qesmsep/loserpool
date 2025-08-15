import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPoolStatus } from '@/lib/pool-status'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_code?: string; error_description?: string }>
}) {
  const params = await searchParams
  let user = null
  let poolStatus = null
  
  try {
    user = await getCurrentUser()
    poolStatus = await getPoolStatus()
  } catch (error) {
    console.log('Error during server-side rendering:', error)
    // Fall back to default values
    poolStatus = {
      isLocked: false,
      lockDate: null,
      currentTime: new Date(),
      timeUntilLock: null,
      canRegister: true,
      canPurchase: true
    }
  }

  // Handle auth callback from root URL (for old confirmation emails)
  if (params.code) {
    try {
      const supabase = await createServerSupabaseClient()
      const { error } = await supabase.auth.exchangeCodeForSession(params.code)
      
      if (!error) {
        // Successful confirmation, redirect to dashboard
        redirect('/dashboard')
      } else {
        console.error('Auth callback error:', error)
        // Redirect to login with error
        redirect('/login?error=confirmation_failed')
      }
    } catch (error) {
      console.error('Auth callback exception:', error)
      // Redirect to login with error
      redirect('/login?error=confirmation_failed')
    }
  }

  // Handle auth errors from root URL
  if (params.error) {
    console.error('Auth error from root URL:', {
      error: params.error,
      error_code: params.error_code,
      error_description: params.error_description
    })
    redirect('/login?error=confirmation_failed')
  }

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="app-bg">
      {/* Disclaimer */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
        <div className="max-w-4xl mx-auto text-sm text-yellow-800">
          <strong>Disclaimer:</strong> This pool is a private, invite-only game for friends and family. Entry fees include a small charge to cover processing and platform costs; all remaining funds are paid out as prizes. No profit is taken. Participation is for entertainment only and based on skillful predictions. This game is not affiliated with or endorsed by the NFL or any other organization.
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-6">
            The Loser Pool
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Pick the teams that will LOSE each week. If your pick wins, you&apos;re eliminated. 
            Last person standing wins the pool!
          </p>
          
          <div className="space-y-4">
            {poolStatus.isLocked ? (
              <div className="bg-red-500/20 backdrop-blur-sm rounded-lg p-4 border border-red-300">
                <p className="text-red-200 font-semibold">🚫 Pool is Locked</p>
                <p className="text-red-100 text-sm">
                  Registration is closed. The pool is now locked and no new entries are allowed.
                </p>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors"
                >
                  Sign In
                </Link>
                <div className="text-gray-400">
                  or{' '}
                  <Link href="/signup" className="text-blue-400 hover:text-blue-300 underline">
                    create an account
                  </Link>
                </div>
                {poolStatus.timeUntilLock && poolStatus.timeUntilLock < 24 * 60 * 60 * 1000 && (
                  <div className="bg-yellow-500/20 backdrop-blur-sm rounded-lg p-4 border border-yellow-300">
                    <p className="text-yellow-200 font-semibold">⏰ Pool Locks Soon!</p>
                    <p className="text-yellow-100 text-sm">
                      Pool locks in {Math.floor(poolStatus.timeUntilLock / (1000 * 60 * 60))} hours. Register now!
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">💰 Buy Picks</h3>
              <p className="text-gray-300">
                Purchase picks for $21 each before the season starts. More picks = more chances to survive!
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">🎯 Make Picks</h3>
              <p className="text-gray-300">
                Each week, allocate your picks to teams you think will lose. Picks lock at Thursday kickoff.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">🏆 Survive</h3>
              <p className="text-gray-300">
                If your pick wins, you&apos;re eliminated. Last person with active picks wins the pool!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
