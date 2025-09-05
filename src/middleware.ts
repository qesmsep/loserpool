import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  const url = new URL(request.url)
  const isAdminApiRoute = url.pathname.startsWith('/api/admin/')
  
  // Only handle admin API routes in middleware
  if (!isAdminApiRoute) {
    return response
  }

  // Temporarily bypass auth for current-week-default-pick route for debugging
  if (url.pathname === '/api/admin/current-week-default-pick') {
    console.log('🔍 Middleware: Bypassing auth for current-week-default-pick route')
    return response
  }

  // Check if request has bearer token - if so, let the API route handle authentication
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('🔍 Middleware: Request has bearer token, letting API route handle authentication')
    return response
  }

  console.log('🔍 Middleware: No bearer token, checking session cookies')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Check for valid session
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    console.log('🔍 Middleware admin API session check:', {
      pathname: request.nextUrl.pathname,
      hasSession: !!session,
      sessionError: error?.message,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })
    
    if (error) {
      console.error('Middleware session error:', error.message)
    }
    
    // If no session, return 401 for admin API routes
    if (!session) {
      console.log('No session found for admin API route, returning 401')
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    
    // If session exists but is expired, try to refresh it
    if (session && session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000)
      const now = new Date()
      
      if (expiresAt <= now) {
        console.log('Session expired, attempting refresh')
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError) {
          console.error('Session refresh error:', refreshError.message)
          return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
        } else if (refreshedSession) {
          console.log('Session refreshed successfully')
        } else {
          console.log('No refreshed session available')
          return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
        }
      }
    }
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return response
}

export const config = {
  matcher: ['/api/admin/:path*']
} 