'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function LoadingFallback() {
  return (
    <div className="app-bg flex items-center justify-center min-h-screen">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-6"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}

function LoginContent() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [resent, setResent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      console.error('Login error:', error)
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred'
      // Supabase returns "Email not confirmed" (400, code: email_not_confirmed)
      if (typeof msg === 'string' && msg.toLowerCase().includes('email not confirmed')) {
        setNeedsConfirm(true)
        setError('Please confirm your email to sign in.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // Helper to resend confirmation email
  const resendConfirmation = async () => {
    setLoading(true)
    setError('')
    setResent(false)
    try {
      const resp = await fetch('/api/auth/resend-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const json = await resp.json()
      if (!resp.ok || json?.success !== true) {
        throw new Error(json?.error || 'Failed to resend confirmation email')
      }
      setResent(true)
    } catch (e) {
      console.error('Resend confirm error:', e)
      setError(e instanceof Error ? e.message : 'Failed to resend confirmation email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-bg flex items-center justify-center min-h-screen">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Sign In</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
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
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
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
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {needsConfirm && (
          <div className="mt-4">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-3">
              Please confirm your email to continue. We can resend the confirmation link.
            </div>
            <button
              type="button"
              onClick={resendConfirmation}
              disabled={loading || !email}
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resent ? 'Confirmation Sent ✔' : 'Resend Confirmation Email'}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <a
            href="/reset-password"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Forgot your password?
          </a>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  )
}