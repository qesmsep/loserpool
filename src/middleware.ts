import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  const url = new URL(request.url)
  const isApi = url.pathname.startsWith('/api/')
  const isProtectedRoute = url.pathname.startsWith('/admin/') || url.pathname.startsWith('/api/admin/')

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

  // Refresh session if expired - required for Server Components
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    console.log('🔍 Middleware session check:', {
      pathname: request.nextUrl.pathname,
      hasSession: !!session,
      sessionError: error?.message,
      sessionExpiresAt: session?.expires_at,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      isApi,
      isProtectedRoute
    })
    
    if (error) {
      console.error('Middleware session error:', error.message)
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
        } else if (refreshedSession) {
          console.log('Session refreshed successfully')
        }
      }
    }

    // Check if we need to handle authentication for protected routes
    if (isProtectedRoute) {
      if (!session) {
        if (isApi) {
          // For API routes, return 401 JSON instead of redirecting
          console.log('API route without session, returning 401')
          return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
        } else {
          // For page routes, redirect to login
          console.log('Protected page without session, redirecting to login')
          return NextResponse.redirect(new URL('/login', url))
        }
      }
    }
  } catch (error) {
    console.error('Middleware error:', error)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 