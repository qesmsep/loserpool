import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')
    const type = searchParams.get('type')
    
    console.log('Email confirmation request:', { 
      token: !!token, 
      email, 
      type,
      url: request.url 
    })
    
    if (!email) {
      console.error('No email provided in confirmation request')
      return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=invalid-link')
    }

    const supabase = await createServerSupabaseClient()
    
    // Handle different types of confirmation
    if (type === 'signup' && token) {
      try {
        // For signup confirmations, use the token to verify
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        })

        if (error) {
          console.error('Signup confirmation error:', error)
          return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=verification-failed')
        }

        console.log('Signup confirmed successfully for:', email)
        return NextResponse.redirect('https://loserpool.vercel.app/dashboard?confirmed=true')
      } catch (verifyError) {
        console.error('Token verification error:', verifyError)
        return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=verification-failed')
      }
    } else if (type === 'email' && token) {
      try {
        // For email confirmations, use the token to verify
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email'
        })

        if (error) {
          console.error('Email confirmation error:', error)
          return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=verification-failed')
        }

        console.log('Email confirmed successfully for:', email)
        return NextResponse.redirect('https://loserpool.vercel.app/dashboard?confirmed=true')
      } catch (verifyError) {
        console.error('Token verification error:', verifyError)
        return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=verification-failed')
      }
    } else if (token) {
      // Generic token verification
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email'
        })

        if (error) {
          console.error('Generic confirmation error:', error)
          return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=verification-failed')
        }

        console.log('Generic confirmation successful for:', email)
        return NextResponse.redirect('https://loserpool.vercel.app/dashboard?confirmed=true')
      } catch (verifyError) {
        console.error('Generic token verification error:', verifyError)
        return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=verification-failed')
      }
    }

    // If we get here, no valid token was provided
    console.error('No valid token provided for email confirmation')
    return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=invalid-link')

  } catch (error) {
    console.error('Email confirmation error:', error)
    return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=server-error')
  }
}
