'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function LoadingFallback() {
  return (
    <div className="app-bg min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-md">
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

function AdminPasswordResetContent() {
  const searchParams = useSearchParams()
  const emailFromQuery = searchParams?.get('email') || ''

  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Try to get the session (Supabase recovery link may or may not set it)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.warn('Session error (continuing with query email if present):', sessionError)
      }

      const emailToUse = session?.user?.email || emailFromQuery

      if (!emailToUse) {
        throw new Error('Reset link missing session and email. Please request a new reset link.')
      }

      if (session?.user?.email) {
        console.log('✅ User session confirmed:', session.user.email)
      } else {
        console.log('⚠️ No session from recovery link. Falling back to email from query:', emailFromQuery)
      }

      const response = await fetch('/api/auth/admin-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailToUse,
          newPassword: newPassword
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(true)
        setNewPassword('')
      } else {
        setError(result.error || 'Failed to reset password')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-bg min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-md">
        <h1 className="text-3xl font-bold mb-6">Reset Your Password</h1>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            Password has been reset successfully!
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="space-y-6">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-900 mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminPasswordResetPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminPasswordResetContent />
    </Suspense>
  )
}
