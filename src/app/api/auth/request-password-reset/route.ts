import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { sendPasswordResetEmail } from '@/lib/resend'

export async function POST(request: Request) {
  console.log('🔧 [REQUEST-PASSWORD-RESET] Starting password reset request')
  
  try {
    const { email } = await request.json()
    
    if (!email) {
      console.log('❌ [REQUEST-PASSWORD-RESET] Missing email')
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 })
    }

    console.log('🔧 [REQUEST-PASSWORD-RESET] Creating Supabase admin client...')
    const supabaseAdmin = createServiceRoleClient()
    
    // Generate the reset link using Supabase
    console.log('🔧 [REQUEST-PASSWORD-RESET] Generating reset link...')
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password/confirm`
      }
    })
    
    if (error) {
      console.error('❌ [REQUEST-PASSWORD-RESET] Failed to generate reset link:', error)
      
      // Don't reveal if user exists or not for security
      console.log('✅ [REQUEST-PASSWORD-RESET] Returning generic success message for security')
      return NextResponse.json({ 
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      })
    }
    
    console.log('✅ [REQUEST-PASSWORD-RESET] Reset link generated successfully')
    
    // Send email using Resend
    const resetUrl = data.properties.action_link
    console.log('🔗 [REQUEST-PASSWORD-RESET] Reset URL generated (first 50 chars):', resetUrl.substring(0, 50) + '...')
    
    console.log('📧 [REQUEST-PASSWORD-RESET] Sending email via Resend...')
    const emailResult = await sendPasswordResetEmail({
      email,
      resetUrl
    })

    if (!emailResult.success) {
      console.error('❌ [REQUEST-PASSWORD-RESET] Failed to send email:', emailResult.error)
      // Still return success to user for security
      return NextResponse.json({ 
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      })
    }

    console.log('✅ [REQUEST-PASSWORD-RESET] Email sent successfully via Resend')
    console.log('✅ [REQUEST-PASSWORD-RESET] Reset link sent to:', email)
    
    return NextResponse.json({ 
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    })

  } catch (error) {
    console.error('❌ [REQUEST-PASSWORD-RESET] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
