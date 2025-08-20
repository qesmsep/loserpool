import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'

export default async function DebugAuthPage() {
  const supabase = await createServerSupabaseClient()
  
  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  // Get user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  // Get current user via our function
  const currentUser = await getCurrentUser()

  // Check environment variables
  const envVars = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
    appUrl: process.env.NEXT_PUBLIC_APP_URL ? 'SET' : 'NOT SET',
  }

  // Check URL configuration
  const currentUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://loserpool.vercel.app'
  const redirectUrl = `${currentUrl}/api/auth/confirm-email`

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(envVars, null, 2)}
            </pre>
            {envVars.supabaseUrl === 'SET' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> If you're still getting 400/500 errors, check your Supabase project settings:
                </p>
                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                  <li>Go to your Supabase dashboard</li>
                  <li>Navigate to Authentication → Settings</li>
                  <li>Check "Site URL" and "Redirect URLs"</li>
                  <li>Add <code className="bg-yellow-100 px-1 rounded">{redirectUrl}</code> to redirect URLs</li>
                  <li>Ensure your project is not paused</li>
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">URL Configuration</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({
                currentUrl,
                redirectUrl,
                expectedRedirectUrl: 'https://loserpool.vercel.app/api/auth/confirm-email'
              }, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Session Status</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({
                hasSession: !!session,
                sessionError: sessionError?.message,
                session: session ? {
                  access_token: session.access_token ? 'EXISTS' : 'MISSING',
                  refresh_token: session.refresh_token ? 'EXISTS' : 'MISSING',
                  expires_at: session.expires_at,
                  expires_in: session.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) : null,
                  user_id: session.user?.id,
                } : null
              }, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">User Status</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({
                hasUser: !!user,
                userError: userError?.message,
                user: user ? {
                  id: user.id,
                  email: user.email,
                  email_confirmed_at: user.email_confirmed_at,
                  created_at: user.created_at,
                } : null
              }, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Current User Function</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({
                hasCurrentUser: !!currentUser,
                currentUser: currentUser ? {
                  id: currentUser.id,
                  email: currentUser.email,
                } : null
              }, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Troubleshooting Steps</h2>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="font-semibold text-red-800 mb-2">400 Error on /auth/v1/token</h3>
                <p className="text-sm text-red-700 mb-2">This usually means:</p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  <li>Invalid credentials (wrong email/password)</li>
                  <li>User doesn't exist</li>
                  <li>Account is disabled or deleted</li>
                  <li>Supabase project is paused</li>
                </ul>
              </div>
              
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="font-semibold text-red-800 mb-2">500 Error on /auth/v1/signup</h3>
                <p className="text-sm text-red-700 mb-2">This usually means:</p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  <li>Invalid redirect URL in Supabase settings</li>
                  <li>Email service not configured</li>
                  <li>Database connection issues</li>
                  <li>Supabase project limits exceeded</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-2">
              <Link href="/test-auth" className="block text-blue-600 hover:text-blue-500">
                Run Authentication Tests
              </Link>
              <Link href="/dashboard" className="block text-blue-600 hover:text-blue-500">
                Try Dashboard
              </Link>
              <Link href="/login" className="block text-blue-600 hover:text-blue-500">
                Go to Login
              </Link>
              <Link href="/signup" className="block text-blue-600 hover:text-blue-500">
                Go to Signup
              </Link>
              <Link href="/" className="block text-blue-600 hover:text-blue-500">
                Go to Home
              </Link>
              <Link href="/debug-session" className="block text-blue-600 hover:text-blue-500">
                Debug Session
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 