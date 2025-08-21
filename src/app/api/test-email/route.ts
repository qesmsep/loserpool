import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { to, subject = 'Test Email from Loser Pool' } = await request.json()

    if (!to) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 })
    }

    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e40af;">✅ Email Test Successful!</h1>
        <p>This is a test email to verify your SMTP configuration is working properly.</p>
        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3>Configuration Details:</h3>
          <ul>
            <li><strong>Provider:</strong> Resend</li>
            <li><strong>From Email:</strong> noreply@loserpool.app</li>
            <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        </div>
        <p>If you received this email, your SMTP settings are configured correctly!</p>
        <hr style="margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">This is an automated test from The Loser Pool system.</p>
      </div>
    `

    const testText = `
Email Test Successful!

This is a test email to verify your SMTP configuration is working properly.

Configuration Details:
- Provider: Resend
- From Email: noreply@loserpool.app
- Timestamp: ${new Date().toLocaleString()}

If you received this email, your SMTP settings are configured correctly!

This is an automated test from The Loser Pool system.
    `

    const result = await sendEmail({
      to,
      subject,
      html: testHtml,
      text: testText
    })

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      result
    })

  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also allow GET for simple testing
export async function GET() {
  return NextResponse.json({
    message: 'Email test endpoint',
    usage: 'POST with { "to": "your-email@example.com", "subject": "Optional subject" }'
  })
}
