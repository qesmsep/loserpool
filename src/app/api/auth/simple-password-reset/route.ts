import { NextResponse } from 'next/server'
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
    console.log('🔍 Simple password reset request received')
    
    const body = await request.json()
    console.log('🔍 Request body:', body)
    
    const { email } = body
    
    if (!email) {
      console.log('❌ No email provided')
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    console.log('🔍 Processing simple reset for email:', email)

    // Create a simple reset URL (this won't work for actual reset, just for testing)
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password/confirm?token=test-token-123`
    
    console.log('🔍 Sending simple password reset email:', {
      to: email,
      link: resetUrl
    })

    // Send the styled password reset email
    const emailResult = await sendEmailDirect({
      to: email,
      subject: '🔐 Test - Reset Your Password - The Loser Pool',
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
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: bold;">🔐 TEST - Reset Your Password</h1>
              <p style="color: #ffffff; margin: 0; font-size: 16px; opacity: 0.9;">This is a test email for password reset functionality</p>
            </div>
            
            <div style="padding: 32px;">
              <!-- Main Message -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #dc2626;">🧪 Test Email</h2>
                <p style="margin: 0 0 16px 0; color: #dc2626; line-height: 1.6;">
                  This is a test email to verify that the password reset email functionality is working correctly.
                </p>
                <p style="margin: 0; color: #dc2626; font-weight: 600;">
                  ✅ If you received this email, the email sending is working!
                </p>
              </div>

              <!-- Reset Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                  🔐 Test Reset Link
                </a>
              </div>

              <!-- Footer -->
              <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 24px;">
                <p style="color: #dc2626; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">Test Email Working!</p>
                <p style="color: #6b7280; margin: 0 0 16px 0;">This confirms the email system is functioning.</p>
                
                <div style="margin-top: 24px;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br>The Loser Pool Team</p>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    })

    console.log('✅ Simple password reset email sent successfully:', {
      emailId: emailResult.id,
      to: email
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully!',
      emailId: emailResult.id
    })

  } catch (error) {
    console.error('❌ Simple password reset request error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
