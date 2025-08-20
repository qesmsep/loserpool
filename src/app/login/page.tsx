'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryCount] = useState(0)
  const [cooldown, setCooldown] = useState(false)
  const router = useRouter()

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
      // Sign in with retry logic
      let signInError = null
      
      for (let attempt = 0; attempt <= retryCount; attempt++) {
        const { error } = await supabase.auth.signInWithPassword({
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
              setError('Too many login attempts. Please wait a few minutes before trying again.')
              setCooldown(true)
              setTimeout(() => setCooldown(false), 60000) // 1 minute cooldown
              setLoading(false)
              return
            }
          } else {
            signInError = error
            break
          }
        } else {
          // Wait a moment for the session to be properly set
          await delay(1000)
          
          // Verify the session was set
          const { data: { session } } = await supabase.auth.getSession()
          console.log('Login successful, session:', !!session)
          
          router.push('/dashboard')
          return
        }
      }

      if (signInError) {
        setError(getErrorMessage(signInError.message))
        setLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const getErrorMessage = (error: string) => {
    if (error.includes('429') || error.includes('Too Many Requests')) {
      return 'Too many login attempts. Please wait a few minutes before trying again.'
    }
    if (error.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.'
    }
    if (error.includes('Email not confirmed')) {
      return 'Please check your email and click the confirmation link before signing in. If you haven\'t received the email, check your spam folder.'
    }
    if (error.includes('User not found')) {
      return 'No account found with this email address. Please sign up instead.'
    }
    return error
  }

  return (
    <div className="app-bg flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sign In</h1>
          <p className="text-gray-800 mt-2">Welcome back to The Loser Pool</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {getErrorMessage(error)}
              {error.includes('Email not confirmed') && (
                <div className="mt-3">
                  <Link href="/confirm-email" className="text-blue-600 hover:text-blue-500 text-sm underline">
                    Need help with email confirmation?
                  </Link>
                </div>
              )}
            </div>
          )}

          {cooldown && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
              Please wait a moment before trying again.
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={cooldown}
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 placeholder-gray-600"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={cooldown}
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 placeholder-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading || cooldown}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-800">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
} 