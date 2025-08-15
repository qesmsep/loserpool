import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')
    
    console.log('Email confirmation request:', { token: !!token, email })
    
    if (!email) {
      return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=invalid-link')
    }

    const supabase = await createServerSupabaseClient()
    
    if (token) {
      // Try to verify the email confirmation with token
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email'
        })

        if (error) {
          console.error('Email confirmation error:', error)
          return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=verification-failed')
        }

        // Success! Redirect to dashboard
        return NextResponse.redirect('https://loserpool.vercel.app/dashboard?confirmed=true')
      } catch (verifyError) {
        console.error('Token verification error:', verifyError)
        // Fall through to manual confirmation
      }
    }

    // If no token or token verification failed, try manual confirmation
    try {
      // Get the user by email
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
      
      if (userError) {
        console.error('Error listing users:', userError)
        return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=user-not-found')
      }

      const user = users?.find(u => u.email === email)
      
      if (!user) {
        return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=user-not-found')
      }

      if (user.email_confirmed_at) {
        // User already confirmed
        return NextResponse.redirect('https://loserpool.vercel.app/dashboard?already-confirmed=true')
      }

      // Manually confirm the user
      const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true
      })

      if (confirmError) {
        console.error('Manual confirmation error:', confirmError)
        return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=confirmation-failed')
      }

      // Success! Redirect to dashboard
      return NextResponse.redirect('https://loserpool.vercel.app/dashboard?confirmed=true')

    } catch (manualError) {
      console.error('Manual confirmation error:', manualError)
      return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=server-error')
    }

  } catch (error) {
    console.error('Email confirmation error:', error)
    return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=server-error')
  }
}
