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
      try {
        setIsChecking(true)
        
        // Wait a moment for Supabase to process the reset link
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if we have a valid session from the reset link
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('🔍 Session check result:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          userEmail: session?.user?.email 
        })
        
        if (error) {
          console.error('Session check error:', error)
          setError('Invalid or expired reset link. Please request a new password reset.')
          setIsChecking(false)
          return
        }

        if (session?.user) {
          console.log('✅ Valid session found:', session.user.email)
          setIsValidSession(true)
          setIsChecking(false)
          return
        }

        // If no session, check for recovery tokens in URL
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        const type = searchParams.get('type')
        
        // Also check URL fragment for tokens (Supabase puts them there)
        let fragmentTokens: Record<string, string> = {}
        if (typeof window !== 'undefined') {
          const fragment = window.location.hash.substring(1) // Remove the #
          if (fragment) {
            fragmentTokens = Object.fromEntries(
              fragment.split('&').map(pair => {
                const [key, value] = pair.split('=')
                return [key, decodeURIComponent(value)]
              })
            )
          }
        }
        
        // Log all search params to see what we're actually getting
        const allParams: Record<string, string | null> = {}
        searchParams.forEach((value, key) => {
          allParams[key] = value ? '***HIDDEN***' : null
        })
        console.log('🔍 All URL params:', allParams)
        console.log('🔍 Fragment tokens:', Object.keys(fragmentTokens))
        console.log('🔍 URL params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type })
        
        // Use tokens from fragment if available, otherwise from search params
        const finalAccessToken = fragmentTokens.access_token || accessToken
        const finalRefreshToken = fragmentTokens.refresh_token || refreshToken
        const finalType = fragmentTokens.type || type
        
        if (finalAccessToken && finalRefreshToken && finalType === 'recovery') {
          console.log('🔄 Setting session from recovery tokens...')
          
          // Set the session manually from recovery tokens
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: finalAccessToken,
            refresh_token: finalRefreshToken
          })
          
          if (setSessionError) {
            console.error('❌ Error setting session:', setSessionError)
            setError('Invalid reset link. Please request a new password reset.')
            setIsChecking(false)
            return
          }
          
          if (sessionData.session?.user) {
            console.log('✅ Session set successfully:', sessionData.session.user.email)
            setIsValidSession(true)
            setIsChecking(false)
            return
          }
        }
        
        // If we get here, no valid session or tokens
        console.log('❌ No valid session or recovery tokens found')
        console.log('🔍 Current URL:', window.location.href)
        setError('Invalid or expired reset link. Please request a new password reset.')
        setIsChecking(false)
        
      } catch (error) {
        console.error('Error checking session:', error)
        setError('An error occurred. Please try again.')
        setIsChecking(false)
      }
    }

    checkSession()
  }, [router, searchParams])

  const handlePasswordReset = async () => {
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    // Additional password validation
    const hasUpperCase = /[A-Z]/.test(newPassword)
    const hasLowerCase = /[a-z]/.test(newPassword)
    const hasNumbers = /\d/.test(newPassword)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('🔄 Starting SIMPLE password update...')
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        throw new Error('No valid session found')
      }
      
      console.log('✅ User session confirmed:', session.user.email)
      
      // Use the SIMPLE direct approach - just call the admin API directly
      console.log('🔄 Using direct admin API approach...')
      const response = await fetch('/api/auth/simple-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: session.user.email,
          password: newPassword
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log('✅ Password reset successful!')
        setSuccess(true)
        
        // Sign out to clear any existing session
        await supabase.auth.signOut()
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        console.error('❌ Password reset failed:', result)
        throw new Error(result.error || 'Password reset failed')
      }
      
    } catch (error) {
      console.error('❌ Error resetting password:', error)
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
