'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle, XCircle } from 'lucide-react'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the error and access_token from URL params
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')

        if (error) {
          console.error('Auth callback error:', error, errorDescription)
          setError(errorDescription || 'Authentication failed')
          setStatus('error')
          return
        }

        if (accessToken && refreshToken) {
          // Set the session with the tokens
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (setSessionError) {
            console.error('Error setting session:', setSessionError)
            setError('Failed to complete sign in')
            setStatus('error')
            return
          }

          // Success! Redirect to dashboard
          setStatus('success')
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          // No tokens found, check if we have a session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError || !session) {
            console.error('No valid session found:', sessionError)
            setError('Invalid or expired magic link')
            setStatus('error')
            return
          }

          // We have a valid session, redirect to dashboard
          setStatus('success')
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setError('An unexpected error occurred')
        setStatus('error')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  if (status === 'loading') {
    return (
      <div className="app-bg flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
            <p className="mt-4 text-gray-600">Completing sign in...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="app-bg flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Failed</h1>
            <p className="text-gray-600 mb-6">
              {error || 'There was a problem completing your sign in.'}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-bg flex items-center justify-center min-h-screen">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Successful!</h1>
          <p className="text-gray-600 mb-6">
            You have been successfully signed in. Redirecting to dashboard...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300 mx-auto"></div>
        </div>
      </div>
    </div>
  )
}
