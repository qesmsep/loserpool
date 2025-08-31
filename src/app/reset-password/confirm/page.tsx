'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordConfirmPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionEstablished, setSessionEstablished] = useState(false)

  const router = useRouter()

  // Password validation function
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number'
    }
    return null
  }

  // Session setup - run once and clear URL hash
  useEffect(() => {
    console.log('🔧 [PASSWORD-CONFIRM] Starting session validation')

    const establishSession = async () => {
      try {
        // Check if we have tokens in the URL fragment
        const url = new URL(window.location.href)
        const params = new URLSearchParams(url.hash.slice(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        console.log('🔍 [PASSWORD-CONFIRM] URL fragment found:', !!accessToken)
        console.log('🔍 [PASSWORD-CONFIRM] Fragment tokens:', Array.from(params.keys()))

        if (accessToken && refreshToken) {
          console.log('🔧 [PASSWORD-CONFIRM] Recovery tokens found, setting session...')

          // Set the session with the recovery tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('❌ [PASSWORD-CONFIRM] Failed to set session:', error)
            setError('Invalid or expired reset link. Please request a new one.')
            return
          }

          console.log('✅ [PASSWORD-CONFIRM] Session set successfully for user:', data.user?.email)
          console.log('🔍 [PASSWORD-CONFIRM] Session data:', {
            user: data.user?.email,
            expiresAt: data.session?.expires_at,
            accessToken: data.session?.access_token ? 'present' : 'missing'
          })

          // Clear the URL hash to prevent re-runs
          history.replaceState(null, '', window.location.pathname)
          
          setSessionEstablished(true)
        } else {
          // Check if we already have a valid session
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            console.log('✅ [PASSWORD-CONFIRM] Valid session already exists for user:', session.user.email)
            setSessionEstablished(true)
          } else {
            console.error('❌ [PASSWORD-CONFIRM] No valid session found')
            setError('Invalid or expired reset link. Please request a new one.')
          }
        }
      } catch (error) {
        console.error('❌ [PASSWORD-CONFIRM] Session establishment error:', error)
        setError('Failed to establish session. Please try again.')
      }
    }

    establishSession()
  }, []) // Empty deps array - run only once

  const handlePasswordReset = async () => {
    console.log('🔧 [PASSWORD-CONFIRM] Starting password reset process')

    if (!newPassword || !confirmPassword) {
      console.log('❌ [PASSWORD-CONFIRM] Missing password fields')
      setError('Please enter both password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      console.log('❌ [PASSWORD-CONFIRM] Passwords do not match')
      setError('Passwords do not match')
      return
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      console.log('❌ [PASSWORD-CONFIRM] Password validation failed:', passwordError)
      setError(passwordError)
      return
    }

    if (!sessionEstablished) {
      console.log('❌ [PASSWORD-CONFIRM] No valid session established')
      setError('Please wait for session to be established or request a new reset link.')
      return
    }

    console.log('✅ [PASSWORD-CONFIRM] Password validation passed')
    setLoading(true)
    setError('')

    try {
      // Get current session to ensure we have the user email
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) {
        throw new Error('Session lost; request a new reset link.')
      }

      console.log('🔧 [PASSWORD-CONFIRM] Attempting client-side password update...')

      // Try client-side update first
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
        
        console.log('✅ [PASSWORD-CONFIRM] Client-side update succeeded')
        
        // Success - sign out and redirect
        console.log('🔧 [PASSWORD-CONFIRM] Signing out user...')
        await supabase.auth.signOut()
        console.log('✅ [PASSWORD-CONFIRM] User signed out successfully')
        
        setSuccess(true)
        
        // Redirect to login after a short delay
        setTimeout(() => {
          console.log('🔧 [PASSWORD-CONFIRM] Redirecting to login...')
          router.push('/login')
        }, 3000)
        
        return
        
             } catch (e: unknown) {
         const error = e as { code?: string; status?: number; message?: string }
         const code = error?.code || ''
         const status = error?.status || 0
        
                 console.log('❌ [PASSWORD-CONFIRM] Client-side update failed:', {
           code,
           status,
           message: error?.message
         })
        
        // If it's an unexpected_failure or 5xx error, try server-side fallback
        if (code === 'unexpected_failure' || status >= 500) {
          console.log('🔧 [PASSWORD-CONFIRM] Attempting server-side fallback...')
          
          const resp = await fetch('/api/auth/update-password-direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: session.user.email, 
              newPassword 
            }),
          })
          
          const json = await resp.json()
          
          if (!resp.ok || json?.success !== true) {
            throw new Error(json?.details || json?.error || 'Password update failed')
          }
          
          console.log('✅ [PASSWORD-CONFIRM] Server-side fallback succeeded')
          
          // Success - sign out and redirect
          console.log('🔧 [PASSWORD-CONFIRM] Signing out user...')
          await supabase.auth.signOut()
          console.log('✅ [PASSWORD-CONFIRM] User signed out successfully')
          
          setSuccess(true)
          
          // Redirect to login after a short delay
          setTimeout(() => {
            console.log('🔧 [PASSWORD-CONFIRM] Redirecting to login...')
            router.push('/login')
          }, 3000)
          
          return
        } else {
          // Re-throw other errors
          throw e
        }
      }

    } catch (error) {
      console.error('❌ [PASSWORD-CONFIRM] Password reset error:', error)
      setError(error instanceof Error ? error.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (!sessionEstablished && !error) {
    return (
      <div className="app-bg flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Establishing Session</h1>
            <p className="text-gray-600">Please wait while we validate your reset link...</p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="app-bg flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Password Reset Successful!</h1>
            <p className="text-gray-600 mb-6">
              Your password has been updated successfully. You will be redirected to the login page shortly.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>Next steps:</strong>
              </p>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• You can now sign in with your new password</li>
                <li>• Keep your password secure</li>
                <li>• Consider enabling two-factor authentication</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-bg flex items-center justify-center min-h-screen">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
          <p className="text-gray-600">Enter your new password below</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handlePasswordReset(); }} className="space-y-6">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showNewPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm your new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Password requirements:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Contains at least one uppercase letter</li>
              <li>• Contains at least one lowercase letter</li>
              <li>• Contains at least one number</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating Password...
              </div>
            ) : (
              'Update Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}
