import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')
    
    if (!token || !email) {
      return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=invalid-link')
    }

    const supabase = await createServerSupabaseClient()
    
    // Verify the email confirmation
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

  } catch (error) {
    console.error('Email confirmation error:', error)
    return NextResponse.redirect('https://loserpool.vercel.app/confirm-email?error=server-error')
  }
}
