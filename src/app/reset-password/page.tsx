'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromQuery = searchParams?.get('email') || ''
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePasswordReset = async () => {
    setLoading(true)
    setError('')

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
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reset password')
      }

      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-bg flex items-center justify-center min-h-screen">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Set a New Password</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
        />

        <button
          onClick={handlePasswordReset}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </div>
  )
}
