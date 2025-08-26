import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

async function sendEmailDirect(emailData: {
  to: string
  subject: string
  htmlBody: string
}) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  
  const { data, error } = await resend.emails.send({
    from: 'The Loser Pool <onboarding@resend.dev>',
    to: [emailData.to],
    subject: emailData.subject,
    html: emailData.htmlBody,
    text: emailData.htmlBody.replace(/<[^>]*>/g, '')
  })

  if (error) {
    console.error('❌ Direct email error:', error)
    throw error
  }

  console.log('✅ Direct email sent:', data)
  return data
}

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

    // Check if user exists in public.users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()
    
    console.log('🔍 User lookup result:', { userFound: !!userData, error: userError })
    
    if (userError || !userData) {
      // Don't reveal if user exists or not for security
      console.log('🔍 User not found, returning success message')
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with this email exists, a password reset link has been sent.' 
      })
    }

    // Generate a secure reset token
    const resetToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    console.log('🔍 Generated reset token:', resetToken)
    console.log('🔍 Token expires at:', expiresAt.toISOString())

    // Store the reset token in the database
    const { error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .upsert({
        user_id: userData.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (tokenError) {
      console.error('❌ Error storing reset token:', tokenError)
      return NextResponse.json({ error: 'Failed to process reset request' }, { status: 500 })
    }

    console.log('✅ Reset token stored successfully')

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password/confirm?token=${resetToken}`
    
    console.log('🔍 Sending password reset email:', {
      to: email,
      link: resetUrl
    })

    // Send the styled password reset email
    const emailResult = await sendEmailDirect({
      to: email,
      subject: '🔐 Reset Your Password - The Loser Pool',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: bold;">🔐 Reset Your Password</h1>
              <p style="color: #ffffff; margin: 0; font-size: 16px; opacity: 0.9;">We received a request to reset your Loser Pool password</p>
            </div>
            
            <div style="padding: 32px;">
              <!-- Main Message -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #dc2626;">🔑 Password Reset Request</h2>
                <p style="margin: 0 0 16px 0; color: #dc2626; line-height: 1.6;">
                  Hello! We received a request to reset the password for your Loser Pool account. 
                  If you made this request, click the button below to set a new password.
                </p>
                <p style="margin: 0; color: #dc2626; font-weight: 600;">
                  ⏰ This link will expire in 1 hour for your security.
                </p>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #0369a1; margin: 0 0 16px 0;">🛡️ Security Information</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #1e40af;">
                  <li>This link is unique to your account</li>
                  <li>It will expire automatically in 1 hour</li>
                  <li>You can only use this link once</li>
                  <li>If you didn't request this, you can safely ignore this email</li>
                </ul>
              </div>

              <!-- Reset Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                  🔐 Reset My Password
                </a>
              </div>

              <!-- Fallback Link -->
              <div style="text-align: center; margin-bottom: 24px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">If the button doesn't work, copy and paste this link:</p>
                <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; word-break: break-all; margin: 0;">
                  ${resetUrl}
                </p>
              </div>

              <!-- What to do next -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #166534; margin: 0 0 16px 0;">🚀 After Resetting Your Password</h3>
                <ol style="margin: 0; padding-left: 20px; line-height: 1.6; color: #166534;">
                  <li><strong>Set a strong password</strong> (at least 8 characters)</li>
                  <li><strong>Log into your account</strong> with your new password</li>
                  <li><strong>Check your picks</strong> and make sure everything looks good</li>
                  <li><strong>Continue playing</strong> The Loser Pool!</li>
                </ol>
              </div>

              <!-- Didn't request this -->
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #92400e; font-weight: 600;">
                  🤔 Didn't request this? You can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>

              <!-- Footer -->
              <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 24px;">
                <p style="color: #dc2626; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">Back to picking losers!</p>
                <p style="color: #6b7280; margin: 0 0 16px 0;">We'll see you back in the pool soon!</p>
                
                <div style="margin-top: 24px;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br>The Loser Pool Team</p>
                </div>
              </div>

              <!-- Contact Info -->
              <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Questions? Reply to this email or contact us at support@loserpool.com<br>
                  Need help? We're here to assist you!
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    })

    console.log('✅ Password reset email sent successfully:', {
      emailId: emailResult.id,
      to: email
    })

    return NextResponse.json({ 
      success: true, 
      message: 'If an account with this email exists, a password reset link has been sent.',
      emailId: emailResult.id
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
