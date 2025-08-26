import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    console.log('🔍 Password reset request received')
    
    const body = await request.json()
    console.log('🔍 Request body:', body)
    
    const { email } = body
    
    if (!email) {
      console.log('❌ No email provided')
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    console.log('🔍 Processing reset for email:', email)

    const supabaseAdmin = createServiceRoleClient()

    // Use Supabase's built-in password reset functionality
    console.log('🔍 Using Supabase built-in password reset for:', email)
    
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://loserpool.vercel.app'}/reset-password/confirm`
    })

    if (resetError) {
      console.error('❌ Supabase password reset error:', resetError)
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with this email exists, a password reset link has been sent.' 
      })
    }

    console.log('✅ Supabase password reset email sent successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'If an account with this email exists, a password reset link has been sent.',
      note: 'Check your email for the reset link from Supabase Auth'
    })

  } catch (error) {
    console.error('❌ Password reset request error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }
}
