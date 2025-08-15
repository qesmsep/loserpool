import { cookies } from 'next/headers'

export default async function DebugCookiesPage() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  // Filter for Supabase-related cookies
  const supabaseCookies = allCookies.filter(cookie => 
    cookie.name.includes('supabase') || 
    cookie.name.includes('sb-') ||
    cookie.name.includes('auth')
  )
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Cookie Debug</h1>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded">
            <h2 className="font-semibold mb-2">All Cookies ({allCookies.length}):</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(allCookies.map(c => ({ name: c.name, value: c.value?.substring(0, 50) + '...' })), null, 2)}
            </pre>
          </div>
          
          <div className="bg-gray-50 p-4 rounded">
            <h2 className="font-semibold mb-2">Supabase Cookies ({supabaseCookies.length}):</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(supabaseCookies.map(c => ({ name: c.name, value: c.value?.substring(0, 50) + '...' })), null, 2)}
            </pre>
          </div>
          
          <div className="bg-gray-50 p-4 rounded">
            <h2 className="font-semibold mb-2">Cookie Names:</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(allCookies.map(c => c.name), null, 2)}
            </pre>
          </div>
        </div>
        
        <div className="mt-6">
          <a href="/debug-session" className="block text-blue-600 hover:underline">Check Session</a>
          <a href="/test-login" className="block text-blue-600 hover:underline">Test Login</a>
        </div>
      </div>
    </div>
  )
} 