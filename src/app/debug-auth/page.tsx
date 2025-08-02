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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>
        
        <div className="space-y-6">
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
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-2">
              <Link href="/dashboard" className="block text-blue-600 hover:text-blue-500">
                Try Dashboard
              </Link>
              <Link href="/login" className="block text-blue-600 hover:text-blue-500">
                Go to Login
              </Link>
              <Link href="/" className="block text-blue-600 hover:text-blue-500">
                Go to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 