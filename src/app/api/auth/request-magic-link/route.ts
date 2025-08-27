import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    // Use Supabase's built-in magic link with the correct redirect URL
    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://www.loserpool.app/auth/callback'
      }
    })

    if (error) {
      console.error('Magic link error:', error)
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        success: false, 
        message: 'If an account with this email exists, a magic link has been sent.' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'If an account with this email exists, a magic link has been sent.' 
    })

  } catch (error) {
    console.error('Magic link request error:', error)
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 })
  }
}
