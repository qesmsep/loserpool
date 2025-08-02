import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function DebugSessionPage() {
  const supabase = await createServerSupabaseClient()
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Session Debug</h1>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded">
            <h2 className="font-semibold mb-2">Session Info:</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify({ session: !!session, sessionError }, null, 2)}
            </pre>
          </div>
          
          <div className="bg-gray-50 p-4 rounded">
            <h2 className="font-semibold mb-2">User Info:</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify({ user: !!user, userError }, null, 2)}
            </pre>
          </div>
          
          {session && (
            <div className="bg-gray-50 p-4 rounded">
              <h2 className="font-semibold mb-2">Session Details:</h2>
              <pre className="text-sm overflow-auto">
                {JSON.stringify({
                  access_token: session.access_token ? 'present' : 'missing',
                  refresh_token: session.refresh_token ? 'present' : 'missing',
                  expires_at: session.expires_at,
                  user_id: session.user?.id
                }, null, 2)}
              </pre>
            </div>
          )}
          
          {user && (
            <div className="bg-gray-50 p-4 rounded">
              <h2 className="font-semibold mb-2">User Details:</h2>
              <pre className="text-sm overflow-auto">
                {JSON.stringify({
                  id: user.id,
                  email: user.email,
                  email_confirmed_at: user.email_confirmed_at
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <div className="mt-6 space-y-2">
          <a href="/login" className="block text-blue-600 hover:underline">Go to Login</a>
          <a href="/dashboard" className="block text-blue-600 hover:underline">Go to Dashboard</a>
          <a href="/" className="block text-blue-600 hover:underline">Go to Home</a>
        </div>
      </div>
    </div>
  )
} 