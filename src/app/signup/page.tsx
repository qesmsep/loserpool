'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { checkPoolLock } from '@/lib/pool-status-client'

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryCount] = useState(0)
  const [cooldown, setCooldown] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('invite')

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

      // Check total entries limit
      const { data: totalEntries } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'max_total_entries')
        .single()

      const { count: currentEntries } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (totalEntries && currentEntries && currentEntries >= parseInt(totalEntries.value)) {
        setError('Sorry, the pool is full! No more entries are allowed.')
        setLoading(false)
        return
      }

      let signUpError = null
      let user = null

      for (let attempt = 0; attempt <= retryCount; attempt++) {
        const { data: { user: signUpUser }, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone,
              first_name: firstName,
              last_name: lastName,
              username,
            }
          }
        })

        if (error) {
          if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
            if (attempt < retryCount) {
              await delay(Math.min(1000 * Math.pow(2, attempt), 10000))
              continue
            } else {
              setError('Too many signup attempts. Please wait a few minutes before trying again.')
              setCooldown(true)
              setTimeout(() => setCooldown(false), 60000)
              setLoading(false)
              return
            }
          } else {
            signUpError = error
            break
          }
        } else {
          user = signUpUser
          break
        }
      }

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (user) {
        await delay(2000) // Wait for auth user to fully commit
        console.log('User created successfully:', user.id)

        // Manual fallback: Create user profile to ensure it exists
        try {
          const { data: existingUser } = await supabase.from('users').select('id').eq('id', user.id).single()
          if (!existingUser) {
            const { error: userInsertError } = await supabase.from('users').insert({
              id: user.id,
              email: user.email!,
              phone,
              first_name: firstName,
              last_name: lastName,
              username: username || null,
              is_admin: false,
              entries_used: 0,
              max_entries: 10
            })
            if (userInsertError) {
              console.warn('Manual user creation failed:', userInsertError.message)
            } else {
              console.log('User profile created manually')
            }
          } else {
            console.log('User profile already exists')
          }
        } catch (err) {
          console.warn('Manual user creation error:', err)
        }

        // Handle invitation if present
        if (inviteCode) {
          try {
            const { error: inviteError } = await supabase
              .from('invitations')
              .update({ used_by: user.id })
              .eq('invite_code', inviteCode)
            if (!inviteError) {
              await supabase
                .from('users')
                .update({ invited_by: inviteCode })
                .eq('id', user.id)
            }
          } catch (inviteErr) {
            console.warn('Invitation handling error:', inviteErr)
          }
        }

        router.push('/confirm-email')
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sign Up</h1>
          <p className="text-gray-600 mt-2">Join The Loser Pool</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {cooldown && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
              Please wait a moment before trying again.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={cooldown}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={cooldown}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username *
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={cooldown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={cooldown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={cooldown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={cooldown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || cooldown}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
} 