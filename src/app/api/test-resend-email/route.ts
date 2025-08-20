import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { to = 'tim@828.life' } = await request.json()

    console.log('🧪 Testing Resend email sending...')
    console.log('📧 To:', to)
    console.log('🔧 Provider:', process.env.EMAIL_PROVIDER || 'console')
    console.log('🔑 Has Resend Key:', !!process.env.RESEND_API_KEY)

    const testEmailData = {
      to,
      subject: '🧪 Test Email from Loser Pool - Resend',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1e40af;">🧪 Test Email</h1>
          <p>This is a test email sent via Resend from The Loser Pool.</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Provider:</strong> ${process.env.EMAIL_PROVIDER || 'console'}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <hr>
          <p style="color: #6b7280; font-size: 14px;">
            If you received this email, Resend is working correctly!
          </p>
        </div>
      `,
      text: `Test Email from Loser Pool\n\nThis is a test email sent via Resend.\nTimestamp: ${new Date().toLocaleString()}\nProvider: ${process.env.EMAIL_PROVIDER || 'console'}\nEnvironment: ${process.env.NODE_ENV || 'development'}\n\nIf you received this email, Resend is working correctly!`
    }

    const result = await sendEmail(testEmailData)

    console.log('📧 Email send result:', result)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      provider: result.provider,
      emailId: result.emailId,
      error: result.error,
      config: {
        provider: process.env.EMAIL_PROVIDER || 'console',
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasEmailApiKey: !!process.env.EMAIL_API_KEY
      }
    })

  } catch (error) {
    console.error('❌ Error testing Resend email:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing
export async function GET() {
  try {
    return NextResponse.json({
      message: 'Resend email test endpoint',
      usage: 'POST with { "to": "email@example.com" } to send test email',
      config: {
        provider: process.env.EMAIL_PROVIDER || 'console',
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasEmailApiKey: !!process.env.EMAIL_API_KEY
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
