'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    
    if (cooldown) {
      setError('Please wait a moment before trying again')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create user account with retry logic
      let signUpError = null
      let user = null
      
      for (let attempt = 0; attempt <= retryCount; attempt++) {
        const { data: { user: signUpUser }, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
            if (attempt < retryCount) {
              // Wait with exponential backoff
              const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000)
              await delay(waitTime)
              continue
            } else {
              setError('Too many signup attempts. Please wait a few minutes before trying again.')
              setCooldown(true)
              setTimeout(() => setCooldown(false), 60000) // 1 minute cooldown
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
        // Try to create user profile (the trigger should handle this automatically)
        // But we'll try manually in case the trigger isn't working
        try {
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email!,
              username: username || null,
              is_admin: false,
            })

          if (profileError) {
            console.warn('Profile creation failed, but user account was created:', profileError)
            // Don't fail the signup if profile creation fails
            // The trigger should have created the profile automatically
          }
        } catch (profileErr) {
          console.warn('Profile creation error:', profileErr)
          // Continue with signup even if profile creation fails
        }

        // Handle invitation if present
        if (inviteCode) {
          try {
            const { error: inviteError } = await supabase
              .from('invitations')
              .update({ used_by: user.id })
              .eq('invite_code', inviteCode)

            if (!inviteError) {
              // Update user with invited_by
              await supabase
                .from('users')
                .update({ invited_by: inviteCode })
                .eq('id', user.id)
            }
          } catch (inviteErr) {
            console.warn('Invitation handling error:', inviteErr)
            // Don't fail signup if invitation handling fails
          }
        }

        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const getErrorMessage = (error: string) => {
    if (error.includes('429') || error.includes('Too Many Requests')) {
      return 'Too many signup attempts. Please wait a few minutes before trying again.'
    }
    if (error.includes('already registered')) {
      return 'An account with this email already exists. Please sign in instead.'
    }
    if (error.includes('Invalid email')) {
      return 'Please enter a valid email address.'
    }
    if (error.includes('Password should be at least')) {
      return 'Password must be at least 6 characters long.'
    }
    return error
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sign Up</h1>
          <p className="text-gray-600 mt-2">Join The Loser Pool</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {getErrorMessage(error)}
            </div>
          )}

          {cooldown && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
              Please wait a moment before trying again.
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
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
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username (optional)
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={cooldown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={cooldown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {inviteCode && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
              You&apos;re joining with an invitation code!
            </div>
          )}

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
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
} 