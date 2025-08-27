import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    // Use Supabase's built-in password reset - it handles everything
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://loserpool.vercel.app'}/reset-password/confirm`
    })

    if (error) {
      console.error('Password reset error:', error)
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with this email exists, a password reset link has been sent.' 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'If an account with this email exists, a password reset link has been sent.' 
    })

  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }
}
