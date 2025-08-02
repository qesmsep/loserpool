import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const user = await getCurrentUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
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
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">💰 Buy Picks</h3>
              <p className="text-gray-300">
                Purchase picks for $10 each before the season starts. More picks = more chances to survive!
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
