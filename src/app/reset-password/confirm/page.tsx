'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function ResetPasswordConfirmContent() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkSession = async () => {
      console.log('🔧 [SESSION-CHECK] Starting session validation')
      try {
        setIsChecking(true)
        
        // Wait a moment for Supabase to process the reset link
        console.log('⏳ [SESSION-CHECK] Waiting for Supabase to process reset link...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if we have a valid session from the reset link
        console.log('🔍 [SESSION-CHECK] Checking for valid session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ [SESSION-CHECK] Session check error:', error)
          setError('Invalid or expired reset link. Please request a new password reset.')
          setIsChecking(false)
          return
        }

        if (session?.user) {
          console.log('✅ [SESSION-CHECK] Valid session found for user:', session.user.email)
          setIsValidSession(true)
          setIsChecking(false)
          return
        }

        // If no session, check for recovery tokens in URL fragment
        console.log('🔍 [SESSION-CHECK] No session found, checking URL fragment for recovery tokens...')
        let fragmentTokens: Record<string, string> = {}
        if (typeof window !== 'undefined') {
          const fragment = window.location.hash.substring(1)
          console.log('🔍 [SESSION-CHECK] URL fragment found:', fragment ? 'yes' : 'no')
          if (fragment) {
            fragmentTokens = Object.fromEntries(
              fragment.split('&').map(pair => {
                const [key, value] = pair.split('=')
                return [key, decodeURIComponent(value)]
              })
            )
            console.log('🔍 [SESSION-CHECK] Fragment tokens:', Object.keys(fragmentTokens))
          }
        }
        
        const accessToken = fragmentTokens.access_token
        const refreshToken = fragmentTokens.refresh_token
        const type = fragmentTokens.type
        
        if (accessToken && refreshToken && type === 'recovery') {
          console.log('🔧 [SESSION-CHECK] Recovery tokens found, setting session manually...')
          // Set the session manually from recovery tokens
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (setSessionError) {
            console.error('❌ [SESSION-CHECK] Set session error:', setSessionError)
            setError('Invalid reset link. Please request a new password reset.')
            setIsChecking(false)
            return
          }
          
          if (sessionData.session?.user) {
            console.log('✅ [SESSION-CHECK] Session set successfully for user:', sessionData.session.user.email)
            setIsValidSession(true)
            setIsChecking(false)
            return
          }
        }
        
        // If we get here, no valid session or tokens
        console.log('❌ [SESSION-CHECK] No valid session or recovery tokens found')
        setError('Invalid or expired reset link. Please request a new password reset.')
        setIsChecking(false)
        
      } catch (error) {
        console.error('Session check error:', error)
        setError('An error occurred. Please try again.')
        setIsChecking(false)
      }
    }

    checkSession()
  }, [router, searchParams])

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number'
    }
    if (!/(?=.*[!@#$%^&*])/.test(password)) {
      return 'Password must contain at least one special character (!@#$%^&*)'
    }
    return null
  }

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

    console.log('✅ [PASSWORD-CONFIRM] Password validation passed')
    setLoading(true)
    setError('')

    try {
      console.log('🔧 [PASSWORD-CONFIRM] Getting current session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ [PASSWORD-CONFIRM] Session error:', sessionError)
        throw new Error('Session error. Please try again.')
      }

      if (!session?.user) {
        console.error('❌ [PASSWORD-CONFIRM] No valid session found')
        throw new Error('No valid session found. Please request a new reset link.')
      }

      console.log('✅ [PASSWORD-CONFIRM] Valid session found for user:', session.user.email)
      console.log('🔧 [PASSWORD-CONFIRM] Updating user password...')
      
      // Try multiple approaches for password update
      let updateError = null
      
      // Approach 1: Direct updateUser
      const { error: updateUserError } = await supabase.auth.updateUser({ 
        password: newPassword 
      })
      
      if (updateUserError) {
        console.log('❌ [PASSWORD-CONFIRM] Direct updateUser failed:', updateUserError)
        updateError = updateUserError
        
        // Approach 2: Try with explicit user ID
        console.log('🔧 [PASSWORD-CONFIRM] Trying alternative approach...')
        const { error: altError } = await supabase.auth.updateUser({
          password: newPassword,
          data: { updated_at: new Date().toISOString() }
        })
        
        if (altError) {
          console.log('❌ [PASSWORD-CONFIRM] Alternative approach also failed:', altError)
          updateError = altError
        } else {
          console.log('✅ [PASSWORD-CONFIRM] Alternative approach succeeded')
          updateError = null
        }
      }

      if (updateError) {
        console.log('❌ [PASSWORD-CONFIRM] Client-side update failed, trying server-side API...')
        
        // Approach 3: Try server-side API as fallback
        try {
          const response = await fetch('/api/auth/update-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              password: newPassword,
              userId: session.user.id
            })
          })
          
          const result = await response.json()
          
                      if (!response.ok) {
              console.error('❌ [PASSWORD-CONFIRM] Server-side API failed:', result.error)
              
              // Run diagnostics to understand the issue
              console.log('🔧 [PASSWORD-CONFIRM] Running diagnostics...')
              
              try {
                // Check user provider
                const providerResponse = await fetch('/api/auth/check-user-provider', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId: session.user.id
                  })
                })
                
                const providerResult = await providerResponse.json()
                console.log('🔍 [PASSWORD-CONFIRM] User provider info:', providerResult)
                
                // Check Supabase config
                const configResponse = await fetch('/api/auth/check-supabase-config')
                const configResult = await configResponse.json()
                console.log('🔍 [PASSWORD-CONFIRM] Supabase config:', configResult)
                
                // Provide specific error message based on diagnostics
                if (providerResult.success && providerResult.userInfo) {
                  const userInfo = providerResult.userInfo
                  if (!userInfo.canUpdatePassword) {
                    throw new Error(`Cannot update password for provider: ${userInfo.provider}. Only email/supabase providers support password updates.`)
                  }
                  if (!userInfo.isConfirmed) {
                    throw new Error('User email is not confirmed. Please confirm your email before resetting password.')
                  }
                  if (!userInfo.hasPassword) {
                    throw new Error('User account does not have a password set. This account may use a different authentication method.')
                  }
                }
                
              } catch (diagnosticError) {
                console.error('❌ [PASSWORD-CONFIRM] Diagnostic failed:', diagnosticError)
              }
              
              throw new Error(result.error || 'Failed to update password')
            }
          
          console.log('✅ [PASSWORD-CONFIRM] Server-side API succeeded')
          updateError = null
          
        } catch (apiError) {
          console.error('❌ [PASSWORD-CONFIRM] Server-side API also failed:', apiError)
          throw new Error(updateError?.message || 'Failed to update password. Please try again.')
        }
      }

      console.log('✅ [PASSWORD-CONFIRM] Password updated successfully')
      setSuccess(true)
      
      // Sign out the user after successful password reset
      console.log('🔧 [PASSWORD-CONFIRM] Signing out user...')
      await supabase.auth.signOut()
      console.log('✅ [PASSWORD-CONFIRM] User signed out successfully')
      
      // Redirect to login after a short delay
      setTimeout(() => { 
        console.log('🔧 [PASSWORD-CONFIRM] Redirecting to login...')
        router.push('/login') 
      }, 3000)

    } catch (error) {
      console.error('❌ [PASSWORD-CONFIRM] Password reset error:', error)
      setError(error instanceof Error ? error.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (isChecking) {
    return (
      <div className="app-bg flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
          <p className="mt-4 text-blue-200">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  if (!isValidSession) {
    return (
      <div className="app-bg flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Reset Link</h1>
            <p className="text-gray-600 mb-6">
              {error || 'This reset link is invalid or has expired. Please request a new password reset.'}
            </p>
            <Link
              href="/reset-password"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Request New Reset Link
            </Link>
            <div className="mt-4">
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-500"
              >
                Back to Login
              </Link>
            </div>
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
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800 mb-2">
                <strong>Important:</strong> You have been signed out. Please:
              </p>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Go to the login page</li>
                <li>• Sign in with your new password</li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Redirecting to login page...</strong>
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-bg flex items-center justify-center min-h-screen">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Set New Password</h1>
          <p className="text-gray-600 mt-2">Enter your new password below</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handlePasswordReset(); }} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-900 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Enter new password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Password requirements:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• At least one uppercase letter (A-Z)</li>
              <li>• At least one lowercase letter (a-z)</li>
              <li>• At least one number (0-9)</li>
              <li>• At least one special character (!@#$%^&*)</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="flex items-center justify-center text-blue-600 hover:text-blue-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="app-bg flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
        <p className="mt-4 text-blue-200">Loading...</p>
      </div>
    </div>
  )
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordConfirmContent />
    </Suspense>
  )
}
