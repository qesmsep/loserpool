import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { sendPasswordResetEmail } from '@/lib/resend'

export async function POST(request: Request) {
  console.log('🔧 [PASSWORD-RESET] Starting password reset request')
  
  try {
    const { email } = await request.json()
    console.log('📧 [PASSWORD-RESET] Email received:', email ? `${email.substring(0, 3)}***@${email.split('@')[1]}` : 'null')
    
    if (!email) {
      console.log('❌ [PASSWORD-RESET] No email provided')
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log('❌ [PASSWORD-RESET] Invalid email format:', email)
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    console.log('✅ [PASSWORD-RESET] Email validation passed')
    const supabaseAdmin = createServiceRoleClient()
    console.log('🔗 [PASSWORD-RESET] Supabase admin client created')

    // Use Supabase's built-in password reset with custom email handling
    console.log('🔗 [PASSWORD-RESET] Generating reset link for:', email)
    console.log('🔗 [PASSWORD-RESET] Redirect URL:', `${process.env.NEXT_PUBLIC_SITE_URL || 'https://loserpool.app'}/reset-password/confirm`)
    
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://loserpool.app'}/reset-password/confirm`
      }
    })

    if (resetError) {
      console.error('❌ [PASSWORD-RESET] Password reset generation error:', resetError)
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with this email exists, a password reset link has been sent.' 
      })
    }

    console.log('✅ [PASSWORD-RESET] Reset link generated successfully')
    // Send email using Resend
    const resetUrl = resetData.properties.action_link
    console.log('🔗 [PASSWORD-RESET] Reset URL generated (first 50 chars):', resetUrl.substring(0, 50) + '...')
    
    console.log('📧 [PASSWORD-RESET] Sending email via Resend...')
    const emailResult = await sendPasswordResetEmail({
      email,
      resetUrl
    })

    if (!emailResult.success) {
      console.error('❌ [PASSWORD-RESET] Failed to send email:', emailResult.error)
      // Still return success to user for security
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with this email exists, a password reset link has been sent.' 
      })
    }

    console.log('✅ [PASSWORD-RESET] Email sent successfully via Resend')
    console.log('✅ [PASSWORD-RESET] Password reset request completed successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'If an account with this email exists, a password reset link has been sent.' 
    })

  } catch (error) {
    console.error('❌ [PASSWORD-RESET] Password reset request error:', error)
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }
}
